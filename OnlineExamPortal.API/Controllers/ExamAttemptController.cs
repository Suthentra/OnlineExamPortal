using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Exceptions;
using OnlineExamPortal.API.Models.DTOs.ExamAttempt;
using OnlineExamPortal.API.Repositories.Interface;
using OnlineExamPortal.API.Services;
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
        private readonly IUserRepository _userRepository;
        private readonly string _connectionString;
        private readonly IEmailService _emailService;

        public ExamAttemptController(
            IExamAttemptRepository examAttemptRepository,
            IExamRepository examRepository,
            IQuestionRepository questionRepository,
            IUserRepository userRepository,
            IConfiguration configuration,
            IEmailService emailService)
        {
            _examAttemptRepository = examAttemptRepository;
            _examRepository = examRepository;
            _questionRepository = questionRepository;
            _userRepository = userRepository;
            _connectionString = configuration.GetConnectionString("OnlineExamPortalConnectionString");
            _emailService = emailService;
        }

        [HttpPost("start")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> StartExam([FromBody] StartExamRequestDto request)
        {
            var studentId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (studentId != request.StudentId)
                return Forbid();

            var exam = await _examRepository.GetByIdAsync(request.ExamId);
            if (exam == null)
                throw new NotFoundException("Exam", request.ExamId);

            if (!exam.IsPublished)
                throw new BadRequestException("Exam is not published yet");

            var hasAttempted = await _examAttemptRepository.HasStudentAttemptedExamAsync(studentId, request.ExamId);
            if (hasAttempted)
                throw new ConflictException("You have already attempted this exam");

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
                    Marks = q.Marks,
                    Options = q.Options.Select(o => new OptionDto
                    {
                        Id = o.Id,
                        OptionText = o.OptionText,
                        OptionOrder = o.OptionOrder,
                        IsCorrect = o.IsCorrect
                    }).ToList(),
                    SelectedOptionIds = null
                }).ToList()
            };

            return Ok(response);
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

                    // Calculate score - ONLY count answers where IsCorrect = 1
                    string scoreSql = @"
                        SELECT ISNULL(SUM(q.Marks), 0) 
                        FROM Answers a 
                        JOIN Questions q ON a.QuestionId = q.Id 
                        WHERE a.ExamAttemptId = @AttemptId AND a.IsCorrect = 1";

                    using SqlCommand scoreCmd = new SqlCommand(scoreSql, conn);
                    scoreCmd.Parameters.AddWithValue("@AttemptId", attemptId);
                    int totalScore = Convert.ToInt32(await scoreCmd.ExecuteScalarAsync());

                    // Get total marks for the exam
                    string totalMarksSql = @"
                        SELECT ISNULL(SUM(q.Marks), 0) 
                        FROM Questions q
                        WHERE q.ExamId = (SELECT ExamId FROM ExamAttempts WHERE Id = @AttemptId)";

                    using SqlCommand totalMarksCmd = new SqlCommand(totalMarksSql, conn);
                    totalMarksCmd.Parameters.AddWithValue("@AttemptId", attemptId);
                    int totalMarks = Convert.ToInt32(await totalMarksCmd.ExecuteScalarAsync());

                    decimal percentage = totalMarks > 0 ? (totalScore * 100.0m) / totalMarks : 0;
                    bool isPassed = percentage >= 40;

                    // Update the attempt
                    string updateSql = @"
                        UPDATE ExamAttempts 
                        SET SubmittedAt = GETDATE(),
                            Score = @Score,
                            Status = 'Completed',
                            IsPassed = @IsPassed,
                            Percentage = @Percentage
                        WHERE Id = @AttemptId";

                    using SqlCommand updateCmd = new SqlCommand(updateSql, conn);
                    updateCmd.Parameters.AddWithValue("@AttemptId", attemptId);
                    updateCmd.Parameters.AddWithValue("@Score", totalScore);
                    updateCmd.Parameters.AddWithValue("@IsPassed", isPassed);
                    updateCmd.Parameters.AddWithValue("@Percentage", percentage);

                    await updateCmd.ExecuteNonQueryAsync();

                    Console.WriteLine($"Exam submitted - Score: {totalScore}/{totalMarks}, Percentage: {percentage}%, Passed: {isPassed}");

                    return Ok(new
                    {
                        message = "Exam submitted successfully",
                        score = totalScore,
                        totalMarks = totalMarks,
                        percentage = percentage,
                        isPassed = isPassed
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SubmitExam: {ex.Message}");
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/ExamAttempt/submit-answer
        [HttpPost("submit-answer")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> SubmitAnswer([FromBody] SubmitAnswerRequestDto request)
        {
            try
            {
                Console.WriteLine($"SubmitAnswer called - AttemptId: {request.AttemptId}, QuestionId: {request.QuestionId}");
                Console.WriteLine($"SelectedOptionIds: {string.Join(",", request.SelectedOptionIds ?? new List<int>())}");

                using SqlConnection conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                // Check if attempt exists and is in progress
                string checkAttemptSql = "SELECT Status FROM ExamAttempts WHERE Id = @AttemptId";
                using SqlCommand checkAttemptCmd = new SqlCommand(checkAttemptSql, conn);
                checkAttemptCmd.Parameters.AddWithValue("@AttemptId", request.AttemptId);
                var status = await checkAttemptCmd.ExecuteScalarAsync();

                if (status == null || status.ToString() != "InProgress")
                {
                    throw new BadRequestException("Exam attempt not found or already submitted");
                }

                // Get correct option IDs from Options table
                string getCorrectSql = @"
            SELECT Id
            FROM Options 
            WHERE QuestionId = @QuestionId AND IsCorrect = 1";

                List<int> correctOptionIds = new List<int>();
                using (SqlCommand getCmd = new SqlCommand(getCorrectSql, conn))
                {
                    getCmd.Parameters.AddWithValue("@QuestionId", request.QuestionId);
                    using (SqlDataReader reader = await getCmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            correctOptionIds.Add(Convert.ToInt32(reader["Id"]));
                        }
                    }
                }

                Console.WriteLine($"Correct Option IDs: {string.Join(",", correctOptionIds)}");

                // Determine if answer is correct
                bool isCorrect = false;

                if (request.SelectedOptionIds != null && request.SelectedOptionIds.Count > 0 && correctOptionIds.Count > 0)
                {
                    var sortedSelected = request.SelectedOptionIds.OrderBy(x => x).ToList();
                    var sortedCorrect = correctOptionIds.OrderBy(x => x).ToList();
                    isCorrect = sortedSelected.SequenceEqual(sortedCorrect);
                }

                Console.WriteLine($"IsCorrect: {isCorrect}");

                // Convert selected option IDs to comma-separated string
                string selectedOptionIdsStr = request.SelectedOptionIds != null && request.SelectedOptionIds.Any()
                    ? string.Join(",", request.SelectedOptionIds)
                    : "";

                // Save or update answer - REMOVED both UpdatedAt AND CreatedAt
                string upsertSql = @"
            IF EXISTS (SELECT 1 FROM Answers WHERE ExamAttemptId = @AttemptId AND QuestionId = @QuestionId)
                UPDATE Answers 
                SET SelectedOptionIds = @SelectedOptionIds, 
                    IsCorrect = @IsCorrect
                WHERE ExamAttemptId = @AttemptId AND QuestionId = @QuestionId
            ELSE
                INSERT INTO Answers (ExamAttemptId, QuestionId, SelectedOptionIds, IsCorrect)
                VALUES (@AttemptId, @QuestionId, @SelectedOptionIds, @IsCorrect)";

                using SqlCommand upsertCmd = new SqlCommand(upsertSql, conn);
                upsertCmd.Parameters.AddWithValue("@AttemptId", request.AttemptId);
                upsertCmd.Parameters.AddWithValue("@QuestionId", request.QuestionId);
                upsertCmd.Parameters.AddWithValue("@SelectedOptionIds", selectedOptionIdsStr);
                upsertCmd.Parameters.AddWithValue("@IsCorrect", isCorrect);

                await upsertCmd.ExecuteNonQueryAsync();

                return Ok(new
                {
                    success = true,
                    message = "Answer submitted successfully",
                    isCorrect = isCorrect
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SubmitAnswer: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
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

                return Ok(attempts);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}