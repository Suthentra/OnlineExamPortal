namespace OnlineExamPortal.API.Models.Domain
{
    public class User
    {
        public int Id { get; set; }

        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;

        public string UserRole { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}