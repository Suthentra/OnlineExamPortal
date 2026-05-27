namespace OnlineExamPortal.API.Models.DTOs.Question
{
    public class BulkCreateQuestionDto
    {
        public List<CreateQuestionRequestDto> Questions { get; set; } = new List<CreateQuestionRequestDto>();
    }
}
