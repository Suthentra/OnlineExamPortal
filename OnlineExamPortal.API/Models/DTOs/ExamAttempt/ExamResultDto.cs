namespace OnlineExamPortal.API.Models.DTOs.ExamAttempt
{
    public class ExamResultDto
    {
        public int AttemptId { get; set; }
        public int Score { get; set; }
        public int TotalMarks { get; set; }
        public decimal Percentage { get; set; }
        public bool IsPassed { get; set; }
        public DateTime SubmittedAt { get; set; }
        public List<AnswerResultDto> Answers { get; set; } = new List<AnswerResultDto>();
    }

    public class AnswerResultDto
    {
        public int QuestionId { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public string YourAnswer { get; set; } = string.Empty;
        public string CorrectAnswer { get; set; } = string.Empty;
        public bool IsCorrect { get; set; }
        public int MarksObtained { get; set; }
    }
}