namespace OnlineExamPortal.API.Models.DTOs.Exam
{
    public class CreateExamWithSectionsDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DurationInMinutes { get; set; }
        public List<SectionDto> Sections { get; set; } = new List<SectionDto>();
    }

    public class SectionDto
    {
        public string SectionName { get; set; } = string.Empty;
        public int SectionOrder { get; set; }
        public int TotalQuestions { get; set; }
        public int TotalMarks { get; set; }
    }
}