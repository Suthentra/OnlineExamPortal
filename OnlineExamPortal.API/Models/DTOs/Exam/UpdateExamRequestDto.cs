namespace OnlineExamPortal.API.Models.DTOs.Exam
{
    public class UpdateExamRequestDto
    {
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public int TotalMarks { get; set; }

        public int DurationInMinutes { get; set; }

        public DateTime StartTime { get; set; }

        public DateTime EndTime { get; set; }

        public bool IsPublished { get; set; }
    }
}
