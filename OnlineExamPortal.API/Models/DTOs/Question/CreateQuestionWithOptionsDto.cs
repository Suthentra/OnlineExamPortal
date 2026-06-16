using System.Collections.Generic;

namespace OnlineExamPortal.API.Models.DTOs.Question
{
    public class CreateQuestionWithOptionsDto
    {
        public string QuestionText { get; set; } = string.Empty;
        public string QuestionType { get; set; } = "MCQ";
        public int Marks { get; set; }
        public List<OptionDto> Options { get; set; } = new List<OptionDto>();
    }

    public class UpdateQuestionWithOptionsDto
    {
        public string QuestionText { get; set; } = string.Empty;
        public string QuestionType { get; set; } = "MCQ";
        public int Marks { get; set; }
        public List<OptionDto> Options { get; set; } = new List<OptionDto>();
    }

    public class OptionDto
    {
        public string OptionText { get; set; } = string.Empty;
        public int OptionOrder { get; set; }
        public bool IsCorrect { get; set; }
    }

    public class QuestionResponseDto
    {
        public int Id { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public string QuestionType { get; set; } = "MCQ";
        public int Marks { get; set; }
        public List<OptionResponseDto> Options { get; set; } = new List<OptionResponseDto>();
    }

    public class OptionResponseDto
    {
        public int Id { get; set; }
        public string OptionText { get; set; } = string.Empty;
        public int OptionOrder { get; set; }
        public bool IsCorrect { get; set; }
    }
}