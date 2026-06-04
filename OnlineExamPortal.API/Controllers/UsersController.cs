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
    [Authorize]  // ✅ All endpoints require authentication
    public class UsersController : ControllerBase
    {
        private readonly IUserRepository userRepository;

        public UsersController(IUserRepository userRepository)
        {
            this.userRepository = userRepository;
        }

        // GET: api/Users - Only Admin can see all users
        [HttpGet]
        [Authorize(Roles = "Admin")]  // ✅ Only Admin
        public async Task<IActionResult> GetAll()
        {
            var users = await userRepository.GetAllAsync();
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
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequestDto request)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var user = await _userRepository.GetByIdAsync(userId);

            if (user == null)
                return NotFound(new { message = "User not found" });

            if (user.PasswordHash != request.CurrentPassword)
            {
                return BadRequest(new { message = "Current password is incorrect" });
            }

            user.PasswordHash = request.NewPassword;
            await _userRepository.UpdateAsync(user);

            return Ok(new { message = "Password changed successfully" });
        }

        public class ChangePasswordRequestDto
        {
            public string CurrentPassword { get; set; }
            public string NewPassword { get; set; }
        }
        // GET: api/Users/{id} - Users can see their own profile, Admin can see any
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Allow if: user is viewing their own profile OR user is Admin
            if (currentUserId != id && currentUserRole != "Admin")
                return Forbid();  // ✅ 403 Forbidden

            var user = await userRepository.GetByIdAsync(id);
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

        // POST: api/Users - Only Admin can create users
        [HttpPost]
        [Authorize(Roles = "Admin")]  // ✅ Only Admin
        public async Task<IActionResult> Create([FromBody] CreateUserRequestDto dto)
        {
            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                UserRole = dto.UserRole,
                CreatedAt = DateTime.Now
            };

            await userRepository.CreateAsync(user);
            return Ok(new { message = "User created successfully", userId = user.Id });
        }

        // PUT: api/Users/{id} - Users can update themselves, Admin can update any
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequestDto dto)
        {
            var currentUserId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
            var currentUserRole = User.FindFirst(ClaimTypes.Role)?.Value;

            // Allow if: user is updating their own profile OR user is Admin
            if (currentUserId != id && currentUserRole != "Admin")
                return Forbid();

            var existingUser = await userRepository.GetByIdAsync(id);
            if (existingUser == null)
                return NotFound(new { message = "User not found" });

            existingUser.FullName = dto.FullName;
            existingUser.Email = dto.Email;

            // Only Admin can change role
            if (currentUserRole == "Admin")
                existingUser.UserRole = dto.UserRole;

            await userRepository.UpdateAsync(existingUser);
            return Ok(new { message = "User updated successfully" });
        }

        // DELETE: api/Users/{id} - Only Admin can delete
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var exists = await userRepository.ExistsAsync(id);
            if (!exists)
                return NotFound(new { message = "User not found" });

            await userRepository.DeleteAsync(id);
            return Ok(new { message = "User deleted successfully" });
        }
    }
}