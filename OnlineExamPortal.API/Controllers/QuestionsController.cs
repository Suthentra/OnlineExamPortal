using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Models.DTOs.Question;
using OnlineExamPortal.API.Repositories.Interface;

namespace OnlineExamPortal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    //[Authorize]
    public class QuestionsController : ControllerBase
    {
        private readonly IQuestionRepository _questionRepository;
        private readonly IExamRepository _examRepository;

        public QuestionsController(IQuestionRepository questionRepository, IExamRepository examRepository)
        {
            _questionRepository = questionRepository;
            _examRepository = examRepository;
        }

        // GET: api/Questions/exam/{examId} - Anyone can view
        [HttpGet("exam/{examId}")]
        [AllowAnonymous]
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
                OptionA = q.OptionA,
                OptionB = q.OptionB,
                OptionC = q.OptionC,
                OptionD = q.OptionD,
                Marks = q.Marks
            });

            return Ok(response);
        }

        // GET: api/Questions/{id} - Admin only
        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetQuestionById(int id)
        {
            var question = await _questionRepository.GetByIdAsync(id);
            if (question == null)
                return NotFound(new { message = "Question not found" });

            return Ok(question);
        }

        // POST: api/Questions/exam/{examId} - Admin only
        [HttpPost("exam/{examId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateQuestion(int examId, [FromBody] CreateQuestionRequestDto request)
        {
            var exam = await _examRepository.GetByIdAsync(examId);
            if (exam == null)
                return NotFound(new { message = "Exam not found" });

            var question = new Question
            {
                QuestionText = request.QuestionText,
                OptionA = request.OptionA,
                OptionB = request.OptionB,
                OptionC = request.OptionC,
                OptionD = request.OptionD,
                CorrectAnswer = request.CorrectAnswer,
                Marks = request.Marks,
                CreatedAt = DateTime.Now,
                ExamId = examId
            };

            var createdQuestion = await _questionRepository.CreateAsync(question);

            // Update exam total marks
            var totalMarks = await _questionRepository.GetTotalMarksByExamIdAsync(examId);
            exam.TotalMarks = totalMarks;
            await _examRepository.UpdateAsync(exam);

            return CreatedAtAction(nameof(GetQuestionById), new { id = createdQuestion.Id }, createdQuestion);
        }

        // PUT: api/Questions/{id} - Admin only
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateQuestion(int id, [FromBody] UpdateQuestionRequestDto request)
        {
            var existingQuestion = await _questionRepository.GetByIdAsync(id);
            if (existingQuestion == null)
                return NotFound(new { message = "Question not found" });

            existingQuestion.QuestionText = request.QuestionText;
            existingQuestion.OptionA = request.OptionA;
            existingQuestion.OptionB = request.OptionB;
            existingQuestion.OptionC = request.OptionC;
            existingQuestion.OptionD = request.OptionD;
            existingQuestion.CorrectAnswer = request.CorrectAnswer;
            existingQuestion.Marks = request.Marks;

            await _questionRepository.UpdateAsync(existingQuestion);
            return Ok(new { message = "Question updated successfully" });
        }
        // DELETE: api/Questions/{id} - Admin only
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteQuestion(int id)
        {
            var question = await _questionRepository.GetByIdAsync(id);
            if (question == null)
                return NotFound(new { message = "Question not found" });

            var examId = question.ExamId;
            await _questionRepository.DeleteAsync(id);

            // Update exam total marks
            var totalMarks = await _questionRepository.GetTotalMarksByExamIdAsync(examId);
            var exam = await _examRepository.GetByIdAsync(examId);
            if (exam != null)
            {
                exam.TotalMarks = totalMarks;
                await _examRepository.UpdateAsync(exam);
            }

            return Ok(new { message = "Question deleted successfully" });
        }

        // POST: api/Questions/bulk/exam/{examId} - Admin only
        [HttpPost("bulk/exam/{examId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> BulkCreateQuestions(int examId, [FromBody] BulkCreateQuestionDto request)
        {
            var exam = await _examRepository.GetByIdAsync(examId);
            if (exam == null)
                return NotFound(new { message = "Exam not found" });

            var questions = new List<Question>();
            foreach (var q in request.Questions)
            {
                questions.Add(new Question
                {
                    QuestionText = q.QuestionText,
                    OptionA = q.OptionA,
                    OptionB = q.OptionB,
                    OptionC = q.OptionC,
                    OptionD = q.OptionD,
                    CorrectAnswer = q.CorrectAnswer,
                    Marks = q.Marks,
                    CreatedAt = DateTime.Now,
                    ExamId = examId
                });
            }

            await _questionRepository.BulkCreateAsync(questions);

            // Update exam total marks
            var totalMarks = await _questionRepository.GetTotalMarksByExamIdAsync(examId);
            exam.TotalMarks = totalMarks;
            await _examRepository.UpdateAsync(exam);

            return Ok(new { message = $"{questions.Count} questions created successfully" });
        }
    }
}