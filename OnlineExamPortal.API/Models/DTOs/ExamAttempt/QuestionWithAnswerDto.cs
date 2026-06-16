using System.Collections.Generic;

namespace OnlineExamPortal.API.Models.DTOs.ExamAttempt
{
    public class QuestionWithAnswerDto
    {
        public int QuestionId { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public List<OptionDto> Options { get; set; } = new List<OptionDto>();
        public int Marks { get; set; }
        public List<int>? SelectedOptionIds { get; set; }
    }

    public class OptionDto
    {
        public int Id { get; set; }
        public string OptionText { get; set; } = string.Empty;
        public int OptionOrder { get; set; }
        public bool IsCorrect { get; set; }
    }
}