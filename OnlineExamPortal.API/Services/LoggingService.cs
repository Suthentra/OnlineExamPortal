using System.Text;
using System.Text.Json;

namespace OnlineExamPortal.API.Services
{
    public class LoggingService : ILoggingService
    {
        private readonly ILogger<LoggingService> _logger;
        private readonly string _logDirectory;
        private readonly object _lock = new object();
        private readonly int _maxFileSizeMB = 10;
        private readonly int _retainDays = 30;

        public LoggingService(ILogger<LoggingService> logger, IWebHostEnvironment environment)
        {
            _logger = logger;
            _logDirectory = Path.Combine(environment.ContentRootPath, "Logs");

            // Create Logs directory if it doesn't exist
            if (!Directory.Exists(_logDirectory))
            {
                Directory.CreateDirectory(_logDirectory);
            }

            // Clean old logs on startup
            CleanOldLogs();
        }

        public void LogInformation(string message, object? additionalData = null)
        {
            _logger.LogInformation(message);
            WriteToFile("INFO", message, additionalData);
        }

        public void LogWarning(string message, object? additionalData = null)
        {
            _logger.LogWarning(message);
            WriteToFile("WARN", message, additionalData);
        }

        public void LogError(string message, Exception? exception = null, object? additionalData = null)
        {
            if (exception != null)
            {
                _logger.LogError(exception, message);
            }
            else
            {
                _logger.LogError(message);
            }
            WriteToFile("ERROR", message, additionalData, exception);
        }

        public void LogDebug(string message, object? additionalData = null)
        {
            _logger.LogDebug(message);
            WriteToFile("DEBUG", message, additionalData);
        }

        public void LogApiRequest(string endpoint, string method, object? requestData = null)
        {
            var message = $"API Request: {method} {endpoint}";
            _logger.LogInformation(message);
            WriteToFile("API-REQ", message, new
            {
                Endpoint = endpoint,
                Method = method,
                Data = requestData,
                Timestamp = DateTime.UtcNow
            });
        }

        public void LogApiResponse(string endpoint, string method, int statusCode, object? responseData = null, long elapsedTimeMs = 0)
        {
            var message = $"API Response: {method} {endpoint} - Status: {statusCode} ({elapsedTimeMs}ms)";
            _logger.LogInformation(message);
            WriteToFile("API-RES", message, new
            {
                Endpoint = endpoint,
                Method = method,
                StatusCode = statusCode,
                Data = responseData,
                ElapsedTimeMs = elapsedTimeMs,
                Timestamp = DateTime.UtcNow
            });
        }

        public void LogDatabaseQuery(string query, object? parameters = null, long executionTimeMs = 0)
        {
            var truncatedQuery = query.Length > 200 ? query.Substring(0, 200) + "..." : query;
            var message = $"Database Query: {truncatedQuery} ({executionTimeMs}ms)";
            _logger.LogDebug(message);
            WriteToFile("DB", message, new
            {
                Query = query,
                Parameters = parameters,
                ExecutionTimeMs = executionTimeMs,
                Timestamp = DateTime.UtcNow
            });
        }

        public void LogUserAction(int userId, string action, string? details = null)
        {
            var message = $"User Action: UserId={userId}, Action={action}";
            _logger.LogInformation(message);
            WriteToFile("USER", message, new
            {
                UserId = userId,
                Action = action,
                Details = details,
                Timestamp = DateTime.UtcNow
            });
        }

        public void LogSecurityEvent(string eventType, string? details = null, string? ipAddress = null)
        {
            var message = $"Security Event: {eventType}";
            _logger.LogWarning(message);
            WriteToFile("SECURITY", message, new
            {
                EventType = eventType,
                Details = details,
                IpAddress = ipAddress,
                Timestamp = DateTime.UtcNow
            });
        }

        public void LogBusinessEvent(string eventType, string message, object? data = null)
        {
            var logMessage = $"Business Event: {eventType} - {message}";
            _logger.LogInformation(logMessage);
            WriteToFile("BUSINESS", logMessage, new
            {
                EventType = eventType,
                Message = message,
                Data = data,
                Timestamp = DateTime.UtcNow
            });
        }

        private void WriteToFile(string level, string message, object? additionalData = null, Exception? exception = null)
        {
            try
            {
                lock (_lock)
                {
                    var date = DateTime.Now;
                    var fileName = $"log-{date:yyyy-MM-dd}.txt";
                    var filePath = Path.Combine(_logDirectory, fileName);

                    // Check file size and rotate if needed
                    if (File.Exists(filePath))
                    {
                        var fileInfo = new FileInfo(filePath);
                        if (fileInfo.Length > _maxFileSizeMB * 1024 * 1024)
                        {
                            var backupPath = Path.Combine(_logDirectory, $"log-{date:yyyy-MM-dd-HH-mm}.txt");
                            File.Move(filePath, backupPath);
                        }
                    }

                    var logEntry = new StringBuilder();
                    logEntry.AppendLine($"================================================================================");
                    logEntry.AppendLine($"Timestamp: {date:yyyy-MM-dd HH:mm:ss.fff}");
                    logEntry.AppendLine($"Level: {level}");
                    logEntry.AppendLine($"Message: {message}");

                    if (additionalData != null)
                    {
                        try
                        {
                            var json = JsonSerializer.Serialize(additionalData, new JsonSerializerOptions
                            {
                                WriteIndented = true,
                                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                            });
                            logEntry.AppendLine($"Data: {json}");
                        }
                        catch
                        {
                            logEntry.AppendLine($"Data: {additionalData}");
                        }
                    }

                    if (exception != null)
                    {
                        logEntry.AppendLine($"Exception Type: {exception.GetType().Name}");
                        logEntry.AppendLine($"Exception Message: {exception.Message}");
                        logEntry.AppendLine($"Stack Trace: {exception.StackTrace}");
                        if (exception.InnerException != null)
                        {
                            logEntry.AppendLine($"Inner Exception: {exception.InnerException.Message}");
                            logEntry.AppendLine($"Inner Stack Trace: {exception.InnerException.StackTrace}");
                        }
                    }

                    logEntry.AppendLine($"================================================================================");
                    logEntry.AppendLine();

                    File.AppendAllText(filePath, logEntry.ToString());
                }
            }
            catch (Exception ex)
            {
                // Fallback to console if file writing fails
                Console.WriteLine($"❌ Failed to write log to file: {ex.Message}");
            }
        }

        private void CleanOldLogs()
        {
            try
            {
                var cutoffDate = DateTime.Now.AddDays(-_retainDays);
                var files = Directory.GetFiles(_logDirectory, "log-*.txt");

                foreach (var file in files)
                {
                    var fileInfo = new FileInfo(file);
                    if (fileInfo.CreationTime < cutoffDate)
                    {
                        fileInfo.Delete();
                        Console.WriteLine($"🗑️ Deleted old log file: {fileInfo.Name}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Failed to clean old logs: {ex.Message}");
            }
        }
    }
}