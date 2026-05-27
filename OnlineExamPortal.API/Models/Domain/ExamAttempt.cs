public class ExamAttempt
{
    public int Id { get; set; }

    public DateTime StartedAt { get; set; }
    public DateTime SubmittedAt { get; set; }

    public int Score { get; set; }
    public string Status { get; set; } = string.Empty;

    public bool IsPassed { get; set; }
    public decimal Percentage { get; set; }

    public int UserId { get; set; }
    public int ExamId { get; set; }
}