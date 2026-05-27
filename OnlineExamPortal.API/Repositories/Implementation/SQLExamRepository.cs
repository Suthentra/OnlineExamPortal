using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Repositories.Interface;

namespace OnlineExamPortal.API.Repositories.Implementation
{
    public class SQLExamRepository : IExamRepository
    {
        private readonly IConfiguration configuration;

        public SQLExamRepository(IConfiguration configuration)
        {
            this.configuration = configuration;
        }

        public async Task<List<Exam>> GetAllAsync()
        {
            var exams = new List<Exam>();

            var connectionString = configuration
                .GetConnectionString("OnlineExamPortalConnectionString");

            using SqlConnection connection =
                new SqlConnection(connectionString);

            using SqlCommand command =
                new SqlCommand("sp_GetAllExams", connection);

            command.CommandType =
                System.Data.CommandType.StoredProcedure;

            await connection.OpenAsync();

            using SqlDataReader reader =
                await command.ExecuteReaderAsync();

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

        public async Task<Exam?> GetByIdAsync(int id)
        {
            var connectionString = configuration
                .GetConnectionString("OnlineExamPortalConnectionString");

            using SqlConnection connection =
                new SqlConnection(connectionString);

            using SqlCommand command =
                new SqlCommand("sp_GetExamById", connection);

            command.CommandType =
                System.Data.CommandType.StoredProcedure;

            command.Parameters.AddWithValue("@Id", id);

            await connection.OpenAsync();

            using SqlDataReader reader =
                await command.ExecuteReaderAsync();

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
            var connectionString = configuration
                .GetConnectionString("OnlineExamPortalConnectionString");

            using SqlConnection connection =
                new SqlConnection(connectionString);

            using SqlCommand command =
                new SqlCommand("sp_CreateExam", connection);

            command.CommandType =
                System.Data.CommandType.StoredProcedure;

            command.Parameters.AddWithValue("@Title", exam.Title);

            command.Parameters.AddWithValue("@Description", exam.Description);

            command.Parameters.AddWithValue("@TotalMarks", exam.TotalMarks);

            command.Parameters.AddWithValue("@DurationInMinutes",
                exam.DurationInMinutes);

            command.Parameters.AddWithValue("@StartTime", exam.StartTime);

            command.Parameters.AddWithValue("@EndTime", exam.EndTime);

            command.Parameters.AddWithValue("@UserId", exam.UserId);

            await connection.OpenAsync();

            await command.ExecuteNonQueryAsync();
        }

        public async Task UpdateAsync(Exam exam)
        {
            var connectionString = configuration
                .GetConnectionString("OnlineExamPortalConnectionString");

            using SqlConnection connection = new SqlConnection(connectionString);
            using SqlCommand command = new SqlCommand("sp_UpdateExam", connection);
            command.CommandType = System.Data.CommandType.StoredProcedure;

            command.Parameters.AddWithValue("@Id", exam.Id);
            command.Parameters.AddWithValue("@Title", exam.Title);
            command.Parameters.AddWithValue("@Description", exam.Description);
            command.Parameters.AddWithValue("@TotalMarks", exam.TotalMarks);
            command.Parameters.AddWithValue("@DurationInMinutes", exam.DurationInMinutes);
            command.Parameters.AddWithValue("@StartTime", exam.StartTime);
            command.Parameters.AddWithValue("@EndTime", exam.EndTime);
            command.Parameters.AddWithValue("@IsPublished", exam.IsPublished);

            await connection.OpenAsync();
            await command.ExecuteNonQueryAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var connectionString = configuration
                .GetConnectionString("OnlineExamPortalConnectionString");

            using SqlConnection connection = new SqlConnection(connectionString);
            using SqlCommand command = new SqlCommand("sp_DeleteExam", connection);
            command.CommandType = System.Data.CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@Id", id);

            await connection.OpenAsync();
            await command.ExecuteNonQueryAsync();
        }

        public async Task PublishAsync(int id)
        {
            var connectionString = configuration
                .GetConnectionString("OnlineExamPortalConnectionString");

            using SqlConnection connection = new SqlConnection(connectionString);
            using SqlCommand command = new SqlCommand("sp_PublishExam", connection);
            command.CommandType = System.Data.CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@Id", id);

            await connection.OpenAsync();
            await command.ExecuteNonQueryAsync();
        }

        public async Task<bool> ExistsAsync(int id)
        {
            var connectionString = configuration
                .GetConnectionString("OnlineExamPortalConnectionString");

            using SqlConnection connection = new SqlConnection(connectionString);
            using SqlCommand command = new SqlCommand("sp_ExamExists", connection);
            command.CommandType = System.Data.CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@Id", id);

            await connection.OpenAsync();
            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result) > 0;
        }

        public async Task<List<Exam>> GetPublishedExamsAsync()
        {
            var exams = new List<Exam>();
            var connectionString = configuration
                .GetConnectionString("OnlineExamPortalConnectionString");

            using SqlConnection connection = new SqlConnection(connectionString);
            using SqlCommand command = new SqlCommand("sp_GetPublishedExams", connection);
            command.CommandType = System.Data.CommandType.StoredProcedure;

            await connection.OpenAsync();
            using SqlDataReader reader = await command.ExecuteReaderAsync();

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