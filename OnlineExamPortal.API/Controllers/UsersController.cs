// Controllers/UsersController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Models.DTOs.User;
using OnlineExamPortal.API.Repositories.Interface;
using BCrypt.Net;
using System.Security.Claims;

namespace OnlineExamPortal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserRepository _userRepository;

        public UsersController(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll()
        {
            var users = await _userRepository.GetAllAsync();  // ✅ Fixed: underscore
            // Don't send password hash
            var result = users.Select(u => new {
                u.Id,
                u.FullName,
                u.Email,
                u.UserRole,
                u.CreatedAt
            });
            return Ok(result);
        }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Allow if: user is viewing their own profile OR user is Admin
            if (currentUserId != id && currentUserRole != "Admin")
                return Forbid();  // ✅ 403 Forbidden

            var user = await _userRepository.GetByIdAsync(id);  // ✅ Fixed: underscore
            if (user == null)
                return NotFound(new { message = "User not found" });

            return Ok(new
            {
                user.Id,
                user.FullName,
                user.Email,
                user.UserRole,
                user.CreatedAt
            });
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] CreateUserRequestDto dto)
        {
            // Check if email already exists
            var existingUser = await _userRepository.GetByEmailAsync(dto.Email);
            if (existingUser != null)
                return BadRequest(new { message = "Email already registered" });

            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                UserRole = dto.UserRole,
                CreatedAt = DateTime.Now
            };

            await _userRepository.CreateAsync(user);  // ✅ Fixed: underscore
            return Ok(new { message = "User created successfully", userId = user.Id });
        }


        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequestDto dto)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Allow if: user is updating their own profile OR user is Admin
            if (currentUserId != id && currentUserRole != "Admin")
                return Forbid();

            var existingUser = await _userRepository.GetByIdAsync(id);  // ✅ Fixed: underscore
            if (existingUser == null)
                return NotFound(new { message = "User not found" });

            existingUser.FullName = dto.FullName;
            existingUser.Email = dto.Email;

            // Only Admin can change role
            if (currentUserRole == "Admin")
                existingUser.UserRole = dto.UserRole;

            await _userRepository.UpdateAsync(existingUser);  // ✅ Fixed: underscore
            return Ok(new { message = "User updated successfully" });
        }


        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var exists = await _userRepository.ExistsAsync(id);  // ✅ Fixed: underscore
            if (!exists)
                return NotFound(new { message = "User not found" });

            await _userRepository.DeleteAsync(id);  // ✅ Fixed: underscore
            return Ok(new { message = "User deleted successfully" });
        }
    }

    public class CreateUserRequestDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string UserRole { get; set; } = "Student";
    }
    public class UpdateUserRequestDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string UserRole { get; set; } = "Student";
    }
}