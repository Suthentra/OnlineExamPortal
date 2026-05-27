public class Question
{
    public int Id { get; set; }
    public string QuestionText { get; set; } = string.Empty;

    public string OptionA { get; set; } = string.Empty;
    public string OptionB { get; set; } = string.Empty;
    public string OptionC { get; set; } = string.Empty;
    public string OptionD { get; set; } = string.Empty;

    public string CorrectAnswer { get; set; } = string.Empty;

    public int Marks { get; set; }
    public DateTime CreatedAt { get; set; }

    public int ExamId { get; set; }   // FK only
}