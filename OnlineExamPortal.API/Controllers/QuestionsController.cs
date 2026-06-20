using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamPortal.API.Exceptions;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Models.DTOs.Question;
using OnlineExamPortal.API.Repositories.Interface;

namespace OnlineExamPortal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuestionsController : ControllerBase
    {
        private readonly IQuestionRepository _questionRepository;
        private readonly IOptionRepository _optionRepository;
        private readonly IExamRepository _examRepository;

        public QuestionsController(
            IQuestionRepository questionRepository,
            IOptionRepository optionRepository,
            IExamRepository examRepository)
        {
            _questionRepository = questionRepository;
            _optionRepository = optionRepository;
            _examRepository = examRepository;
        }

        // GET: api/Questions/exam/{examId}
        [HttpGet("exam/{examId}")]
        public async Task<IActionResult> GetQuestionsByExamId(int examId)
        {
            var exam = await _examRepository.GetByIdAsync(examId);
            if (exam == null)
                return NotFound(new { message = "Exam not found" });

            var questions = await _questionRepository.GetByExamIdAsync(examId);

            var response = questions.Select(q => new QuestionResponseDto
            {
                Id = q.Id,
                QuestionText = q.QuestionText,
                QuestionType = q.QuestionType,
                Marks = q.Marks,
                Options = q.Options.Select(o => new OptionResponseDto
                {
                    Id = o.Id,
                    OptionText = o.OptionText,
                    OptionOrder = o.OptionOrder,
                    IsCorrect = o.IsCorrect
                }).ToList()
            });

            return Ok(response);
        }

        // GET: api/Questions/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetQuestionById(int id)
        {
            var question = await _questionRepository.GetQuestionWithOptionsAsync(id);
            if (question == null)
                return NotFound(new { message = "Question not found" });

            var response = new QuestionResponseDto
            {
                Id = question.Id,
                QuestionText = question.QuestionText,
                QuestionType = question.QuestionType,
                Marks = question.Marks,
                Options = question.Options.Select(o => new OptionResponseDto
                {
                    Id = o.Id,
                    OptionText = o.OptionText,
                    OptionOrder = o.OptionOrder,
                    IsCorrect = o.IsCorrect
                }).ToList()
            };

            return Ok(response);
        }

        // POST: api/Questions/exam/{examId}
        [HttpPost("exam/{examId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateQuestion(int examId, [FromBody] CreateQuestionWithOptionsDto request)
        {
            try
            {
                var exam = await _examRepository.GetByIdAsync(examId);
                if (exam == null)
                    throw new NotFoundException("Exam", examId);

                // Validate
                if (request.Options == null || request.Options.Count < 2)
                    throw new ValidationException("At least 2 options required", "Options", "Minimum 2 options required");

                if (!request.Options.Any(o => o.IsCorrect))
                    throw new ValidationException("At least one correct answer required", "CorrectAnswer", "Please mark at least one option as correct");

                // For MCQ (Single Answer), ensure only ONE correct answer
                if (request.QuestionType == "MCQ")
                {
                    var correctCount = request.Options.Count(o => o.IsCorrect);
                    if (correctCount > 1)
                        throw new ValidationException("Single Answer questions can only have ONE correct option", "CorrectAnswer", "Only one correct option allowed for MCQ");
                }

                // Create question
                var question = new Question
                {
                    QuestionText = request.QuestionText,
                    QuestionType = request.QuestionType,
                    Marks = request.Marks,
                    ExamId = examId,
                    CreatedAt = DateTime.Now
                };

                var createdQuestion = await _questionRepository.CreateAsync(question);

                // Create options
                foreach (var optionDto in request.Options)
                {
                    var option = new Option
                    {
                        QuestionId = createdQuestion.Id,
                        OptionText = optionDto.OptionText,
                        OptionOrder = optionDto.OptionOrder,
                        IsCorrect = optionDto.IsCorrect,
                        CreatedAt = DateTime.Now
                    };
                    await _optionRepository.CreateAsync(option);
                }

                

                return Ok(new { id = createdQuestion.Id, message = "Question created successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // PUT: api/Questions/{id}
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateQuestion(int id, [FromBody] UpdateQuestionWithOptionsDto request)
        {
            try
            {
                var existingQuestion = await _questionRepository.GetQuestionWithOptionsAsync(id);
                if (existingQuestion == null)
                    throw new NotFoundException("Question", id);
                // Validate
                if (request.Options == null || request.Options.Count < 2)
                    return BadRequest(new { message = "At least 2 options required" });

                if (!request.Options.Any(o => o.IsCorrect))
                    return BadRequest(new { message = "At least one correct answer required" });

                // For MCQ (Single Answer), ensure only ONE correct answer
                if (request.QuestionType == "MCQ")
                {
                    var correctCount = request.Options.Count(o => o.IsCorrect);
                    if (correctCount > 1)
                        return BadRequest(new { message = "Single Answer questions can only have ONE correct option" });
                }

                int examId = existingQuestion.ExamId;

                // Update question
                existingQuestion.QuestionText = request.QuestionText;
                existingQuestion.QuestionType = request.QuestionType;
                existingQuestion.Marks = request.Marks;
                await _questionRepository.UpdateAsync(existingQuestion);

                // Delete old options and create new ones
                await _optionRepository.DeleteByQuestionIdAsync(id);

                foreach (var optionDto in request.Options)
                {
                    var option = new Option
                    {
                        QuestionId = id,
                        OptionText = optionDto.OptionText,
                        OptionOrder = optionDto.OptionOrder,
                        IsCorrect = optionDto.IsCorrect,
                        CreatedAt = DateTime.Now
                    };
                    await _optionRepository.CreateAsync(option);
                }

                

                return Ok(new { message = "Question updated successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // DELETE: api/Questions/{id}
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteQuestion(int id)
        {
            try
            {
                var question = await _questionRepository.GetByIdAsync(id);
                if (question == null)
                    return NotFound(new { message = "Question not found" });

                var examId = question.ExamId;

                await _optionRepository.DeleteByQuestionIdAsync(id);
                await _questionRepository.DeleteAsync(id);

                

                return Ok(new { message = "Question deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // POST: api/Questions/bulk/{examId}
        [HttpPost("bulk/{examId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> BulkCreateQuestions(int examId, [FromBody] List<CreateQuestionWithOptionsDto> questions)
        {
            try
            {
                var exam = await _examRepository.GetByIdAsync(examId);
                if (exam == null)
                    return NotFound(new { message = "Exam not found" });

                int successCount = 0;

                foreach (var q in questions)
                {
                    // Validate
                    if (q.Options == null || q.Options.Count < 2) continue;
                    if (!q.Options.Any(o => o.IsCorrect)) continue;

                    // For MCQ, ensure only ONE correct answer
                    if (q.QuestionType == "MCQ")
                    {
                        var correctCount = q.Options.Count(o => o.IsCorrect);
                        if (correctCount > 1) continue;
                    }

                    // Create question
                    var question = new Question
                    {
                        QuestionText = q.QuestionText,
                        QuestionType = q.QuestionType,
                        Marks = q.Marks,
                        ExamId = examId,
                        CreatedAt = DateTime.Now
                    };

                    var createdQuestion = await _questionRepository.CreateAsync(question);

                    // Create options
                    foreach (var optionDto in q.Options)
                    {
                        var option = new Option
                        {
                            QuestionId = createdQuestion.Id,
                            OptionText = optionDto.OptionText,
                            OptionOrder = optionDto.OptionOrder,
                            IsCorrect = optionDto.IsCorrect,
                            CreatedAt = DateTime.Now
                        };
                        await _optionRepository.CreateAsync(option);
                    }
                    successCount++;
                }

                return Ok(new { message = $"{successCount} questions added successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}