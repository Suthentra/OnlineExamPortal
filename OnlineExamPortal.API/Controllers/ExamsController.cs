using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamPortal.API.Exceptions;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Models.DTOs.Exam;
using OnlineExamPortal.API.Models.DTOs.Result;
using OnlineExamPortal.API.Repositories.Interface;
using OnlineExamPortal.API.Services;
using System.Security.Claims;

namespace OnlineExamPortal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ExamsController : ControllerBase
    {
        private readonly IExamRepository _examRepository;
        private readonly IUserRepository _userRepository;
        private readonly IEmailService _emailService;
        private readonly IExamAttemptRepository _examAttemptRepository;

        public ExamsController(
            IExamRepository examRepository,
            IUserRepository userRepository,
            IEmailService emailService,
            IExamAttemptRepository examAttemptRepository)
        {
            _examRepository = examRepository;
            _userRepository = userRepository;
            _emailService = emailService;
            _examAttemptRepository = examAttemptRepository;
        }

        // POST: api/Exams
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateExam([FromBody] CreateExamRequestDto request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            // Add 5.5 hours (India UTC+5:30) when saving
            var startTimeWithOffset = request.StartTime.AddHours(5).AddMinutes(30);
            var endTimeWithOffset = request.EndTime.AddHours(5).AddMinutes(30);

            if (startTimeWithOffset >= endTimeWithOffset)
            {
                throw new BadRequestException("End time must be after start time");
            }

            if (startTimeWithOffset <= DateTime.Now)
            {
                throw new BadRequestException("Start time must be in the future");
            }

            var exam = new Exam
            {
                Title = request.Title,
                Description = request.Description,
                TotalMarks = request.TotalMarks,
                DurationInMinutes = request.DurationInMinutes,
                StartTime = startTimeWithOffset,
                EndTime = endTimeWithOffset,
                IsPublished = false,
                ResultsPublished = false,
                CreatedAt = DateTime.Now,
                UserId = userId
            };

            await _examRepository.CreateAsync(exam);

            return CreatedAtAction(nameof(GetExamById), new { id = exam.Id }, exam);
        }

        // PUT: api/Exams/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateExam(int id, [FromBody] UpdateExamRequestDto request)
        {
            var existingExam = await _examRepository.GetByIdAsync(id);
            if (existingExam == null)
                return NotFound(new { message = "Exam not found" });

            var startTimeWithOffset = request.StartTime.AddHours(5).AddMinutes(30);
            var endTimeWithOffset = request.EndTime.AddHours(5).AddMinutes(30);

            if (startTimeWithOffset >= endTimeWithOffset)
            {
                return BadRequest(new { message = "End time must be after start time" });
            }

            existingExam.Title = request.Title;
            existingExam.Description = request.Description;
            existingExam.TotalMarks = request.TotalMarks;
            existingExam.DurationInMinutes = request.DurationInMinutes;
            existingExam.StartTime = startTimeWithOffset;
            existingExam.EndTime = endTimeWithOffset;
            existingExam.IsPublished = request.IsPublished;

            await _examRepository.UpdateAsync(existingExam);

            return Ok(new { message = "Exam updated successfully" });
        }

        // GET: api/Exams
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllExams()
        {
            var exams = await _examRepository.GetAllAsync();

            var examsWithLocalTime = exams.Select(exam => new
            {
                exam.Id,
                exam.Title,
                exam.Description,
                exam.TotalMarks,
                exam.DurationInMinutes,
                StartTime = exam.StartTime,
                EndTime = exam.EndTime,
                exam.IsPublished,
                exam.ResultsPublished,
                exam.CreatedAt,
                exam.UserId
            });

            return Ok(examsWithLocalTime);
        }

        // GET: api/Exams/published
        [HttpGet("published")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublishedExams()
        {
            try
            {
                var exams = await _examRepository.GetPublishedExamsAsync();

                var publishedExams = exams
                    .Where(e => e.IsPublished)
                    .Select(exam => new
                    {
                        exam.Id,
                        exam.Title,
                        exam.Description,
                        exam.TotalMarks,
                        exam.DurationInMinutes,
                        exam.StartTime,
                        exam.EndTime,
                        exam.IsPublished,
                        exam.ResultsPublished,
                    })
                    .ToList();

                return Ok(publishedExams);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/Exams/{id}
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetExamById(int id)
        {
            var exam = await _examRepository.GetByIdAsync(id);
            if (exam == null)
            {
                throw new NotFoundException("Exam", id);
            }
                var examWithLocalTime = new
            {
                exam.Id,
                exam.Title,
                exam.Description,
                exam.TotalMarks,
                exam.DurationInMinutes,
                exam.StartTime,
                exam.EndTime,
                exam.IsPublished,
                exam.ResultsPublished,
                exam.CreatedAt,
                exam.UserId,
                };

            return Ok(examWithLocalTime);
        }

        // DELETE: api/Exams/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteExam(int id)
        {
            var exists = await _examRepository.ExistsAsync(id);
            if (!exists)
            {
                throw new NotFoundException("Exam", id);
            }

                await _examRepository.DeleteAsync(id);
            return Ok(new { message = "Exam deleted successfully" });
        }

        // PATCH: api/Exams/{id}/publish
        [HttpPatch("{id}/publish")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PublishExam(int id)
        {
            var exam = await _examRepository.GetByIdAsync(id);
            if (exam == null)
                return NotFound(new { message = "Exam not found" });

            if (exam.IsPublished)
            {
                throw new ConflictException("Exam is already published");
            }

            if (exam.StartTime >= exam.EndTime)
            {
                throw new BadRequestException("Cannot publish exam. End time must be after start time.");
            }

            await _examRepository.PublishAsync(id);

            int emailSentCount = 0;
            try
            {
                var allUsers = await _userRepository.GetAllAsync();
                var students = allUsers.Where(u => u.UserRole == "Student").ToList();

                foreach (var student in students)
                {
                    await _emailService.SendExamPublishedEmail(
                        student.Email,
                        student.FullName,
                        exam.Title,
                        exam.StartTime,
                        exam.EndTime,
                        exam.DurationInMinutes,
                        exam.TotalMarks
                    );
                    emailSentCount++;
                }

                Console.WriteLine($"📧 Exam published email sent to {emailSentCount} students");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email notification error: {ex.Message}");
            }

            return Ok(new
            {
                message = $"Exam published successfully. Email notifications sent to {emailSentCount} students.",
                examId = exam.Id,
                examTitle = exam.Title
            });
        }

        // ===== PUBLISH RESULTS =====
        [HttpPatch("{id}/publish-results")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PublishResults(int id)
        {
            var exam = await _examRepository.GetByIdAsync(id);
            if (exam == null)
                return NotFound(new { message = "Exam not found" });

            if (!exam.IsPublished)
            {
                return BadRequest(new { message = "Exam must be published first before publishing results" });
            }

            if (exam.ResultsPublished)
            {
                return BadRequest(new { message = "Results are already published for this exam" });
            }

            var results = await _examAttemptRepository.GetResultsByExamIdAsync(id);

            if (results == null || !results.Any())
            {
                return BadRequest(new { message = "No results found for this exam" });
            }

            int emailSentCount = 0;
            try
            {
                foreach (var result in results)
                {
                    await _emailService.SendResultEmail(
                        result.StudentEmail,
                        result.StudentName,
                        exam.Title,
                        result.Score,
                        result.TotalMarks,
                        result.Percentage,
                        result.IsPassed
                    );
                    emailSentCount++;
                }

                await _examRepository.MarkResultsPublishedAsync(id);

                Console.WriteLine($"📧 Results published email sent to {emailSentCount} students");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Email notification error: {ex.Message}");
                return StatusCode(500, new { message = "Failed to send email notifications" });
            }

            return Ok(new
            {
                message = $"Results published successfully. Email notifications sent to {emailSentCount} students.",
                examId = exam.Id,
                examTitle = exam.Title
            });
        }
    }
}