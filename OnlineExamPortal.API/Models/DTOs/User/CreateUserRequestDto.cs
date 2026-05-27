namespace OnlineExamPortal.API.Models.DTOs.User
{
    public class CreateUserRequestDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string UserRole { get; set; } = string.Empty;
    }
}
