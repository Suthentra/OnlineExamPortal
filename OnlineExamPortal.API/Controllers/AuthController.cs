using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineExamPortal.API.Exceptions;
using OnlineExamPortal.API.Helpers;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Models.DTOs.Auth;
using OnlineExamPortal.API.Repositories.Interface;
using OnlineExamPortal.API.Services;

namespace OnlineExamPortal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IJwtHelper _jwtHelper;
        private readonly ILoggingService _loggingService;
        public AuthController(IUserRepository userRepository, IJwtHelper jwtHelper, ILoggingService loggingService)
        {
            _userRepository = userRepository;
            _jwtHelper = jwtHelper;
            _loggingService = loggingService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            _loggingService.LogInformation($"Registration attempt for email: {request.Email}");
            // ===== CHECK IF EMAIL EXISTS =====
            var existingUser = await _userRepository.GetByEmailAsync(request.Email);
            if (existingUser != null)
            {
                _loggingService.LogSecurityEvent("RegistrationFailed", $"Email already registered: {request.Email}");
                throw new ConflictException("Email already registered. Please use a different email or login.");
            }

            // ===== VALIDATE EMAIL FORMAT =====
            if (!IsValidEmail(request.Email))
            {
                Console.WriteLine($"🔴 Invalid email format: {request.Email}");
                // ✅ THROW exception - NOT return
                throw new BadRequestException("Please enter a valid email address.");
            }

            // ===== CREATE USER =====
            var user = new User
            {
                FullName = request.FullName,
                Email = request.Email,
                PasswordHash = request.Password,
                UserRole = "Student",
                CreatedAt = DateTime.Now
            };

            await _userRepository.CreateAsync(user);
            Console.WriteLine($"✅ User created successfully: {request.Email}");

            return Ok(new
            {
                message = "Registration successful",
                userId = user.Id,
                email = user.Email,
                role = user.UserRole
            });
        }

        [HttpGet("check-email/{email}")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckEmailAvailability(string email)
        {
            // This one is fine - it's supposed to return a response
            var user = await _userRepository.GetByEmailAsync(email);
            return Ok(new { available = user == null });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            Console.WriteLine($"📝 Login called for email: {request.Email}");

            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                Console.WriteLine($"🔴 User not found: {request.Email}");
                // ✅ THROW exception - NOT return
                throw new UnauthorizedException("Invalid email or password");
            }

            if (user.PasswordHash != request.Password)
            {
                Console.WriteLine($"🔴 Invalid password for: {request.Email}");
                // ✅ THROW exception - NOT return
                throw new UnauthorizedException("Invalid email or password");
            }

            var token = _jwtHelper.GenerateToken(user.Id, user.Email, user.UserRole);

            Console.WriteLine($"✅ Login successful: {request.Email}");
            return Ok(new LoginResponseDto
            {
                UserId = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                UserRole = user.UserRole,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddHours(2)
            });
        }

        // ===== TEST ENDPOINT - REMOVE AFTER TESTING =====
        [HttpGet("test-exception")]
        [AllowAnonymous]
        public IActionResult TestException()
        {
            Console.WriteLine("🔴 Test exception triggered!");
            throw new BadRequestException("TEST: This is a test exception!");
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }
    }
}