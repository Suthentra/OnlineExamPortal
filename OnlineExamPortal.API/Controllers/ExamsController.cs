using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Models.DTOs.Exam;
using OnlineExamPortal.API.Repositories.Interface;
using System.Security.Claims;

namespace OnlineExamPortal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExamsController : ControllerBase
    {
        private readonly IExamRepository examRepository;
        private readonly string _connectionString;  // ← ADD THIS

        public ExamsController(IExamRepository examRepository, IConfiguration configuration)  // ← Add IConfiguration
        {
            this.examRepository = examRepository;
            _connectionString = configuration.GetConnectionString("OnlineExamPortalConnectionString");  // ← ADD THIS
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllExams()
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = @"
                SELECT 
                    e.Id, 
                    e.Title, 
                    e.Description, 
                    e.TotalMarks, 
                    e.DurationInMinutes, 
                    e.IsPublished, 
                    e.CreatedAt, 
                    e.UserId,
                    (SELECT COUNT(*) FROM Questions WHERE ExamId = e.Id) AS TotalQuestions
                FROM Exams e
                ORDER BY e.Id DESC
            ";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            await conn.OpenAsync();

            var exams = new List<object>();
            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                exams.Add(new
                {
                    id = reader["Id"],
                    title = reader["Title"],
                    description = reader["Description"],
                    totalMarks = reader["TotalMarks"],
                    durationInMinutes = reader["DurationInMinutes"],
                    isPublished = reader["IsPublished"],
                    createdAt = reader["CreatedAt"],
                    userId = reader["UserId"],
                    totalQuestions = reader["TotalQuestions"]
                });
            }

            return Ok(exams);
        }

        // ... rest of your existing methods
    }
}