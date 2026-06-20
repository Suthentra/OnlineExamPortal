using System.Net;
using System.Text.Json;
using OnlineExamPortal.API.Exceptions;

namespace OnlineExamPortal.API.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;
        private readonly IWebHostEnvironment _environment;

        public ExceptionHandlingMiddleware(
            RequestDelegate next,
            ILogger<ExceptionHandlingMiddleware> logger,
            IWebHostEnvironment environment)
        {
            _next = next;
            _logger = logger;
            _environment = environment;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                Console.WriteLine("🔵 ExceptionHandlingMiddleware: Request started"); // ← ADD THIS DEBUG
                await _next(context);
                Console.WriteLine("🟢 ExceptionHandlingMiddleware: Request completed successfully");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"🔴 ExceptionHandlingMiddleware: Exception caught! {ex.Message}"); // ← ADD THIS DEBUG
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            Console.WriteLine($"🔴 HANDLING EXCEPTION: {exception.Message}"); // ← ADD THIS DEBUG
            Console.WriteLine($"🔴 STACK TRACE: {exception.StackTrace}"); // ← ADD THIS DEBUG

            var response = context.Response;
            response.ContentType = "application/json";

            var errorResponse = new ErrorResponse
            {
                Timestamp = DateTime.UtcNow,
                Path = context.Request.Path,
                Method = context.Request.Method
            };

            switch (exception)
            {
                case BaseException baseEx:
                    response.StatusCode = baseEx.StatusCode;
                    errorResponse.StatusCode = baseEx.StatusCode;
                    errorResponse.Error = baseEx.Message;
                    errorResponse.ErrorCode = baseEx.ErrorCode;
                    break;

                default:
                    response.StatusCode = 500;
                    errorResponse.StatusCode = 500;
                    errorResponse.Error = "An unexpected error occurred.";
                    errorResponse.ErrorCode = "INTERNAL_SERVER_ERROR";
                    break;
            }

            var jsonResponse = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            });

            await response.WriteAsync(jsonResponse);
        }
    }

    public class ErrorResponse
    {
        public int StatusCode { get; set; }
        public string? Error { get; set; }
        public string? ErrorCode { get; set; }
        public DateTime Timestamp { get; set; }
        public string? Path { get; set; }
        public string? Method { get; set; }
    }
}