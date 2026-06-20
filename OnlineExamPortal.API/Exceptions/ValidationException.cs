namespace OnlineExamPortal.API.Exceptions
{
    public class ValidationException : BaseException
    {
        public Dictionary<string, string[]> Errors { get; }

        public ValidationException(string message, Dictionary<string, string[]>? errors = null)
            : base(message, 400, "VALIDATION_ERROR")
        {
            Errors = errors ?? new Dictionary<string, string[]>();
        }

        public ValidationException(string message, string field, string error)
            : base(message, 400, "VALIDATION_ERROR")
        {
            Errors = new Dictionary<string, string[]>
            {
                { field, new[] { error } }
            };
        }
    }
}