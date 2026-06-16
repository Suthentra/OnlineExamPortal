using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Repositories.Interface;
using System.Data;

namespace OnlineExamPortal.API.Repositories.Implementation
{
    public class SQLQuestionRepository : IQuestionRepository
    {
        private readonly string _connectionString;

        public SQLQuestionRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("OnlineExamPortalConnectionString");
        }

        public async Task<List<Question>> GetByExamIdAsync(int examId)
        {
            var questions = new List<Question>();

            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = "SELECT * FROM Questions WHERE ExamId = @ExamId";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@ExamId", examId);

            await conn.OpenAsync();
            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                var question = new Question
                {
                    Id = (int)reader["Id"],
                    QuestionText = reader["QuestionText"].ToString()!,
                    QuestionType = reader["QuestionType"]?.ToString() ?? "MCQ",
                    Marks = (int)reader["Marks"],
                    ExamId = (int)reader["ExamId"],
                    CreatedAt = (DateTime)reader["CreatedAt"],
                    Options = new List<Option>()
                };
                questions.Add(question);
            }

            await reader.CloseAsync();

            // Load options for each question
            foreach (var question in questions)
            {
                string optionsSql = "SELECT * FROM Options WHERE QuestionId = @QuestionId ORDER BY OptionOrder";
                using SqlCommand optionsCmd = new SqlCommand(optionsSql, conn);
                optionsCmd.Parameters.AddWithValue("@QuestionId", question.Id);

                using SqlDataReader optionsReader = await optionsCmd.ExecuteReaderAsync();
                while (await optionsReader.ReadAsync())
                {
                    question.Options.Add(new Option
                    {
                        Id = (int)optionsReader["Id"],
                        QuestionId = (int)optionsReader["QuestionId"],
                        OptionText = optionsReader["OptionText"].ToString()!,
                        OptionOrder = (int)optionsReader["OptionOrder"],
                        IsCorrect = (bool)optionsReader["IsCorrect"],
                        CreatedAt = (DateTime)optionsReader["CreatedAt"]
                    });
                }
            }

            return questions;
        }

        public async Task<Question?> GetByIdAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = "SELECT * FROM Questions WHERE Id = @Id";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();
            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new Question
                {
                    Id = (int)reader["Id"],
                    QuestionText = reader["QuestionText"].ToString()!,
                    QuestionType = reader["QuestionType"]?.ToString() ?? "MCQ",
                    Marks = (int)reader["Marks"],
                    ExamId = (int)reader["ExamId"],
                    CreatedAt = (DateTime)reader["CreatedAt"]
                };
            }

            return null;
        }

        public async Task<Question?> GetQuestionWithOptionsAsync(int id)
        {
            Question? question = null;

            using SqlConnection conn = new SqlConnection(_connectionString);

            string questionSql = "SELECT * FROM Questions WHERE Id = @Id";
            using SqlCommand questionCmd = new SqlCommand(questionSql, conn);
            questionCmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();
            using SqlDataReader reader = await questionCmd.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                question = new Question
                {
                    Id = (int)reader["Id"],
                    QuestionText = reader["QuestionText"].ToString()!,
                    QuestionType = reader["QuestionType"]?.ToString() ?? "MCQ",
                    Marks = (int)reader["Marks"],
                    ExamId = (int)reader["ExamId"],
                    CreatedAt = (DateTime)reader["CreatedAt"],
                    Options = new List<Option>()
                };
            }

            await reader.CloseAsync();

            if (question != null)
            {
                string optionsSql = "SELECT * FROM Options WHERE QuestionId = @QuestionId ORDER BY OptionOrder";
                using SqlCommand optionsCmd = new SqlCommand(optionsSql, conn);
                optionsCmd.Parameters.AddWithValue("@QuestionId", question.Id);

                using SqlDataReader optionsReader = await optionsCmd.ExecuteReaderAsync();
                while (await optionsReader.ReadAsync())
                {
                    question.Options.Add(new Option
                    {
                        Id = (int)optionsReader["Id"],
                        QuestionId = (int)optionsReader["QuestionId"],
                        OptionText = optionsReader["OptionText"].ToString()!,
                        OptionOrder = (int)optionsReader["OptionOrder"],
                        IsCorrect = (bool)optionsReader["IsCorrect"],
                        CreatedAt = (DateTime)optionsReader["CreatedAt"]
                    });
                }
            }

            return question;
        }

        public async Task<Question> CreateAsync(Question question)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = @"
                INSERT INTO Questions (QuestionText, QuestionType, Marks, ExamId, CreatedAt)
                VALUES (@QuestionText, @QuestionType, @Marks, @ExamId, @CreatedAt);
                SELECT SCOPE_IDENTITY();";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@QuestionText", question.QuestionText);
            cmd.Parameters.AddWithValue("@QuestionType", question.QuestionType);
            cmd.Parameters.AddWithValue("@Marks", question.Marks);
            cmd.Parameters.AddWithValue("@ExamId", question.ExamId);
            cmd.Parameters.AddWithValue("@CreatedAt", DateTime.Now);

            await conn.OpenAsync();
            question.Id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            return question;
        }

        public async Task UpdateAsync(Question question)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = @"
                UPDATE Questions 
                SET QuestionText = @QuestionText, 
                    QuestionType = @QuestionType,
                    Marks = @Marks
                WHERE Id = @Id";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@Id", question.Id);
            cmd.Parameters.AddWithValue("@QuestionText", question.QuestionText);
            cmd.Parameters.AddWithValue("@QuestionType", question.QuestionType);
            cmd.Parameters.AddWithValue("@Marks", question.Marks);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task DeleteAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = "DELETE FROM Questions WHERE Id = @Id";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();
            await cmd.ExecuteNonQueryAsync();
        }

        public async Task<bool> ExistsAsync(int id)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = "SELECT COUNT(1) FROM Questions WHERE Id = @Id";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@Id", id);

            await conn.OpenAsync();
            var result = await cmd.ExecuteScalarAsync();
            return Convert.ToInt32(result) > 0;
        }

        public async Task<int> GetTotalMarksByExamIdAsync(int examId)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = "SELECT ISNULL(SUM(Marks), 0) FROM Questions WHERE ExamId = @ExamId";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@ExamId", examId);

            await conn.OpenAsync();
            var result = await cmd.ExecuteScalarAsync();
            return result != DBNull.Value ? Convert.ToInt32(result) : 0;
        }

        public async Task BulkCreateAsync(List<Question> questions)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            foreach (var question in questions)
            {
                string sql = @"
                    INSERT INTO Questions (QuestionText, QuestionType, Marks, ExamId, CreatedAt)
                    VALUES (@QuestionText, @QuestionType, @Marks, @ExamId, @CreatedAt);
                    SELECT SCOPE_IDENTITY();";

                using SqlCommand cmd = new SqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@QuestionText", question.QuestionText);
                cmd.Parameters.AddWithValue("@QuestionType", question.QuestionType);
                cmd.Parameters.AddWithValue("@Marks", question.Marks);
                cmd.Parameters.AddWithValue("@ExamId", question.ExamId);
                cmd.Parameters.AddWithValue("@CreatedAt", DateTime.Now);

                question.Id = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            }
        }

    }
}