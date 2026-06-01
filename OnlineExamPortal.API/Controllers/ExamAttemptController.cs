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

        [HttpPost("submit-answer")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> SubmitAnswer([FromBody] SubmitAnswerRequestDto request)
        {
            try
            {
                using SqlConnection conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                // Get correct answer and marks from Questions table
                string getQuestionSql = "SELECT CorrectAnswer, Marks FROM Questions WHERE Id = @QuestionId";
                SqlCommand getCmd = new SqlCommand(getQuestionSql, conn);
                getCmd.Parameters.AddWithValue("@QuestionId", request.QuestionId);

                string correctAnswer = "";
                int marks = 0;

                using (SqlDataReader reader = await getCmd.ExecuteReaderAsync())
                {
                    if (await reader.ReadAsync())
                    {
                        correctAnswer = reader["CorrectAnswer"].ToString();
                        marks = Convert.ToInt32(reader["Marks"]);
                    }
                    reader.Close();
                }

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
                    message = "Answer submitted successfully",
                    isCorrect = isCorrect,
                    correctAnswer = correctAnswer
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPost("submit/{attemptId}")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> SubmitExam(int attemptId)
        {
            try
            {
                using SqlConnection conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                // Calculate total score from answers
                string calcSql = @"
            DECLARE @TotalScore INT;
            DECLARE @TotalMarks INT;
            DECLARE @Percentage DECIMAL(5,2);
            DECLARE @IsPassed BIT;
            
            -- Calculate total score from correct answers
            SELECT @TotalScore = ISNULL(SUM(q.Marks), 0)
            FROM Answers a
            INNER JOIN Questions q ON a.QuestionId = q.Id
            WHERE a.ExamAttemptId = @AttemptId AND a.IsCorrect = 1;
            
            -- Get total marks for the exam
            SELECT @TotalMarks = ISNULL(SUM(Marks), 0)
            FROM Questions
            WHERE ExamId = (SELECT ExamId FROM ExamAttempts WHERE Id = @AttemptId);
            
            -- Calculate percentage
            IF @TotalMarks > 0
                SET @Percentage = CAST((@TotalScore * 100.0) / @TotalMarks AS DECIMAL(5,2));
            ELSE
                SET @Percentage = 0;
            
            -- Determine if passed (40% passing marks)
            SET @IsPassed = CASE WHEN @Percentage >= 40 THEN 1 ELSE 0 END;
            
            -- Update exam attempt
            UPDATE ExamAttempts 
            SET SubmittedAt = GETDATE(),
                Score = @TotalScore,
                Status = 'Completed',
                IsPassed = @IsPassed,
                Percentage = @Percentage
            WHERE Id = @AttemptId;
            
            SELECT @TotalScore AS Score, @TotalMarks AS TotalMarks, @Percentage AS Percentage, @IsPassed AS IsPassed;
        ";

                SqlCommand cmd = new SqlCommand(calcSql, conn);
                cmd.Parameters.AddWithValue("@AttemptId", attemptId);

                SqlDataReader reader = await cmd.ExecuteReaderAsync();

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
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllAttempts()
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = @"
        SELECT 
            ea.Id, ea.UserId, ea.ExamId, ea.Score, ea.Status, 
            ea.IsPassed, ea.Percentage, ea.StartedAt, ea.SubmittedAt,
            e.Title AS ExamTitle, e.TotalMarks
        FROM ExamAttempts ea
        JOIN Exams e ON ea.ExamId = e.Id
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
                    score = reader["Score"],
                    totalMarks = reader["TotalMarks"],
                    percentage = reader["Percentage"],
                    isPassed = reader["IsPassed"],
                    status = reader["Status"],
                    startedAt = reader["StartedAt"],
                    submittedAt = reader["SubmittedAt"]
                });
            }

            return Ok(attempts);
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