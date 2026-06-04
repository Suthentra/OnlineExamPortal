namespace OnlineExamPortal.API.Models.Domain
{
    public class Section
    {
        public int Id { get; set; }
        public int ExamId { get; set; }
        public string SectionName { get; set; } = string.Empty;
        public int SectionOrder { get; set; }
        public int TotalQuestions { get; set; }
        public int TotalMarks { get; set; }
        public DateTime CreatedAt { get; set; }

        // Navigation Properties
        public Exam Exam { get; set; }
        public ICollection<Question> Questions { get; set; } = new List<Question>();
    }
}