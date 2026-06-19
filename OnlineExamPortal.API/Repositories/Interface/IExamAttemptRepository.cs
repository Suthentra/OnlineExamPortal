using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Models.DTOs.ExamAttempt;
using OnlineExamPortal.API.Models.DTOs.Result;

namespace OnlineExamPortal.API.Repositories.Interface
{
    public interface IExamAttemptRepository
    {
        Task<ExamAttempt> StartExamAsync(int studentId, int examId);
        Task<Answer> SubmitAnswerAsync(int attemptId, int questionId, List<int> selectedOptionIds);  // ← Changed from string to List<int>
        Task<ExamAttempt> SubmitExamAsync(int attemptId);
        Task<ExamAttempt?> GetAttemptByIdAsync(int attemptId);
        Task<List<ExamAttempt>> GetAttemptsByStudentIdAsync(int studentId);
        Task<bool> HasStudentAttemptedExamAsync(int studentId, int examId);
        Task<ExamResultDto> CalculateResultAsync(int attemptId);
        Task<List<StudentResultDto>> GetResultsByExamIdAsync(int examId);
    }
}