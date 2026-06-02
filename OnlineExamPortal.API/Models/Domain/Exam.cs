public class Exam
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    public int TotalMarks { get; set; }
    public int DurationInMinutes { get; set; }
    public int TotalQuestions { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }

    public bool IsPublished { get; set; }
    public DateTime CreatedAt { get; set; }

    public int UserId { get; set; }   // FK only
}