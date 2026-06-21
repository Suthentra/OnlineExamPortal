namespace OnlineExamPortal.API.Services
{
    public interface ILoggingService
    {
        // Basic logging methods
        void LogInformation(string message, object? additionalData = null);
        void LogWarning(string message, object? additionalData = null);
        void LogError(string message, Exception? exception = null, object? additionalData = null);
        void LogDebug(string message, object? additionalData = null);

        // API logging
        void LogApiRequest(string endpoint, string method, object? requestData = null);
        void LogApiResponse(string endpoint, string method, int statusCode, object? responseData = null, long elapsedTimeMs = 0);

        // Database logging
        void LogDatabaseQuery(string query, object? parameters = null, long executionTimeMs = 0);

        // User action logging
        void LogUserAction(int userId, string action, string? details = null);

        // Security logging
        void LogSecurityEvent(string eventType, string? details = null, string? ipAddress = null);

        // Business event logging
        void LogBusinessEvent(string eventType, string message, object? data = null);
    }
}