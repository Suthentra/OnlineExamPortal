using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Models.DTOs.ExamAttempt;
using OnlineExamPortal.API.Repositories.Interface;
using System.Security.Claims;

namespace OnlineExamPortal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExamAttemptController : ControllerBase
    {
        private readonly IExamAttemptRepository _examAttemptRepository;
        private readonly IExamRepository _examRepository;
        private readonly IQuestionRepository _questionRepository;
        private readonly string _connectionString;

        public ExamAttemptController(
            IExamAttemptRepository examAttemptRepository,
            IExamRepository examRepository,
            IQuestionRepository questionRepository,
            IConfiguration configuration)
        {
            _examAttemptRepository = examAttemptRepository;
            _examRepository = examRepository;
            _questionRepository = questionRepository;
            _connectionString = configuration.GetConnectionString("OnlineExamPortalConnectionString");

            // Debug - check if connection string is loaded
            Console.WriteLine($"Connection String loaded: {_connectionString != null}");
        }

        // POST: api/ExamAttempt/start
        [HttpPost("start")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> StartExam([FromBody] StartExamRequestDto request)
        {
            var studentId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (studentId != request.StudentId)
                return Forbid();

            var exam = await _examRepository.GetByIdAsync(request.ExamId);
            if (exam == null)
                return NotFound(new { message = "Exam not found" });

            if (!exam.IsPublished)
                return BadRequest(new { message = "Exam is not published yet" });

            var hasAttempted = await _examAttemptRepository.HasStudentAttemptedExamAsync(studentId, request.ExamId);
            if (hasAttempted)
                return BadRequest(new { message = "You have already attempted this exam" });

            var attempt = await _examAttemptRepository.StartExamAsync(studentId, request.ExamId);
            var questions = await _questionRepository.GetByExamIdAsync(request.ExamId);

            var response = new ExamAttemptResponseDto
            {
                Id = attempt.Id,
                ExamId = attempt.ExamId,
                ExamTitle = exam.Title,
                StartedAt = attempt.StartedAt,
                Status = attempt.Status,
                RemainingMinutes = exam.DurationInMinutes,
                Questions = questions.Select(q => new QuestionWithAnswerDto
                {
                    QuestionId = q.Id,
                    QuestionText = q.QuestionText,
                    OptionA = q.OptionA,
                    OptionB = q.OptionB,
                    OptionC = q.OptionC,
                    OptionD = q.OptionD,
                    Marks = q.Marks,
                    SelectedOption = null
                }).ToList()
            };

            return Ok(response);
        }

        // POST: api/ExamAttempt/submit-answer
        [HttpPost("submit-answer")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> SubmitAnswer([FromBody] SubmitAnswerRequestDto request)
        {
            try
            {
                using (SqlConnection conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();

                    // Get correct answer
                    string getCorrectSql = "SELECT CorrectAnswer FROM Questions WHERE Id = @QuestionId";
                    SqlCommand getCmd = new SqlCommand(getCorrectSql, conn);
                    getCmd.Parameters.AddWithValue("@QuestionId", request.QuestionId);
                    string correctAnswer = (await getCmd.ExecuteScalarAsync())?.ToString() ?? "";

                    bool isCorrect = request.SelectedOption == correctAnswer;

                    // Insert answer
                    string insertSql = @"
                        IF EXISTS (SELECT 1 FROM Answers WHERE ExamAttemptId = @AttemptId AND QuestionId = @QuestionId)
                            UPDATE Answers SET SelectedOption = @SelectedOption, IsCorrect = @IsCorrect
                            WHERE ExamAttemptId = @AttemptId AND QuestionId = @QuestionId
                        ELSE
                            INSERT INTO Answers (ExamAttemptId, QuestionId, SelectedOption, IsCorrect)
                            VALUES (@AttemptId, @QuestionId, @SelectedOption, @IsCorrect)
                    ";

                    SqlCommand insertCmd = new SqlCommand(insertSql, conn);
                    insertCmd.Parameters.AddWithValue("@AttemptId", request.AttemptId);
                    insertCmd.Parameters.AddWithValue("@QuestionId", request.QuestionId);
                    insertCmd.Parameters.AddWithValue("@SelectedOption", request.SelectedOption);
                    insertCmd.Parameters.AddWithValue("@IsCorrect", isCorrect);

                    await insertCmd.ExecuteNonQueryAsync();

                    return Ok(new { message = "Answer saved", isCorrect = isCorrect });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/ExamAttempt/submit/{attemptId}
        [HttpPost("submit/{attemptId}")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> SubmitExam(int attemptId)
        {
            try
            {
                using (SqlConnection conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();

                    // Calculate score and update
                    string sql = @"
                        DECLARE @TotalScore INT = ISNULL((SELECT SUM(q.Marks) 
                            FROM Answers a JOIN Questions q ON a.QuestionId = q.Id 
                            WHERE a.ExamAttemptId = @AttemptId AND a.IsCorrect = 1), 0);
                        
                        DECLARE @TotalMarks INT = ISNULL((SELECT SUM(Marks) 
                            FROM Questions 
                            WHERE ExamId = (SELECT ExamId FROM ExamAttempts WHERE Id = @AttemptId)), 0);
                        
                        DECLARE @Percentage DECIMAL(5,2) = CASE 
                            WHEN @TotalMarks > 0 THEN (@TotalScore * 100.0) / @TotalMarks 
                            ELSE 0 END;
                        
                        DECLARE @IsPassed BIT = CASE WHEN @Percentage >= 40 THEN 1 ELSE 0 END;
                        
                        UPDATE ExamAttempts 
                        SET SubmittedAt = GETDATE(),
                            Status = 'Completed',
                            Score = @TotalScore,
                            Percentage = @Percentage,
                            IsPassed = @IsPassed
                        WHERE Id = @AttemptId;
                    ";

                    SqlCommand cmd = new SqlCommand(sql, conn);
                    cmd.Parameters.AddWithValue("@AttemptId", attemptId);
                    await cmd.ExecuteNonQueryAsync();

                    return Ok(new { message = "Exam submitted successfully" });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/ExamAttempt/check/{studentId}/{examId}
        [HttpGet("check/{studentId}/{examId}")]
        [Authorize]
        public async Task<IActionResult> CheckExamAttempted(int studentId, int examId)
        {
            var hasAttempted = await _examAttemptRepository.HasStudentAttemptedExamAsync(studentId, examId);
            return Ok(new { attempted = hasAttempted });
        }
    }
}