using System;

namespace OnlineExamPortal.API.Models.Domain
{
    public class Option
    {
        public int Id { get; set; }
        public int QuestionId { get; set; }
        public string OptionText { get; set; } = string.Empty;
        public int OptionOrder { get; set; }
        public bool IsCorrect { get; set; }
        public DateTime CreatedAt { get; set; }

        // Navigation property
        public Question Question { get; set; }
    }
}