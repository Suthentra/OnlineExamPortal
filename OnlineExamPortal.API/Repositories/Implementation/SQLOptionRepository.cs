using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Repositories.Interface;

namespace OnlineExamPortal.API.Repositories.Implementation
{
    public class SQLOptionRepository : IOptionRepository
    {
        private readonly string _connectionString;

        public SQLOptionRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("OnlineExamPortalConnectionString");
        }

        public async Task<Option> CreateAsync(Option option)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = @"
                INSERT INTO Options (QuestionId, OptionText, OptionOrder, IsCorrect, CreatedAt)
                VALUES (@QuestionId, @OptionText, @OptionOrder, @IsCorrect, @CreatedAt);
                SELECT SCOPE_IDENTITY();";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@QuestionId", option.QuestionId);
            cmd.Parameters.AddWithValue("@OptionText", option.OptionText);
            cmd.Parameters.AddWithValue("@OptionOrder", option.OptionOrder);
            cmd.Parameters.AddWithValue("@IsCorrect", option.IsCorrect);
            cmd.Parameters.AddWithValue("@CreatedAt", DateTime.Now);

            await conn.OpenAsync();
            option.Id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            return option;
        }

        public async Task<List<Option>> GetByQuestionIdAsync(int questionId)
        {
            var options = new List<Option>();

            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = "SELECT * FROM Options WHERE QuestionId = @QuestionId ORDER BY OptionOrder";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@QuestionId", questionId);

            await conn.OpenAsync();
            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                options.Add(new Option
                {
                    Id = (int)reader["Id"],
                    QuestionId = (int)reader["QuestionId"],
                    OptionText = reader["OptionText"].ToString()!,
                    OptionOrder = (int)reader["OptionOrder"],
                    IsCorrect = (bool)reader["IsCorrect"],
                    CreatedAt = (DateTime)reader["CreatedAt"]
                });
            }

            return options;
        }

        public async Task UpdateAsync(Option option)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = @"
                UPDATE Options 
                SET OptionText = @OptionText, 
                    OptionOrder = @OptionOrder, 
                    IsCorrect = @IsCorrect
                WHERE Id = @Id";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@Id", option.Id);
            cmd.Parameters.AddWithValue("@OptionText", option.OptionText);
            cmd.Parameters.AddWithValue("@OptionOrder", option.OptionOrder);
            cmd.Parameters.AddWithValue("@IsCorrect", option.IsCorrect);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task DeleteByQuestionIdAsync(int questionId)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = "DELETE FROM Options WHERE QuestionId = @QuestionId";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@QuestionId", questionId);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }
    }
}