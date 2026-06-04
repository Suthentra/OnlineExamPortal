using OnlineExamPortal.API.Models.Domain;

namespace OnlineExamPortal.API.Repositories.Interface
{
    public interface ISectionRepository
    {
        Task<List<Section>> GetByExamIdAsync(int examId);
        Task<Section> CreateAsync(Section section);
    }
}