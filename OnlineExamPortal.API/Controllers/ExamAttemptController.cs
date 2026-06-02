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
                Console.WriteLine($"SubmitAnswer: AttemptId={request.AttemptId}, QuestionId={request.QuestionId}, Option={request.SelectedOption}");

                using SqlConnection conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                // Verify attempt exists
                string checkAttemptSql = "SELECT Status FROM ExamAttempts WHERE Id = @AttemptId";
                SqlCommand checkAttemptCmd = new SqlCommand(checkAttemptSql, conn);
                checkAttemptCmd.Parameters.AddWithValue("@AttemptId", request.AttemptId);
                var status = await checkAttemptCmd.ExecuteScalarAsync();

                if (status == null || status.ToString() != "InProgress")
                {
                    return BadRequest(new { message = "Exam attempt not found or already submitted" });
                }

                // Get correct answer
                string getCorrectSql = "SELECT CorrectAnswer FROM Questions WHERE Id = @QuestionId";
                SqlCommand getCmd = new SqlCommand(getCorrectSql, conn);
                getCmd.Parameters.AddWithValue("@QuestionId", request.QuestionId);
                var correctAnswerObj = await getCmd.ExecuteScalarAsync();

                if (correctAnswerObj == null)
                {
                    return BadRequest(new { message = $"Question ID {request.QuestionId} not found" });
                }

                string correctAnswer = correctAnswerObj.ToString();
                bool isCorrect = request.SelectedOption == correctAnswer;

                // Insert or update answer
                string upsertSql = @"
                    IF EXISTS (SELECT 1 FROM Answers WHERE ExamAttemptId = @AttemptId AND QuestionId = @QuestionId)
                        UPDATE Answers SET SelectedOption = @SelectedOption, IsCorrect = @IsCorrect
                        WHERE ExamAttemptId = @AttemptId AND QuestionId = @QuestionId
                    ELSE
                        INSERT INTO Answers (ExamAttemptId, QuestionId, SelectedOption, IsCorrect)
                        VALUES (@AttemptId, @QuestionId, @SelectedOption, @IsCorrect)
                ";

                SqlCommand upsertCmd = new SqlCommand(upsertSql, conn);
                upsertCmd.Parameters.AddWithValue("@AttemptId", request.AttemptId);
                upsertCmd.Parameters.AddWithValue("@QuestionId", request.QuestionId);
                upsertCmd.Parameters.AddWithValue("@SelectedOption", request.SelectedOption);
                upsertCmd.Parameters.AddWithValue("@IsCorrect", isCorrect);

                await upsertCmd.ExecuteNonQueryAsync();

                return Ok(new
                {
                    success = true,
                    message = "Answer submitted successfully",
                    isCorrect = isCorrect,
                    correctAnswer = correctAnswer
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"SubmitAnswer Error: {ex.Message}");
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
                        
                        SELECT @TotalScore AS Score, @TotalMarks AS TotalMarks, @Percentage AS Percentage, @IsPassed AS IsPassed;
                    ";

                    SqlCommand cmd = new SqlCommand(sql, conn);
                    cmd.Parameters.AddWithValue("@AttemptId", attemptId);

                    using var reader = await cmd.ExecuteReaderAsync();
                    int score = 0;
                    int totalMarks = 0;
                    decimal percentage = 0;
                    bool isPassed = false;

                    if (await reader.ReadAsync())
                    {
                        score = reader["Score"] != DBNull.Value ? Convert.ToInt32(reader["Score"]) : 0;
                        totalMarks = reader["TotalMarks"] != DBNull.Value ? Convert.ToInt32(reader["TotalMarks"]) : 0;
                        percentage = reader["Percentage"] != DBNull.Value ? Convert.ToDecimal(reader["Percentage"]) : 0;
                        isPassed = reader["IsPassed"] != DBNull.Value ? Convert.ToBoolean(reader["IsPassed"]) : false;
                    }

                    return Ok(new
                    {
                        message = "Exam submitted successfully",
                        score = score,
                        totalMarks = totalMarks,
                        percentage = percentage,
                        isPassed = isPassed
                    });
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

        // GET: api/ExamAttempt/all
        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllAttempts()
        {
            try
            {
                using SqlConnection conn = new SqlConnection(_connectionString);
                string sql = @"
                    SELECT 
                        ea.Id, 
                        ea.UserId, 
                        ea.ExamId, 
                        ea.Score, 
                        ea.Status, 
                        ea.IsPassed, 
                        ea.Percentage, 
                        ea.StartedAt, 
                        ea.SubmittedAt,
                        e.Title AS ExamTitle, 
                        e.TotalMarks,
                        u.FullName AS StudentName,
                        u.Email AS StudentEmail
                    FROM ExamAttempts ea
                    JOIN Exams e ON ea.ExamId = e.Id
                    JOIN Users u ON ea.UserId = u.Id
                    WHERE ea.Status = 'Completed'
                    ORDER BY ea.SubmittedAt DESC
                ";

                using SqlCommand cmd = new SqlCommand(sql, conn);
                await conn.OpenAsync();

                var attempts = new List<object>();
                using SqlDataReader reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    attempts.Add(new
                    {
                        id = reader["Id"],
                        userId = reader["UserId"],
                        examId = reader["ExamId"],
                        examTitle = reader["ExamTitle"],
                        studentName = reader["StudentName"],
                        studentEmail = reader["StudentEmail"],
                        score = reader["Score"] != DBNull.Value ? Convert.ToInt32(reader["Score"]) : 0,
                        totalMarks = reader["TotalMarks"] != DBNull.Value ? Convert.ToInt32(reader["TotalMarks"]) : 0,
                        percentage = reader["Percentage"] != DBNull.Value ? Convert.ToDecimal(reader["Percentage"]) : 0,
                        isPassed = reader["IsPassed"] != DBNull.Value ? Convert.ToBoolean(reader["IsPassed"]) : false,
                        status = reader["Status"]?.ToString(),
                        startedAt = reader["StartedAt"] != DBNull.Value ? Convert.ToDateTime(reader["StartedAt"]) : DateTime.MinValue,
                        submittedAt = reader["SubmittedAt"] != DBNull.Value ? Convert.ToDateTime(reader["SubmittedAt"]) : DateTime.MinValue
                    });
                }

                Console.WriteLine($"GetAllAttempts: Found {attempts.Count} attempts");
                return Ok(attempts);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetAllAttempts Error: {ex.Message}");
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}