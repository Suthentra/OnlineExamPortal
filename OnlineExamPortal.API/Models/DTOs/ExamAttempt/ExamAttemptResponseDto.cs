namespace OnlineExamPortal.API.Models.DTOs.ExamAttempt
{
    public class ExamAttemptResponseDto
    {
        public int Id { get; set; }
        public int ExamId { get; set; }
        public string ExamTitle { get; set; } = string.Empty;
        public DateTime StartedAt { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public string Status { get; set; } = string.Empty; // InProgress, Completed, Expired
        public int RemainingMinutes { get; set; }
        public List<QuestionWithAnswerDto> Questions { get; set; } = new List<QuestionWithAnswerDto>();
    }

    public class QuestionWithAnswerDto
    {
        public int QuestionId { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public string OptionA { get; set; } = string.Empty;
        public string OptionB { get; set; } = string.Empty;
        public string OptionC { get; set; } = string.Empty;
        public string OptionD { get; set; } = string.Empty;
        public int Marks { get; set; }
        public string? SelectedOption { get; set; }
    }
}