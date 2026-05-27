public class Answer
{
    public int Id { get; set; }

    public string SelectedOption { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }

    public int ExamAttemptId { get; set; }
    public int QuestionId { get; set; }
}