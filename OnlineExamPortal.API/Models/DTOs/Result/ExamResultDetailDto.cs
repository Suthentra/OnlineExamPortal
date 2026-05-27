namespace OnlineExamPortal.API.Models.DTOs.Result
{
    public class ExamResultDetailDto
    {
        public int AttemptId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string StudentEmail { get; set; } = string.Empty;
        public DateTime SubmittedAt { get; set; }
        public int Score { get; set; }
        public int TotalMarks { get; set; }
        public decimal Percentage { get; set; }
        public bool IsPassed { get; set; }
    }
}