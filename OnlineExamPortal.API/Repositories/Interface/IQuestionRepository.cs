using OnlineExamPortal.API.Models.Domain;
namespace OnlineExamPortal.API.Repositories.Interface
{
    public interface IQuestionRepository
    {
        Task<List<Question>> GetByExamIdAsync(int examId);
        Task<Question?> GetByIdAsync(int id);
        Task<Question> CreateAsync(Question question);
        Task UpdateAsync(Question question);
        Task DeleteAsync(int id);
        Task<bool> ExistsAsync(int id);
        Task<int> GetTotalMarksByExamIdAsync(int examId);
        Task BulkCreateAsync(List<Question> questions);
    }
}
