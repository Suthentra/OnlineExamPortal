using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public ResultsController(
            IExamAttemptRepository examAttemptRepository,
            IExamRepository examRepository,
            IUserRepository userRepository)
        {
            _examAttemptRepository = examAttemptRepository;
            _examRepository = examRepository;
            _userRepository = userRepository;
        }

        // GET: api/Results/student/{studentId}
        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetStudentResults(int studentId)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (currentUserId != studentId && currentUserRole != "Admin")
                return Forbid();

            var attempts = await _examAttemptRepository.GetAttemptsByStudentIdAsync(studentId);

            var results = new List<StudentResultDto>();

            foreach (var attempt in attempts.Where(a => a.Status == "Completed"))
            {
                var exam = await _examRepository.GetByIdAsync(attempt.ExamId);

                results.Add(new StudentResultDto
                {
                    AttemptId = attempt.Id,
                    ExamId = attempt.ExamId,
                    ExamTitle = exam?.Title ?? string.Empty,
                    SubmittedAt = attempt.SubmittedAt,
                    Score = attempt.Score,
                    TotalMarks = exam?.TotalMarks ?? 0,
                    Percentage = attempt.Percentage,
                    IsPassed = attempt.IsPassed
                });
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

            var allUsers = await _userRepository.GetAllAsync();
            var students = allUsers.Where(u => u.UserRole == "Student").ToList();

            var results = new List<ExamResultDetailDto>();

            foreach (var student in students)
            {
                var attempts = await _examAttemptRepository.GetAttemptsByStudentIdAsync(student.Id);
                var attempt = attempts.FirstOrDefault(a => a.ExamId == examId && a.Status == "Completed");

                if (attempt != null)
                {
                    results.Add(new ExamResultDetailDto
                    {
                        AttemptId = attempt.Id,
                        StudentName = student.FullName,
                        StudentEmail = student.Email,
                        SubmittedAt = attempt.SubmittedAt,
                        Score = attempt.Score,
                        TotalMarks = exam.TotalMarks,
                        Percentage = attempt.Percentage,
                        IsPassed = attempt.IsPassed
                    });
                }
            }

            return Ok(results.OrderByDescending(r => r.Score));
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

            var result = await _examAttemptRepository.CalculateResultAsync(attemptId);
            return Ok(result);
        }

        // GET: api/Results/leaderboard/{examId}
        [HttpGet("leaderboard/{examId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetLeaderboard(int examId)
        {
            var exam = await _examRepository.GetByIdAsync(examId);
            if (exam == null)
                return NotFound(new { message = "Exam not found" });

            var allUsers = await _userRepository.GetAllAsync();
            var students = allUsers.Where(u => u.UserRole == "Student").ToList();

            var leaderboard = new List<LeaderboardDto>();

            foreach (var student in students)
            {
                var attempts = await _examAttemptRepository.GetAttemptsByStudentIdAsync(student.Id);
                var attempt = attempts.FirstOrDefault(a => a.ExamId == examId && a.Status == "Completed");

                if (attempt != null)
                {
                    leaderboard.Add(new LeaderboardDto
                    {
                        StudentName = student.FullName,
                        Score = attempt.Score,
                        Percentage = attempt.Percentage,
                        SubmittedAt = attempt.SubmittedAt
                    });
                }
            }

            var sortedLeaderboard = leaderboard
                .OrderByDescending(l => l.Percentage)
                .ThenBy(l => l.SubmittedAt)
                .ToList();

            for (int i = 0; i < sortedLeaderboard.Count; i++)
            {
                sortedLeaderboard[i].Rank = i + 1;
            }

            return Ok(sortedLeaderboard);
        }
    }
}