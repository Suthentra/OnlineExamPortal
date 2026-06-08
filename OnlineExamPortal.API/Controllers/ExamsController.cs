using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public ExamsController(IExamRepository examRepository)
        {
            this.examRepository = examRepository;
        }

        // GET: api/Exams
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllExams()
        {
            var exams = await examRepository.GetAllAsync();
            return Ok(exams);
        }

        // GET: api/Exams/published
        [HttpGet("published")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublishedExams()
        {
            var exams = await examRepository.GetPublishedExamsAsync();
            return Ok(exams);
        }

        // GET: api/Exams/{id}
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetExamById(int id)
        {
            var exam = await examRepository.GetByIdAsync(id);
            if (exam == null)
                return NotFound(new { message = "Exam not found" });
            return Ok(exam);
        }

        // POST: api/Exams
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateExam([FromBody] CreateExamRequestDto request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

            Console.WriteLine($"Creating exam: {request.Title}, UserId: {userId}"); // Debug

            var exam = new Exam
            {
                Title = request.Title,
                Description = request.Description,
                TotalMarks = request.TotalMarks,
                DurationInMinutes = request.DurationInMinutes,
                StartTime = request.StartTime,
                EndTime = request.EndTime,
                IsPublished = false,
                CreatedAt = DateTime.Now,
                UserId = userId
            };

            await examRepository.CreateAsync(exam);

            Console.WriteLine($"Exam created with ID: {exam.Id}"); // Debug

            return CreatedAtAction(nameof(GetExamById), new { id = exam.Id }, exam);
        }

        // PUT: api/Exams/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateExam(int id, [FromBody] UpdateExamRequestDto request)
        {
            var existingExam = await examRepository.GetByIdAsync(id);
            if (existingExam == null)
                return NotFound(new { message = "Exam not found" });

            existingExam.Title = request.Title;
            existingExam.Description = request.Description;
            existingExam.TotalMarks = request.TotalMarks;
            existingExam.DurationInMinutes = request.DurationInMinutes;
            existingExam.StartTime = request.StartTime;
            existingExam.EndTime = request.EndTime;
            existingExam.IsPublished = request.IsPublished;

            await examRepository.UpdateAsync(existingExam);
            return Ok(new { message = "Exam updated successfully" });
        }

        // DELETE: api/Exams/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteExam(int id)
        {
            var exists = await examRepository.ExistsAsync(id);
            if (!exists)
                return NotFound(new { message = "Exam not found" });

            await examRepository.DeleteAsync(id);
            return Ok(new { message = "Exam deleted successfully" });
        }

        // PATCH: api/Exams/{id}/publish
        [HttpPatch("{id}/publish")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PublishExam(int id)
        {
            var exists = await examRepository.ExistsAsync(id);
            if (!exists)
                return NotFound(new { message = "Exam not found" });

            await examRepository.PublishAsync(id);
            return Ok(new { message = "Exam published successfully" });
        }
    }
}