using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Models.DTOs.ExamAttempt;

namespace OnlineExamPortal.API.Repositories.Interface
{
    public interface IExamAttemptRepository
    {
        Task<ExamAttempt> StartExamAsync(int studentId, int examId);
        Task<Answer> SubmitAnswerAsync(int attemptId, int questionId, string selectedOption);
        Task<ExamAttempt> SubmitExamAsync(int attemptId);
        Task<ExamAttempt?> GetAttemptByIdAsync(int attemptId);
        Task<List<ExamAttempt>> GetAttemptsByStudentIdAsync(int studentId);
        Task<bool> HasStudentAttemptedExamAsync(int studentId, int examId);
        Task<ExamResultDto> CalculateResultAsync(int attemptId);
    }
}