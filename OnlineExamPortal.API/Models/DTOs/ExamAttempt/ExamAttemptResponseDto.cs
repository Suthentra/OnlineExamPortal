using System;
using System.Collections.Generic;

namespace OnlineExamPortal.API.Models.DTOs.ExamAttempt
{
    public class ExamAttemptResponseDto
    {
        public int Id { get; set; }
        public int ExamId { get; set; }
        public string ExamTitle { get; set; } = string.Empty;
        public DateTime StartedAt { get; set; }
        public string Status { get; set; } = string.Empty;
        public int RemainingMinutes { get; set; }
        public List<QuestionWithAnswerDto> Questions { get; set; } = new List<QuestionWithAnswerDto>();
    }
}