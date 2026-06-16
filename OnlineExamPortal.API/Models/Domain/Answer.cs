// Models/Domain/Answer.cs
public class Answer
{
    public int Id { get; set; }
    public string SelectedOptionIds { get; set; } = string.Empty;  // Store as "1,3,5" for multiple answers
    public bool IsCorrect { get; set; }
    public int ExamAttemptId { get; set; }
    public int QuestionId { get; set; }
}