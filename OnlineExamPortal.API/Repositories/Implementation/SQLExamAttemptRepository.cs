using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Models.DTOs.ExamAttempt;
using OnlineExamPortal.API.Repositories.Interface;
using System.Data;

namespace OnlineExamPortal.API.Repositories.Implementation
{
    public class SQLExamAttemptRepository : IExamAttemptRepository
    {
        private readonly IConfiguration _configuration;
        private readonly string _connectionString;

        public SQLExamAttemptRepository(IConfiguration configuration)
        {
            _configuration = configuration;
            _connectionString = _configuration.GetConnectionString("OnlineExamPortalConnectionString");
        }

        public async Task<ExamAttempt> StartExamAsync(int studentId, int examId)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            using SqlCommand cmd = new SqlCommand("sp_StartExam", conn);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@StudentId", studentId);
            cmd.Parameters.AddWithValue("@ExamId", examId);

            SqlParameter outputIdParam = new SqlParameter("@AttemptId", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };
            cmd.Parameters.Add(outputIdParam);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();

            int attemptId = (int)outputIdParam.Value;

            return await GetAttemptByIdAsync(attemptId);
        }

        public async Task<Answer> SubmitAnswerAsync(int attemptId, int questionId, string selectedOption)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            using SqlCommand cmd = new SqlCommand("sp_SubmitAnswer", conn);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@AttemptId", attemptId);
            cmd.Parameters.AddWithValue("@QuestionId", questionId);
            cmd.Parameters.AddWithValue("@SelectedOption", selectedOption);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();

            return new Answer
            {
                ExamAttemptId = attemptId,
                QuestionId = questionId,
                SelectedOption = selectedOption
            };
        }

        public async Task<ExamAttempt> SubmitExamAsync(int attemptId)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            using SqlCommand cmd = new SqlCommand("sp_SubmitExam", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@AttemptId", attemptId);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();

            return await GetAttemptByIdAsync(attemptId);
        }

        public async Task<ExamAttempt?> GetAttemptByIdAsync(int attemptId)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            using SqlCommand cmd = new SqlCommand("sp_GetAttemptById", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@AttemptId", attemptId);

            await conn.OpenAsync();

            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new ExamAttempt
                {
                    Id = (int)reader["Id"],
                    UserId = (int)reader["UserId"],
                    ExamId = (int)reader["ExamId"],
                    StartedAt = (DateTime)reader["StartedAt"],
                    SubmittedAt = reader["SubmittedAt"] == DBNull.Value ? DateTime.MinValue : (DateTime)reader["SubmittedAt"],
                    Score = reader["Score"] == DBNull.Value ? 0 : (int)reader["Score"],
                    Status = reader["Status"].ToString()!,
                    IsPassed = reader["IsPassed"] == DBNull.Value ? false : (bool)reader["IsPassed"],
                    Percentage = reader["Percentage"] == DBNull.Value ? 0 : (decimal)reader["Percentage"]
                };
            }

            return null;
        }

        public async Task<List<ExamAttempt>> GetAttemptsByStudentIdAsync(int studentId)
        {
            var attempts = new List<ExamAttempt>();

            using SqlConnection conn = new SqlConnection(_connectionString);
            using SqlCommand cmd = new SqlCommand("sp_GetAttemptsByStudentId", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@StudentId", studentId);

            await conn.OpenAsync();

            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                attempts.Add(new ExamAttempt
                {
                    Id = (int)reader["Id"],
                    UserId = (int)reader["UserId"],
                    ExamId = (int)reader["ExamId"],
                    StartedAt = (DateTime)reader["StartedAt"],
                    SubmittedAt = reader["SubmittedAt"] == DBNull.Value ? DateTime.MinValue : (DateTime)reader["SubmittedAt"],
                    Score = reader["Score"] == DBNull.Value ? 0 : (int)reader["Score"],
                    Status = reader["Status"].ToString()!,
                    IsPassed = reader["IsPassed"] == DBNull.Value ? false : (bool)reader["IsPassed"],
                    Percentage = reader["Percentage"] == DBNull.Value ? 0 : (decimal)reader["Percentage"]
                });
            }

            return attempts;
        }

        public async Task<bool> HasStudentAttemptedExamAsync(int studentId, int examId)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            using SqlCommand cmd = new SqlCommand("sp_HasStudentAttemptedExam", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@StudentId", studentId);
            cmd.Parameters.AddWithValue("@ExamId", examId);

            await conn.OpenAsync();
            var result = await cmd.ExecuteScalarAsync();
            return Convert.ToBoolean(result);
        }

        public async Task<ExamResultDto> CalculateResultAsync(int attemptId)
        {
            var result = new ExamResultDto();

            using SqlConnection conn = new SqlConnection(_connectionString);
            using SqlCommand cmd = new SqlCommand("sp_CalculateResult", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@AttemptId", attemptId);

            await conn.OpenAsync();

            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                result.AttemptId = attemptId;
                result.Score = (int)reader["Score"];
                result.TotalMarks = (int)reader["TotalMarks"];
                result.Percentage = (decimal)reader["Percentage"];
                result.IsPassed = (bool)reader["IsPassed"];
                result.SubmittedAt = (DateTime)reader["SubmittedAt"];
            }

            await reader.NextResultAsync();
            result.Answers = new List<AnswerResultDto>();
            while (await reader.ReadAsync())
            {
                result.Answers.Add(new AnswerResultDto
                {
                    QuestionId = (int)reader["QuestionId"],
                    QuestionText = reader["QuestionText"].ToString()!,
                    YourAnswer = reader["YourAnswer"].ToString()!,
                    CorrectAnswer = reader["CorrectAnswer"].ToString()!,
                    IsCorrect = (bool)reader["IsCorrect"],
                    MarksObtained = (int)reader["MarksObtained"]
                });
            }

            return result;
        }
    }
}