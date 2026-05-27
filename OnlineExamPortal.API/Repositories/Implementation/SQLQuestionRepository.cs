using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Repositories.Interface;
using System.Data;

namespace OnlineExamPortal.API.Repositories.Implementation
{
    public class SQLQuestionRepository : IQuestionRepository
    {
        private readonly IConfiguration configuration;
        private readonly string connectionString;

        public SQLQuestionRepository(IConfiguration configuration)
        {
            this.configuration = configuration;
            connectionString = configuration.GetConnectionString("OnlineExamPortalConnectionString");
        }

        public async Task<List<Question>> GetByExamIdAsync(int examId)
        {
            var questions = new List<Question>();

            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_GetQuestionsByExamId", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ExamId", examId);

            await conn.OpenAsync();

            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                questions.Add(new Question
                {
                    Id = (int)reader["Id"],
                    QuestionText = reader["QuestionText"].ToString()!,
                    OptionA = reader["OptionA"].ToString()!,
                    OptionB = reader["OptionB"].ToString()!,
                    OptionC = reader["OptionC"].ToString()!,
                    OptionD = reader["OptionD"].ToString()!,
                    CorrectAnswer = reader["CorrectAnswer"].ToString()!,
                    Marks = (int)reader["Marks"],
                    CreatedAt = (DateTime)reader["CreatedAt"],
                    ExamId = (int)reader["ExamId"]
                });
            }

            return questions;
        }

        public async Task<Question?> GetByIdAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_GetQuestionById", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();

            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new Question
                {
                    Id = (int)reader["Id"],
                    QuestionText = reader["QuestionText"].ToString()!,
                    OptionA = reader["OptionA"].ToString()!,
                    OptionB = reader["OptionB"].ToString()!,
                    OptionC = reader["OptionC"].ToString()!,
                    OptionD = reader["OptionD"].ToString()!,
                    CorrectAnswer = reader["CorrectAnswer"].ToString()!,
                    Marks = (int)reader["Marks"],
                    CreatedAt = (DateTime)reader["CreatedAt"],
                    ExamId = (int)reader["ExamId"]
                };
            }

            return null;
        }

        public async Task<Question> CreateAsync(Question question)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_CreateQuestion", conn);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@QuestionText", question.QuestionText);
            cmd.Parameters.AddWithValue("@OptionA", question.OptionA);
            cmd.Parameters.AddWithValue("@OptionB", question.OptionB);
            cmd.Parameters.AddWithValue("@OptionC", question.OptionC);
            cmd.Parameters.AddWithValue("@OptionD", question.OptionD);
            cmd.Parameters.AddWithValue("@CorrectAnswer", question.CorrectAnswer);
            cmd.Parameters.AddWithValue("@Marks", question.Marks);
            cmd.Parameters.AddWithValue("@ExamId", question.ExamId);

            SqlParameter outputIdParam = new SqlParameter("@NewId", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };
            cmd.Parameters.Add(outputIdParam);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();

            question.Id = (int)outputIdParam.Value;
            return question;
        }

        public async Task UpdateAsync(Question question)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_UpdateQuestion", conn);
            cmd.CommandType = CommandType.StoredProcedure;

            cmd.Parameters.AddWithValue("@Id", question.Id);
            cmd.Parameters.AddWithValue("@QuestionText", question.QuestionText);
            cmd.Parameters.AddWithValue("@OptionA", question.OptionA);
            cmd.Parameters.AddWithValue("@OptionB", question.OptionB);
            cmd.Parameters.AddWithValue("@OptionC", question.OptionC);
            cmd.Parameters.AddWithValue("@OptionD", question.OptionD);
            cmd.Parameters.AddWithValue("@CorrectAnswer", question.CorrectAnswer);
            cmd.Parameters.AddWithValue("@Marks", question.Marks);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task DeleteAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_DeleteQuestion", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<bool> ExistsAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_QuestionExists", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();
            var result = await cmd.ExecuteScalarAsync();
            return Convert.ToBoolean(result);
        }

        public async Task<int> GetTotalMarksByExamIdAsync(int examId)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            using SqlCommand cmd = new SqlCommand("sp_GetTotalMarksByExamId", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ExamId", examId);

            await conn.OpenAsync();
            var result = await cmd.ExecuteScalarAsync();
            return result != DBNull.Value ? Convert.ToInt32(result) : 0;
        }

        public async Task BulkCreateAsync(List<Question> questions)
        {
            using SqlConnection conn = new SqlConnection(connectionString);
            await conn.OpenAsync();

            foreach (var question in questions)
            {
                using SqlCommand cmd = new SqlCommand("sp_CreateQuestion", conn);
                cmd.CommandType = CommandType.StoredProcedure;

                cmd.Parameters.AddWithValue("@QuestionText", question.QuestionText);
                cmd.Parameters.AddWithValue("@OptionA", question.OptionA);
                cmd.Parameters.AddWithValue("@OptionB", question.OptionB);
                cmd.Parameters.AddWithValue("@OptionC", question.OptionC);
                cmd.Parameters.AddWithValue("@OptionD", question.OptionD);
                cmd.Parameters.AddWithValue("@CorrectAnswer", question.CorrectAnswer);
                cmd.Parameters.AddWithValue("@Marks", question.Marks);
                cmd.Parameters.AddWithValue("@ExamId", question.ExamId);

                await cmd.ExecuteNonQueryAsync();
            }
        }
    }
}