using System.Text;
using OnlineExamPortal.API.Services;

namespace OnlineExamPortal.API.Middleware
{
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;
        private readonly IServiceScopeFactory _serviceScopeFactory;

        public RequestLoggingMiddleware(
            RequestDelegate next,
            ILogger<RequestLoggingMiddleware> logger,
            IServiceScopeFactory serviceScopeFactory)
        {
            _next = next;
            _logger = logger;
            _serviceScopeFactory = serviceScopeFactory;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var startTime = DateTime.Now;
            var request = context.Request;

            // ===== CREATE SCOPE MANUALLY (NO USING) =====
            var scope = _serviceScopeFactory.CreateScope();
            var loggingService = scope.ServiceProvider.GetRequiredService<ILoggingService>();

            // ===== READ REQUEST BODY =====
            var requestBody = await ReadRequestBodyAsync(request);
            var userId = context.User?.Identity?.Name ?? "Anonymous";

            // ===== LOG REQUEST =====
            loggingService.LogApiRequest(
                request.Path.ToString(),
                request.Method,
                new
                {
                    UserId = userId,
                    QueryString = request.QueryString.ToString(),
                    Headers = GetSensitiveHeaders(request.Headers),
                    Body = requestBody,
                    ContentType = request.ContentType,
                    ContentLength = request.ContentLength
                }
            );

            // ===== PROCESS RESPONSE =====
            var originalBodyStream = context.Response.Body;
            using var responseBodyStream = new MemoryStream();
            context.Response.Body = responseBodyStream;

            try
            {
                await _next(context);

                var elapsedTime = (DateTime.Now - startTime).TotalMilliseconds;

                responseBodyStream.Seek(0, SeekOrigin.Begin);
                var responseBody = await new StreamReader(responseBodyStream).ReadToEndAsync();
                responseBodyStream.Seek(0, SeekOrigin.Begin);
                await responseBodyStream.CopyToAsync(originalBodyStream);

                // ===== LOG RESPONSE =====
                loggingService.LogApiResponse(
                    request.Path.ToString(),
                    request.Method,
                    context.Response.StatusCode,
                    new
                    {
                        StatusCode = context.Response.StatusCode,
                        ContentType = context.Response.ContentType,
                        Body = responseBody?.Length > 5000 ? responseBody.Substring(0, 5000) + "... (truncated)" : responseBody,
                        Headers = context.Response.Headers.ToDictionary(h => h.Key, h => h.Value.ToString())
                    },
                    (long)Math.Round(elapsedTime, 0)
                );
            }
            catch (Exception ex)
            {
                var elapsedTime = (DateTime.Now - startTime).TotalMilliseconds;

                // ===== LOG ERROR =====
                loggingService.LogError($"Request failed: {request.Method} {request.Path}", ex, new
                {
                    ElapsedTimeMs = Math.Round(elapsedTime, 0),
                    Path = request.Path,
                    Method = request.Method
                });

                throw;
            }
            finally
            {
                // ===== DISPOSE SCOPE =====
                scope?.Dispose();
                context.Response.Body = originalBodyStream;
            }
        }

        private async Task<string?> ReadRequestBodyAsync(HttpRequest request)
        {
            try
            {
                if (!request.Body.CanRead) return null;

                request.EnableBuffering();
                var buffer = new byte[Convert.ToInt32(request.ContentLength ?? 0)];
                await request.Body.ReadAsync(buffer, 0, buffer.Length);
                var body = Encoding.UTF8.GetString(buffer);
                request.Body.Position = 0;

                if (body.Length > 5000)
                {
                    body = body.Substring(0, 5000) + "... (truncated)";
                }

                return body;
            }
            catch
            {
                return null;
            }
        }

        private Dictionary<string, string> GetSensitiveHeaders(IHeaderDictionary headers)
        {
            var sensitiveHeaders = new[] { "Authorization", "Cookie", "X-API-Key" };
            var result = new Dictionary<string, string>();

            foreach (var header in headers)
            {
                if (sensitiveHeaders.Contains(header.Key))
                {
                    result[header.Key] = "***REDACTED***";
                }
                else
                {
                    result[header.Key] = header.Value.ToString();
                }
            }

            return result;
        }
    }
}