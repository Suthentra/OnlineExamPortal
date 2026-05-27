using OnlineExamPortal.API.Models.Domain;

namespace OnlineExamPortal.API.Repositories.Interface
{
    public interface IUserRepository
    {
        Task<List<User>> GetAllAsync();
        Task<User?> GetByIdAsync(int id);
        Task<User?> GetByEmailAsync(string email);  
        Task CreateAsync(User user);
        Task UpdateAsync(User user);  
        Task DeleteAsync(int id);
        Task<bool> ExistsAsync(int id);
    }
}