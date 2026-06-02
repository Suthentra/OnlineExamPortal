using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Repositories.Interface;

namespace OnlineExamPortal.API.Repositories.Implementation
{
    public class SQLExamRepository : IExamRepository
    {
        private readonly IConfiguration configuration;
        private readonly string connectionString;  // ← ADD THIS at class level

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
                    TotalQuestions = reader["TotalQuestions"] != DBNull.Value ? (int)reader["TotalQuestions"] : 0
                });
            }

            return exams;
        }

        public async Task<Exam?> GetByIdAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_GetExamById", conn);
            cmd.CommandType = System.Data.CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();

            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new Exam
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
            cmd.CommandType = System.Data.CommandType.StoredProcedure;

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
            using SqlCommand cmd = new SqlCommand("sp_DeleteExam", conn);
            cmd.CommandType = System.Data.CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
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