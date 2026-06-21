using System.Net;
using System.Text.Json;
using OnlineExamPortal.API.Exceptions;
using OnlineExamPortal.API.Services;

namespace OnlineExamPortal.API.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;
        private readonly IWebHostEnvironment _environment;
        private readonly ILoggingService _loggingService;

        public ExceptionHandlingMiddleware(
            RequestDelegate next,
            ILogger<ExceptionHandlingMiddleware> logger,
            IWebHostEnvironment environment,
            ILoggingService loggingService)
        {
            _next = next;
            _logger = logger;
            _environment = environment;
            _loggingService = loggingService;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                // ✅ LOG THE EXCEPTION
                var userId = context.User?.Identity?.Name ?? "Anonymous";
                _loggingService.LogError(
                    $"Exception occurred: {ex.Message}",
                    ex,
                    new
                    {
                        Path = context.Request.Path,
                        Method = context.Request.Method,
                        UserId = userId,
                        QueryString = context.Request.QueryString.ToString(),
                        IpAddress = context.Connection.RemoteIpAddress?.ToString()
                    }
                );

                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
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

                case KeyNotFoundException:
                    response.StatusCode = 404;
                    errorResponse.StatusCode = 404;
                    errorResponse.Error = "The requested resource was not found.";
                    errorResponse.ErrorCode = "NOT_FOUND";
                    break;

                case UnauthorizedAccessException:
                    response.StatusCode = 401;
                    errorResponse.StatusCode = 401;
                    errorResponse.Error = "Authentication required.";
                    errorResponse.ErrorCode = "UNAUTHORIZED";
                    break;

                default:
                    response.StatusCode = 500;
                    errorResponse.StatusCode = 500;
                    errorResponse.Error = _environment.IsDevelopment()
                        ? exception.Message
                        : "An unexpected error occurred. Please try again later.";
                    errorResponse.ErrorCode = "INTERNAL_SERVER_ERROR";
                    break;
            }

            // Add stack trace in development
            if (_environment.IsDevelopment())
            {
                errorResponse.StackTrace = exception.StackTrace;
                errorResponse.InnerException = exception.InnerException?.Message;
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
        public object? AdditionalData { get; set; }
        public Dictionary<string, string[]>? Errors { get; set; }
        public string? StackTrace { get; set; }
        public string? InnerException { get; set; }
    }
}