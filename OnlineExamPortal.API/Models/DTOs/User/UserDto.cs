namespace OnlineExamPortal.API.Models.DTOs.User
{
    public class UserDto
    {
        public int Id { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string UserRole { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }
    }
}
