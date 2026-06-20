namespace OnlineExamPortal.API.Exceptions
{
    public class UnauthorizedException : BaseException
    {
        public UnauthorizedException(string message = "Authentication required", string errorCode = "UNAUTHORIZED")
            : base(message, 401, errorCode)
        {
        }
    }
}