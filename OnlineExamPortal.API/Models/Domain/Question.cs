using System;
using System.Collections.Generic;

namespace OnlineExamPortal.API.Models.Domain
{
    public class Question
    {
        public int Id { get; set; }
        public string QuestionText { get; set; } = string.Empty;
        public string QuestionType { get; set; } = "MCQ";
        public int Marks { get; set; }
        public int ExamId { get; set; }
        public DateTime CreatedAt { get; set; }

        // Navigation properties
        public ICollection<Option> Options { get; set; } = new List<Option>();
        public Exam Exam { get; set; }
    }
}