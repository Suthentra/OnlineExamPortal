using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamPortal.API.Models.DTOs.ExamAttempt;
using OnlineExamPortal.API.Repositories.Interface;
using System.Security.Claims;

namespace OnlineExamPortal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    //[Authorize]
    public class ExamAttemptController : ControllerBase
    {
        private readonly IExamAttemptRepository _examAttemptRepository;
        private readonly IExamRepository _examRepository;
        private readonly IQuestionRepository _questionRepository;

        public ExamAttemptController(
            IExamAttemptRepository examAttemptRepository,
            IExamRepository examRepository,
            IQuestionRepository questionRepository)
        {
            _examAttemptRepository = examAttemptRepository;
            _examRepository = examRepository;
            _questionRepository = questionRepository;
        }

        // POST: api/ExamAttempt/start
        [HttpPost("start")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> StartExam([FromBody] StartExamRequestDto request)
        {
            // Get logged-in student ID
            var studentId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            if (studentId != request.StudentId)
                return Forbid();

            // Check if exam exists and is published
            var exam = await _examRepository.GetByIdAsync(request.ExamId);
            if (exam == null)
                return NotFound(new { message = "Exam not found" });

            if (!exam.IsPublished)
                return BadRequest(new { message = "Exam is not published yet" });

            // Check if student already attempted
            var hasAttempted = await _examAttemptRepository.HasStudentAttemptedExamAsync(studentId, request.ExamId);
            if (hasAttempted)
                return BadRequest(new { message = "You have already attempted this exam" });

            // Start the exam
            var attempt = await _examAttemptRepository.StartExamAsync(studentId, request.ExamId);

            // Get questions for this exam
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
            var attempt = await _examAttemptRepository.GetAttemptByIdAsync(request.AttemptId);
            if (attempt == null)
                return NotFound(new { message = "Attempt not found" });

            if (attempt.Status != "InProgress")
                return BadRequest(new { message = "Exam is already submitted or expired" });

            var answer = await _examAttemptRepository.SubmitAnswerAsync(
                request.AttemptId,
                request.QuestionId,
                request.SelectedOption);

            return Ok(new { message = "Answer submitted successfully", isCorrect = answer.IsCorrect });
        }

        // POST: api/ExamAttempt/submit/{attemptId}
        [HttpPost("submit/{attemptId}")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> SubmitExam(int attemptId)
        {
            var attempt = await _examAttemptRepository.GetAttemptByIdAsync(attemptId);
            if (attempt == null)
                return NotFound(new { message = "Attempt not found" });

            if (attempt.Status != "InProgress")
                return BadRequest(new { message = "Exam is already submitted" });

            var submittedAttempt = await _examAttemptRepository.SubmitExamAsync(attemptId);
            var result = await _examAttemptRepository.CalculateResultAsync(attemptId);

            return Ok(result);
        }

        // GET: api/ExamAttempt/{attemptId}
        [HttpGet("{attemptId}")]
        public async Task<IActionResult> GetAttemptById(int attemptId)
        {
            var attempt = await _examAttemptRepository.GetAttemptByIdAsync(attemptId);
            if (attempt == null)
                return NotFound(new { message = "Attempt not found" });

            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (currentUserId != attempt.UserId && currentUserRole != "Admin")
                return Forbid();

            return Ok(attempt);
        }

        // GET: api/ExamAttempt/student/{studentId}
        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetAttemptsByStudentId(int studentId)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (currentUserId != studentId && currentUserRole != "Admin")
                return Forbid();

            var attempts = await _examAttemptRepository.GetAttemptsByStudentIdAsync(studentId);
            return Ok(attempts);
        }

        // GET: api/ExamAttempt/result/{attemptId}
        [HttpGet("result/{attemptId}")]
        public async Task<IActionResult> GetResult(int attemptId)
        {
            var attempt = await _examAttemptRepository.GetAttemptByIdAsync(attemptId);
            if (attempt == null)
                return NotFound(new { message = "Attempt not found" });

            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            if (currentUserId != attempt.UserId && currentUserRole != "Admin")
                return Forbid();

            var result = await _examAttemptRepository.CalculateResultAsync(attemptId);
            return Ok(result);
        }

        [HttpGet("check/{studentId}/{examId}")]
        [Authorize]
        public async Task<IActionResult> CheckExamAttempted(int studentId, int examId)
        {
            var hasAttempted = await _examAttemptRepository.HasStudentAttemptedExamAsync(studentId, examId);
            return Ok(new { attempted = hasAttempted });
        }
    }
}