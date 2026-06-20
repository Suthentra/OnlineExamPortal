namespace OnlineExamPortal.API.Exceptions
{
    public class ForbiddenException : BaseException
    {
        public ForbiddenException(string message = "You don't have permission to access this resource", string errorCode = "FORBIDDEN")
            : base(message, 403, errorCode)
        {
        }
    }
}