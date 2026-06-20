namespace OnlineExamPortal.API.Exceptions
{
    public abstract class BaseException : Exception
    {
        public int StatusCode { get; }
        public string ErrorCode { get; }
        public object? AdditionalData { get; }

        protected BaseException(string message, int statusCode, string errorCode = "", object? additionalData = null)
            : base(message)
        {
            StatusCode = statusCode;
            ErrorCode = errorCode;
            AdditionalData = additionalData;
        }
    }
}