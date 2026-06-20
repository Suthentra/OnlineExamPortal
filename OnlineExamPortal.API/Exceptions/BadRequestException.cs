namespace OnlineExamPortal.API.Exceptions
{
    public class BadRequestException : BaseException
    {
        public BadRequestException(string message, string errorCode = "BAD_REQUEST")
            : base(message, 400, errorCode)
        {
        }

        public BadRequestException(string message, object additionalData)
            : base(message, 400, "BAD_REQUEST", additionalData)
        {
        }
    }
}