namespace OnlineExamPortal.API.Models.DTOs.Result
{
    public class StudentResultDto
    {
        public int AttemptId { get; set; }
        public int ExamId { get; set; }
        public string ExamTitle { get; set; } = string.Empty;
        public DateTime SubmittedAt { get; set; }
        public int Score { get; set; }
        public int TotalMarks { get; set; }
        public decimal Percentage { get; set; }
        public bool IsPassed { get; set; }
    }
}
