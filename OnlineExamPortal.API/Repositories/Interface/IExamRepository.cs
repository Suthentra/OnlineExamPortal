using OnlineExamPortal.API.Models.Domain;

namespace OnlineExamPortal.API.Repositories.Interface
{
    public interface IExamRepository
    {
        Task<List<Exam>> GetAllAsync();
        Task<Exam?> GetByIdAsync(int id);
        Task CreateAsync(Exam exam);
        Task UpdateAsync(Exam exam);
        Task DeleteAsync(int id);
        Task PublishAsync(int id);
        Task<bool> ExistsAsync(int id);
        Task<List<Exam>> GetPublishedExamsAsync();
        Task MarkResultsPublishedAsync(int examId);  // ← Keep only the method signature
    }
}