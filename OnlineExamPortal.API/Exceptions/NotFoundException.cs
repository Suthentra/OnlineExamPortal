namespace OnlineExamPortal.API.Exceptions
{
    public class NotFoundException : BaseException
    {
        public NotFoundException(string message, string errorCode = "NOT_FOUND")
            : base(message, 404, errorCode)
        {
        }

        public NotFoundException(string entityName, int id)
            : base($"{entityName} with ID {id} not found.", 404, "NOT_FOUND")
        {
        }

    }
}