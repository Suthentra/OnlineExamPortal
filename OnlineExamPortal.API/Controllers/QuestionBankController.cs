using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace OnlineExamPortal.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class QuestionBankController : ControllerBase
    {
        private readonly string _connectionString;

        public QuestionBankController(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("OnlineExamPortalConnectionString");
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var questions = new List<object>();

            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = "SELECT Id, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks, Category, Difficulty FROM QuestionBank ORDER BY Category, Id";
            using SqlCommand cmd = new SqlCommand(sql, conn);

            await conn.OpenAsync();
            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                questions.Add(new
                {
                    id = reader["Id"],
                    questionText = reader["QuestionText"],
                    optionA = reader["OptionA"],
                    optionB = reader["OptionB"],
                    optionC = reader["OptionC"],
                    optionD = reader["OptionD"],
                    correctAnswer = reader["CorrectAnswer"],
                    marks = reader["Marks"],
                    category = reader["Category"],
                    difficulty = reader["Difficulty"]
                });
            }

            return Ok(questions);
        }

        [HttpPost("add-to-exam/{examId}")]
        public async Task<IActionResult> AddToExam(int examId, [FromBody] List<int> questionIds)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            await conn.OpenAsync();

            int addedCount = 0;

            foreach (int qId in questionIds)
            {
                // Get question from bank
                string getSql = "SELECT QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks FROM QuestionBank WHERE Id = @Id";
                SqlCommand getCmd = new SqlCommand(getSql, conn);
                getCmd.Parameters.AddWithValue("@Id", qId);

                using SqlDataReader reader = await getCmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    // Insert into Questions table
                    string insertSql = @"
                        INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks, CreatedAt, ExamId)
                        VALUES (@QuestionText, @OptionA, @OptionB, @OptionC, @OptionD, @CorrectAnswer, @Marks, GETDATE(), @ExamId)";

                    SqlCommand insertCmd = new SqlCommand(insertSql, conn);
                    insertCmd.Parameters.AddWithValue("@QuestionText", reader["QuestionText"]);
                    insertCmd.Parameters.AddWithValue("@OptionA", reader["OptionA"]);
                    insertCmd.Parameters.AddWithValue("@OptionB", reader["OptionB"]);
                    insertCmd.Parameters.AddWithValue("@OptionC", reader["OptionC"]);
                    insertCmd.Parameters.AddWithValue("@OptionD", reader["OptionD"]);
                    insertCmd.Parameters.AddWithValue("@CorrectAnswer", reader["CorrectAnswer"]);
                    insertCmd.Parameters.AddWithValue("@Marks", reader["Marks"]);
                    insertCmd.Parameters.AddWithValue("@ExamId", examId);

                    reader.Close();
                    await insertCmd.ExecuteNonQueryAsync();
                    addedCount++;
                }
                else
                {
                    reader.Close();
                }
            }

            return Ok(new { message = $"{addedCount} questions added to exam" });
        }
    }
}