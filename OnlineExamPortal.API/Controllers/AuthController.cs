using Microsoft.AspNetCore.Mvc;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Models.DTOs.Auth;
using OnlineExamPortal.API.Repositories.Interface;
using OnlineExamPortal.API.Helpers;

namespace OnlineExamPortal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IJwtHelper _jwtHelper;

        public AuthController(IUserRepository userRepository, IJwtHelper jwtHelper)
        {
            _userRepository = userRepository;
            _jwtHelper = jwtHelper;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            // Check if email already exists
            var existingUser = await _userRepository.GetByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "Email already registered" });
            }

            // Create new user - STORE PLAIN TEXT PASSWORD
            var user = new User
            {
                FullName = request.FullName,
                Email = request.Email,
                PasswordHash = request.Password,  // Plain text - NO HASHING
                UserRole = "Student",
                CreatedAt = DateTime.Now
            };

            await _userRepository.CreateAsync(user);

            return Ok(new
            {
                message = "Registration successful",
                userId = user.Id,
                email = user.Email,
                role = user.UserRole
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            // Find user by email
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            // DIRECT STRING COMPARISON - NO BCrypt
            if (user.PasswordHash != request.Password)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            // Generate JWT token
            var token = _jwtHelper.GenerateToken(user.Id, user.Email, user.UserRole);

            var response = new LoginResponseDto
            {
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                UserRole = user.UserRole,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddHours(2)
            };

            return Ok(response);
        }
    }
}