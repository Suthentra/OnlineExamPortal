namespace OnlineExamPortal.API.Models.DTOs.ExamAttempt
{
    public class SubmitAnswerRequestDto
    {
        public int AttemptId { get; set; }
        public int QuestionId { get; set; }
        public string SelectedOption { get; set; } = string.Empty;
    }
}