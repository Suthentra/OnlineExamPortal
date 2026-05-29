namespace OnlineExamPortal.API.Models.DTOs.ExamAttempt
{
    public class SaveResultDto
    {
        public int AttemptId { get; set; }
        public int Score { get; set; }
        public int TotalMarks { get; set; }
        public decimal Percentage { get; set; }
        public bool IsPassed { get; set; }
    }
}