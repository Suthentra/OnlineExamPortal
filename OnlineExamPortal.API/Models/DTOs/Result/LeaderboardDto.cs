namespace OnlineExamPortal.API.Models.DTOs.Result
{
    public class LeaderboardDto
    {
        public int Rank { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public int Score { get; set; }
        public decimal Percentage { get; set; }
        public DateTime SubmittedAt { get; set; }
    }
}