namespace OnlineExamPortal.API.Exceptions
{
    public class ConflictException : BaseException
    {
        public ConflictException(string message, string errorCode = "CONFLICT")
            : base(message, 409, errorCode)
        {
        }
    }
}