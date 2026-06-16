using System.Collections.Generic;

namespace OnlineExamPortal.API.Models.DTOs.ExamAttempt
{
    public class SubmitAnswerRequestDto
    {
        public int AttemptId { get; set; }
        public int QuestionId { get; set; }
        public List<int> SelectedOptionIds { get; set; } = new List<int>();
    }
}