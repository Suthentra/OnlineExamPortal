using System;
using System.Collections.Generic;

namespace OnlineExamPortal.API.Models.Domain
{
    public class Exam
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int TotalMarks { get; set; }
        public int DurationInMinutes { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public bool IsPublished { get; set; }
        public DateTime CreatedAt { get; set; }
        public int UserId { get; set; }

        // Add this property
        public ICollection<Section> Sections { get; set; } = new List<Section>();

        // Navigation Properties
        public User User { get; set; }
        public ICollection<Question> Questions { get; set; } = new List<Question>();
        public ICollection<ExamAttempt> ExamAttempts { get; set; } = new List<ExamAttempt>();
    }
}