using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Repositories.Interface;
using System.Data;

namespace OnlineExamPortal.API.Repositories.Implementation
{
    public class SQLExamRepository : IExamRepository
    {
        private readonly IConfiguration configuration;
        private readonly string connectionString;  

        public SQLExamRepository(IConfiguration configuration)
        {
            this.configuration = configuration;
            connectionString = configuration.GetConnectionString("OnlineExamPortalConnectionString");  // ← ADD THIS
        }

        public async Task<List<Exam>> GetAllAsync()
        {
            var exams = new List<Exam>();

            using SqlConnection conn = new SqlConnection(connectionString);  // ← Now it works
            string sql = @"
                SELECT 
                    e.*, 
                    (SELECT COUNT(*) FROM Questions WHERE ExamId = e.Id) AS TotalQuestions
                FROM Exams e
            ";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            await conn.OpenAsync();

            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                exams.Add(new Exam
                {
                    Id = (int)reader["Id"],
                    Title = reader["Title"].ToString()!,
                    Description = reader["Description"].ToString()!,
                    TotalMarks = (int)reader["TotalMarks"],
                    DurationInMinutes = (int)reader["DurationInMinutes"],
                    IsPublished = (bool)reader["IsPublished"],
                    CreatedAt = (DateTime)reader["CreatedAt"],
                    UserId = (int)reader["UserId"],
                    
                });
            }

            return exams;
        }

        public async Task<Exam?> GetByIdAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_GetExamById", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();

            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                var exam = new Exam
                {
                    Id = Convert.ToInt32(reader["Id"]),
                    Title = reader["Title"]?.ToString() ?? string.Empty,
                    Description = reader["Description"]?.ToString() ?? string.Empty,
                    TotalMarks = Convert.ToInt32(reader["TotalMarks"]),
                    DurationInMinutes = Convert.ToInt32(reader["DurationInMinutes"]),
                    StartTime = Convert.ToDateTime(reader["StartTime"]),
                    EndTime = Convert.ToDateTime(reader["EndTime"]),
                    IsPublished = Convert.ToBoolean(reader["IsPublished"]),
                    CreatedAt = Convert.ToDateTime(reader["CreatedAt"]),
                    UserId = Convert.ToInt32(reader["UserId"])
                };

                return exam;
            }

            return null;
        }

        public async Task CreateAsync(Exam exam)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_CreateExam", conn);
            cmd.CommandType = System.Data.CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@Title", exam.Title);
            cmd.Parameters.AddWithValue("@Description", exam.Description);
            cmd.Parameters.AddWithValue("@TotalMarks", exam.TotalMarks);
            cmd.Parameters.AddWithValue("@DurationInMinutes", exam.DurationInMinutes);
            cmd.Parameters.AddWithValue("@StartTime", exam.StartTime);
            cmd.Parameters.AddWithValue("@EndTime", exam.EndTime);
            cmd.Parameters.AddWithValue("@UserId", exam.UserId);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task UpdateAsync(Exam exam)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_UpdateExam", conn);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@Id", exam.Id);
            cmd.Parameters.AddWithValue("@Title", exam.Title);
            cmd.Parameters.AddWithValue("@Description", exam.Description);
            cmd.Parameters.AddWithValue("@TotalMarks", exam.TotalMarks);
            cmd.Parameters.AddWithValue("@DurationInMinutes", exam.DurationInMinutes);
            cmd.Parameters.AddWithValue("@StartTime", exam.StartTime);
            cmd.Parameters.AddWithValue("@EndTime", exam.EndTime);
            cmd.Parameters.AddWithValue("@IsPublished", exam.IsPublished);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task DeleteAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            await conn.OpenAsync();

            using (SqlTransaction transaction = conn.BeginTransaction())
            {
                try
                {
                    // 1. Delete answers for questions of this exam
                    string deleteAnswersSql = @"
                DELETE FROM Answers 
                WHERE QuestionId IN (SELECT Id FROM Questions WHERE ExamId = @ExamId)
            ";
                    using SqlCommand cmdAnswers = new SqlCommand(deleteAnswersSql, conn, transaction);
                    cmdAnswers.Parameters.AddWithValue("@ExamId", id);
                    await cmdAnswers.ExecuteNonQueryAsync();

                    // 2. Delete questions of this exam
                    string deleteQuestionsSql = "DELETE FROM Questions WHERE ExamId = @ExamId";
                    using SqlCommand cmdQuestions = new SqlCommand(deleteQuestionsSql, conn, transaction);
                    cmdQuestions.Parameters.AddWithValue("@ExamId", id);
                    await cmdQuestions.ExecuteNonQueryAsync();

                    // 3. Delete exam attempts for this exam
                    string deleteAttemptsSql = "DELETE FROM ExamAttempts WHERE ExamId = @ExamId";
                    using SqlCommand cmdAttempts = new SqlCommand(deleteAttemptsSql, conn, transaction);
                    cmdAttempts.Parameters.AddWithValue("@ExamId", id);
                    await cmdAttempts.ExecuteNonQueryAsync();

                    // 4. Finally delete the exam
                    string deleteExamSql = "DELETE FROM Exams WHERE Id = @ExamId";
                    using SqlCommand cmdExam = new SqlCommand(deleteExamSql, conn, transaction);
                    cmdExam.Parameters.AddWithValue("@ExamId", id);
                    await cmdExam.ExecuteNonQueryAsync();

                    transaction.Commit();
                }
                catch
                {
                    transaction.Rollback();
                    throw;
                }
            }
        }
        public async Task PublishAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_PublishExam", conn);
            cmd.CommandType = System.Data.CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<bool> ExistsAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_ExamExists", conn);
            cmd.CommandType = System.Data.CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();
            var result = await cmd.ExecuteScalarAsync();
            return Convert.ToInt32(result) > 0;
        }

        public async Task<List<Exam>> GetPublishedExamsAsync()
        {
            var exams = new List<Exam>();

            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_GetPublishedExams", conn);
            cmd.CommandType = System.Data.CommandType.StoredProcedure;

            await conn.OpenAsync();
            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                var exam = new Exam
                {
                    Id = Convert.ToInt32(reader["Id"]),
                    Title = reader["Title"].ToString()!,
                    Description = reader["Description"].ToString()!,
                    TotalMarks = Convert.ToInt32(reader["TotalMarks"]),
                    DurationInMinutes = Convert.ToInt32(reader["DurationInMinutes"]),
                    StartTime = Convert.ToDateTime(reader["StartTime"]),
                    EndTime = Convert.ToDateTime(reader["EndTime"]),
                    IsPublished = Convert.ToBoolean(reader["IsPublished"]),
                    CreatedAt = Convert.ToDateTime(reader["CreatedAt"]),
                    UserId = Convert.ToInt32(reader["UserId"])
                };
                exams.Add(exam);
            }

            return exams;
        }
    }
}