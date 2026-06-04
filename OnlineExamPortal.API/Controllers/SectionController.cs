using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Repositories.Interface;

namespace OnlineExamPortal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class SectionController : ControllerBase
    {
        private readonly ISectionRepository _sectionRepository;

        public SectionController(ISectionRepository sectionRepository)
        {
            _sectionRepository = sectionRepository;
        }

        [HttpGet("exam/{examId}")]
        public async Task<IActionResult> GetSectionsByExam(int examId)
        {
            var sections = await _sectionRepository.GetByExamIdAsync(examId);
            return Ok(sections);
        }

        [HttpPost]
        public async Task<IActionResult> CreateSection([FromBody] Section section)
        {
            var newSection = await _sectionRepository.CreateAsync(section);
            return Ok(newSection);
        }
    }
}