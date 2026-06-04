using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Models.Domain;
using OnlineExamPortal.API.Repositories.Interface;

namespace OnlineExamPortal.API.Repositories.Implementation
{
    public class SQLSectionRepository : ISectionRepository
    {
        private readonly string _connectionString;

        public SQLSectionRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("OnlineExamPortalConnectionString");
        }

        public async Task<List<Section>> GetByExamIdAsync(int examId)
        {
            var sections = new List<Section>();

            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = "SELECT Id, ExamId, SectionName, SectionOrder, TotalQuestions, TotalMarks, CreatedAt FROM Sections WHERE ExamId = @ExamId ORDER BY SectionOrder";
            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@ExamId", examId);

            await conn.OpenAsync();
            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                sections.Add(new Section
                {
                    Id = (int)reader["Id"],
                    ExamId = (int)reader["ExamId"],
                    SectionName = reader["SectionName"].ToString()!,
                    SectionOrder = (int)reader["SectionOrder"],
                    TotalQuestions = (int)reader["TotalQuestions"],
                    TotalMarks = (int)reader["TotalMarks"],
                    CreatedAt = (DateTime)reader["CreatedAt"]
                });
            }

            return sections;
        }

        public async Task<Section> CreateAsync(Section section)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = @"
                INSERT INTO Sections (ExamId, SectionName, SectionOrder, TotalQuestions, TotalMarks, CreatedAt)
                VALUES (@ExamId, @SectionName, @SectionOrder, @TotalQuestions, @TotalMarks, GETDATE());
                SELECT SCOPE_IDENTITY();";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@ExamId", section.ExamId);
            cmd.Parameters.AddWithValue("@SectionName", section.SectionName);
            cmd.Parameters.AddWithValue("@SectionOrder", section.SectionOrder);
            cmd.Parameters.AddWithValue("@TotalQuestions", section.TotalQuestions);
            cmd.Parameters.AddWithValue("@TotalMarks", section.TotalMarks);

            await conn.OpenAsync();
            section.Id = Convert.ToInt32(await cmd.ExecuteScalarAsync());

            return section;
        }
    }
}