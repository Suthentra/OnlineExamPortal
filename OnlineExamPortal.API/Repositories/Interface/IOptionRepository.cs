using OnlineExamPortal.API.Models.Domain;

namespace OnlineExamPortal.API.Repositories.Interface
{
    public interface IOptionRepository
    {
        Task<Option> CreateAsync(Option option);
        Task<List<Option>> GetByQuestionIdAsync(int questionId);
        Task UpdateAsync(Option option);
        Task DeleteByQuestionIdAsync(int questionId);
    }
}