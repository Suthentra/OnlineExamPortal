using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Models.DTOs.Result;
using OnlineExamPortal.API.Repositories.Interface;
using System.Security.Claims;

namespace OnlineExamPortal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ResultsController : ControllerBase
    {
        private readonly IExamAttemptRepository _examAttemptRepository;
        private readonly IExamRepository _examRepository;
        private readonly IUserRepository _userRepository;
        private readonly IConfiguration _configuration;
        private readonly string _connectionString;

        public ResultsController(
            IExamAttemptRepository examAttemptRepository,
            IExamRepository examRepository,
            IUserRepository userRepository,
            IConfiguration configuration)
        {
            _examAttemptRepository = examAttemptRepository;
            _examRepository = examRepository;
            _userRepository = userRepository;
            _configuration = configuration;
            _connectionString = _configuration.GetConnectionString("OnlineExamPortalConnectionString");
        }

        // GET: api/Results/student/{studentId}
        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetStudentResults(int studentId)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (currentUserId != studentId && currentUserRole != "Admin")
                return Forbid();

            var results = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                string sql = @"
                    SELECT 
                        ea.Id AS AttemptId,
                        ea.ExamId,
                        e.Title AS ExamTitle,
                        ISNULL(ea.Score, 0) AS Score,
                        e.TotalMarks,
                        ISNULL(ea.Percentage, 0) AS Percentage,
                        ISNULL(ea.IsPassed, 0) AS IsPassed,
                        ea.SubmittedAt
                    FROM ExamAttempts ea
                    INNER JOIN Exams e ON ea.ExamId = e.Id
                    WHERE ea.UserId = @StudentId AND ea.Status = 'Completed'
                    ORDER BY ea.SubmittedAt DESC;
                ";

                using SqlCommand cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@StudentId", studentId);

                await conn.OpenAsync();
                using SqlDataReader reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    results.Add(new
                    {
                        attemptId = Convert.ToInt32(reader["AttemptId"]),
                        examId = Convert.ToInt32(reader["ExamId"]),
                        examTitle = reader["ExamTitle"].ToString(),
                        score = Convert.ToInt32(reader["Score"]),
                        totalMarks = Convert.ToInt32(reader["TotalMarks"]),
                        percentage = Convert.ToDecimal(reader["Percentage"]),
                        isPassed = Convert.ToBoolean(reader["IsPassed"]),
                        submittedAt = Convert.ToDateTime(reader["SubmittedAt"])
                    });
                }
            }

            return Ok(results);
        }

        // GET: api/Results/exam/{examId}
        [HttpGet("exam/{examId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetExamResults(int examId)
        {
            var exam = await _examRepository.GetByIdAsync(examId);
            if (exam == null)
                return NotFound(new { message = "Exam not found" });

            var results = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                string sql = @"
                    SELECT 
                        u.Id AS StudentId,
                        u.FullName AS StudentName,
                        u.Email AS StudentEmail,
                        ea.Id AS AttemptId,
                        ISNULL(ea.Score, 0) AS Score,
                        ISNULL(ea.Percentage, 0) AS Percentage,
                        ISNULL(ea.IsPassed, 0) AS IsPassed,
                        ea.StartedAt,
                        ea.SubmittedAt
                    FROM ExamAttempts ea
                    INNER JOIN Users u ON ea.UserId = u.Id
                    WHERE ea.ExamId = @ExamId AND ea.Status = 'Completed'
                    ORDER BY ea.Score DESC;
                ";

                using SqlCommand cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@ExamId", examId);

                await conn.OpenAsync();
                using SqlDataReader reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    results.Add(new
                    {
                        attemptId = Convert.ToInt32(reader["AttemptId"]),
                        studentName = reader["StudentName"].ToString(),
                        studentEmail = reader["StudentEmail"].ToString(),
                        score = Convert.ToInt32(reader["Score"]),
                        totalMarks = exam.TotalMarks,
                        percentage = Convert.ToDecimal(reader["Percentage"]),
                        isPassed = Convert.ToBoolean(reader["IsPassed"]),
                        startedAt = Convert.ToDateTime(reader["StartedAt"]),
                        submittedAt = Convert.ToDateTime(reader["SubmittedAt"])
                    });
                }
            }

            return Ok(results);
        }

        // GET: api/Results/{attemptId}
        [HttpGet("{attemptId}")]
        public async Task<IActionResult> GetResultByAttemptId(int attemptId)
        {
            var attempt = await _examAttemptRepository.GetAttemptByIdAsync(attemptId);
            if (attempt == null)
                return NotFound(new { message = "Result not found" });

            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (currentUserId != attempt.UserId && currentUserRole != "Admin")
                return Forbid();

            var exam = await _examRepository.GetByIdAsync(attempt.ExamId);

            // Get answer details
            var answers = new List<object>();

            using (SqlConnection conn = new SqlConnection(_connectionString))
            {
                string sql = @"
                    SELECT 
                        q.Id AS QuestionId,
                        q.QuestionText,
                        ISNULL(a.SelectedOption, 'Not Answered') AS YourAnswer,
                        q.CorrectAnswer,
                        ISNULL(a.IsCorrect, 0) AS IsCorrect,
                        q.Marks
                    FROM Questions q
                    LEFT JOIN Answers a ON q.Id = a.QuestionId AND a.ExamAttemptId = @AttemptId
                    WHERE q.ExamId = @ExamId
                    ORDER BY q.Id;
                ";

                using SqlCommand cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@AttemptId", attemptId);
                cmd.Parameters.AddWithValue("@ExamId", attempt.ExamId);

                await conn.OpenAsync();
                using SqlDataReader reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    answers.Add(new
                    {
                        questionId = Convert.ToInt32(reader["QuestionId"]),
                        questionText = reader["QuestionText"].ToString(),
                        yourAnswer = reader["YourAnswer"].ToString(),
                        correctAnswer = reader["CorrectAnswer"].ToString(),
                        isCorrect = Convert.ToBoolean(reader["IsCorrect"]),
                        marks = Convert.ToInt32(reader["Marks"])
                    });
                }
            }

            var result = new
            {
                attemptId = attempt.Id,
                examTitle = exam?.Title,
                score = attempt.Score,
                totalMarks = exam?.TotalMarks ?? 0,
                percentage = attempt.Percentage,
                isPassed = attempt.IsPassed,
                submittedAt = attempt.SubmittedAt,
                answers = answers
            };

            return Ok(result);
        }
    }
}