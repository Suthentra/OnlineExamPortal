using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
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

        [HttpGet("all-violations")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllViolations()
        {
            try
            {
                var violations = new List<object>();

                using SqlConnection conn = new SqlConnection(_connectionString);
                string sql = @"
            SELECT 
                ea.Id as attemptId,
                ea.UserId as studentId,
                u.FullName as studentName,
                u.Email as studentEmail,
                ea.ExamId,
                e.Title as examTitle,
                ea.ViolationType,
                ea.ViolationCount,
                ea.Timestamp,
                ea.RemainingWarnings
            FROM ExamAttempts ea
            INNER JOIN Users u ON ea.UserId = u.Id
            INNER JOIN Exams e ON ea.ExamId = e.Id
            WHERE ea.ViolationType IS NOT NULL 
            ORDER BY ea.Timestamp DESC";

                using SqlCommand cmd = new SqlCommand(sql, conn);
                await conn.OpenAsync();

                using SqlDataReader reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    violations.Add(new
                    {
                        attemptId = Convert.ToInt32(reader["attemptId"]),
                        studentId = Convert.ToInt32(reader["studentId"]),
                        studentName = reader["studentName"]?.ToString() ?? "Unknown",
                        studentEmail = reader["studentEmail"]?.ToString() ?? "",
                        examId = Convert.ToInt32(reader["ExamId"]),
                        examTitle = reader["examTitle"]?.ToString() ?? "Unknown",
                        violationType = reader["ViolationType"]?.ToString(),
                        violationCount = reader["ViolationCount"] != DBNull.Value ? Convert.ToInt32(reader["ViolationCount"]) : 1,
                        timestamp = reader["Timestamp"] != DBNull.Value ? Convert.ToDateTime(reader["Timestamp"]).ToString("o") : DateTime.Now.ToString("o"),
                        remainingWarnings = reader["RemainingWarnings"] != DBNull.Value ? Convert.ToInt32(reader["RemainingWarnings"]) : 0
                    });
                }

                Console.WriteLine($"Found {violations.Count} violations in database");
                return Ok(violations);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetAllViolations Error: {ex.Message}");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }

        [HttpPost("log-violation")]
        [Authorize]
        public async Task<IActionResult> LogViolation([FromBody] ViolationRequestDto request)
        {
            try
            {
                using SqlConnection conn = new SqlConnection(_connectionString);
                await conn.OpenAsync();

                // First check if an exam attempt record exists for this exam and student
                string checkAttemptSql = @"
            SELECT Id FROM ExamAttempts 
            WHERE UserId = @UserId AND ExamId = @ExamId AND Status = 'InProgress'";

                using SqlCommand checkCmd = new SqlCommand(checkAttemptSql, conn);
                checkCmd.Parameters.AddWithValue("@UserId", request.StudentId);
                checkCmd.Parameters.AddWithValue("@ExamId", request.ExamId);

                var existingAttempt = await checkCmd.ExecuteScalarAsync();
                int attemptId;

                if (existingAttempt != null)
                {
                    attemptId = Convert.ToInt32(existingAttempt);

                    // Update existing attempt with violation
                    string updateSql = @"
                UPDATE ExamAttempts 
                SET ViolationType = @ViolationType,
                    ViolationCount = @ViolationCount,
                    Timestamp = @Timestamp,
                    RemainingWarnings = @RemainingWarnings
                WHERE Id = @AttemptId";

                    using SqlCommand updateCmd = new SqlCommand(updateSql, conn);
                    updateCmd.Parameters.AddWithValue("@AttemptId", attemptId);
                    updateCmd.Parameters.AddWithValue("@ViolationType", request.ViolationType);
                    updateCmd.Parameters.AddWithValue("@ViolationCount", request.ViolationCount);
                    updateCmd.Parameters.AddWithValue("@Timestamp", DateTime.Now);
                    updateCmd.Parameters.AddWithValue("@RemainingWarnings", request.RemainingWarnings);

                    await updateCmd.ExecuteNonQueryAsync();
                }
                else
                {
                    // Create a new violation record
                    string insertSql = @"
                INSERT INTO ExamAttempts 
                (UserId, ExamId, ViolationType, ViolationCount, Timestamp, RemainingWarnings, Status, StartedAt)
                VALUES 
                (@UserId, @ExamId, @ViolationType, @ViolationCount, @Timestamp, @RemainingWarnings, 'Violation', GETDATE())";

                    using SqlCommand insertCmd = new SqlCommand(insertSql, conn);
                    insertCmd.Parameters.AddWithValue("@UserId", request.StudentId);
                    insertCmd.Parameters.AddWithValue("@ExamId", request.ExamId);
                    insertCmd.Parameters.AddWithValue("@ViolationType", request.ViolationType);
                    insertCmd.Parameters.AddWithValue("@ViolationCount", request.ViolationCount);
                    insertCmd.Parameters.AddWithValue("@Timestamp", DateTime.Now);
                    insertCmd.Parameters.AddWithValue("@RemainingWarnings", request.RemainingWarnings);

                    await insertCmd.ExecuteNonQueryAsync();
                }

                return Ok(new { success = true, message = "Violation logged successfully to database" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"LogViolation Error: {ex.Message}");
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }
               
        [HttpGet("violations/student/{studentId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetViolationsByStudent(int studentId)
        {
            try
            {
                var violations = new List<object>();

                using SqlConnection conn = new SqlConnection(_connectionString);
                string sql = @"
                    SELECT 
                        ea.Id as attemptId,
                        ea.UserId as studentId,
                        u.FullName as studentName,
                        u.Email as studentEmail,
                        ea.ExamId,
                        e.Title as examTitle,
                        ea.ViolationType,
                        ea.ViolationCount,
                        ea.Timestamp,
                        ea.RemainingWarnings
                    FROM ExamAttempts ea
                    LEFT JOIN Users u ON ea.UserId = u.Id
                    LEFT JOIN Exams e ON ea.ExamId = e.Id
                    WHERE ea.UserId = @StudentId AND ea.ViolationType IS NOT NULL
                    ORDER BY ea.Timestamp DESC";

                using SqlCommand cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@StudentId", studentId);
                await conn.OpenAsync();

                using SqlDataReader reader = await cmd.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    violations.Add(new
                    {
                        attemptId = Convert.ToInt32(reader["attemptId"]),
                        studentId = Convert.ToInt32(reader["studentId"]),
                        studentName = reader["studentName"]?.ToString() ?? "Unknown",
                        studentEmail = reader["studentEmail"]?.ToString() ?? "",
                        examId = Convert.ToInt32(reader["ExamId"]),
                        examTitle = reader["examTitle"]?.ToString() ?? "Unknown",
                        violationType = reader["ViolationType"]?.ToString(),
                        violationCount = reader["ViolationCount"] != DBNull.Value ? Convert.ToInt32(reader["ViolationCount"]) : 1,
                        timestamp = reader["Timestamp"] != DBNull.Value ? Convert.ToDateTime(reader["Timestamp"]).ToString("o") : DateTime.Now.ToString("o"),
                        remainingWarnings = reader["RemainingWarnings"] != DBNull.Value ? Convert.ToInt32(reader["RemainingWarnings"]) : 0
                    });
                }

                return Ok(violations);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
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

                string checkAttemptSql = "SELECT Status FROM ExamAttempts WHERE Id = @AttemptId";
                SqlCommand checkAttemptCmd = new SqlCommand(checkAttemptSql, conn);
                checkAttemptCmd.Parameters.AddWithValue("@AttemptId", request.AttemptId);
                var status = await checkAttemptCmd.ExecuteScalarAsync();

                if (status == null || status.ToString() != "InProgress")
                {
                    return BadRequest(new { message = "Exam attempt not found or already submitted" });
                }

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
                return BadRequest(new { message = ex.Message });
            }
        }

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
                            FROM Answers a 
                            JOIN Questions q ON a.QuestionId = q.Id 
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
                    int totalScore = 0;
                    int totalMarks = 0;
                    decimal percentage = 0;
                    bool isPassed = false;

                    if (await reader.ReadAsync())
                    {
                        totalScore = reader["Score"] != DBNull.Value ? Convert.ToInt32(reader["Score"]) : 0;
                        totalMarks = reader["TotalMarks"] != DBNull.Value ? Convert.ToInt32(reader["TotalMarks"]) : 0;
                        percentage = reader["Percentage"] != DBNull.Value ? Convert.ToDecimal(reader["Percentage"]) : 0;
                        isPassed = reader["IsPassed"] != DBNull.Value ? Convert.ToBoolean(reader["IsPassed"]) : false;
                    }

                    try
                    {
                        var attempt = await _examAttemptRepository.GetAttemptByIdAsync(attemptId);
                        if (attempt != null)
                        {
                            var student = await _userRepository.GetByIdAsync(attempt.UserId);
                            var exam = await _examRepository.GetByIdAsync(attempt.ExamId);

                            if (student != null && exam != null && !string.IsNullOrEmpty(student.Email))
                            {
                                _ = Task.Run(async () =>
                                {
                                    try
                                    {
                                        await _emailService.SendResultEmail(
                                            student.Email,
                                            student.FullName,
                                            exam.Title,
                                            totalScore,
                                            totalMarks,
                                            percentage,
                                            isPassed
                                        );
                                    }
                                    catch (Exception ex)
                                    {
                                        Console.WriteLine($"Email sending failed: {ex.Message}");
                                    }
                                });
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Email preparation failed: {ex.Message}");
                    }

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
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("check/{studentId}/{examId}")]
        [Authorize]
        public async Task<IActionResult> CheckExamAttempted(int studentId, int examId)
        {
            var hasAttempted = await _examAttemptRepository.HasStudentAttemptedExamAsync(studentId, examId);
            return Ok(new { attempted = hasAttempted });
        }

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

    // Request DTO for logging violations
    public class ViolationRequestDto
    {
        public int AttemptId { get; set; }
        public int StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string StudentEmail { get; set; } = string.Empty;
        public int ExamId { get; set; }
        public string ExamTitle { get; set; } = string.Empty;
        public string ViolationType { get; set; } = string.Empty;
        public int ViolationCount { get; set; }
        public int RemainingWarnings { get; set; }
    }
}