using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using OnlineExamPortal.API.Models.DTOs.Question;  // Add this using

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

        // GET: api/QuestionBank
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var questions = new List<object>();

            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = @"
                SELECT Id, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks, Category, Difficulty
                FROM QuestionBank 
                ORDER BY Id";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            await conn.OpenAsync();
            using SqlDataReader reader = await cmd.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                var options = new List<object>();
                string correctAnswer = reader["CorrectAnswer"]?.ToString() ?? "A";

                if (reader["OptionA"] != DBNull.Value && !string.IsNullOrEmpty(reader["OptionA"]?.ToString()))
                {
                    options.Add(new { optionText = reader["OptionA"].ToString(), optionOrder = 1, isCorrect = correctAnswer == "A" });
                }
                if (reader["OptionB"] != DBNull.Value && !string.IsNullOrEmpty(reader["OptionB"]?.ToString()))
                {
                    options.Add(new { optionText = reader["OptionB"].ToString(), optionOrder = 2, isCorrect = correctAnswer == "B" });
                }
                if (reader["OptionC"] != DBNull.Value && !string.IsNullOrEmpty(reader["OptionC"]?.ToString()))
                {
                    options.Add(new { optionText = reader["OptionC"].ToString(), optionOrder = 3, isCorrect = correctAnswer == "C" });
                }
                if (reader["OptionD"] != DBNull.Value && !string.IsNullOrEmpty(reader["OptionD"]?.ToString()))
                {
                    options.Add(new { optionText = reader["OptionD"].ToString(), optionOrder = 4, isCorrect = correctAnswer == "D" });
                }

                questions.Add(new
                {
                    id = reader["Id"],
                    questionText = reader["QuestionText"].ToString(),
                    options = options,
                    marks = reader["Marks"] != DBNull.Value ? Convert.ToInt32(reader["Marks"]) : 10,
                    category = reader["Category"] != DBNull.Value ? reader["Category"].ToString() : "General",
                    difficulty = reader["Difficulty"] != DBNull.Value ? reader["Difficulty"].ToString() : "Medium",
                    questionType = "MCQ"
                });
            }

            return Ok(questions);
        }

        // POST: api/QuestionBank/add-to-exam/{examId}
        [HttpPost("add-to-exam/{examId}")]
        public async Task<IActionResult> AddToExam(int examId, [FromBody] List<int> questionIds)
        {
            if (questionIds == null || questionIds.Count == 0)
            {
                return BadRequest(new { message = "No questions selected" });
            }

            using SqlConnection conn = new SqlConnection(_connectionString);

            try
            {
                await conn.OpenAsync();

                using var transaction = await conn.BeginTransactionAsync();
                int addedCount = 0;

                foreach (int qId in questionIds)
                {
                    string getSql = @"
                        SELECT QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks 
                        FROM QuestionBank WHERE Id = @Id";

                    string questionText = "";
                    int marks = 10;
                    string correctAnswer = "A";
                    string optionA = "", optionB = "", optionC = "", optionD = "";

                    using (SqlCommand getCmd = new SqlCommand(getSql, conn, (SqlTransaction)transaction))
                    {
                        getCmd.Parameters.AddWithValue("@Id", qId);
                        using (SqlDataReader reader = await getCmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                questionText = reader["QuestionText"]?.ToString() ?? "";
                                marks = reader["Marks"] != DBNull.Value ? Convert.ToInt32(reader["Marks"]) : 10;
                                correctAnswer = reader["CorrectAnswer"]?.ToString() ?? "A";
                                optionA = reader["OptionA"]?.ToString() ?? "";
                                optionB = reader["OptionB"]?.ToString() ?? "";
                                optionC = reader["OptionC"]?.ToString() ?? "";
                                optionD = reader["OptionD"]?.ToString() ?? "";
                            }
                        }
                    }

                    if (string.IsNullOrEmpty(questionText)) continue;

                    string insertSql = @"
                        INSERT INTO Questions (QuestionText, QuestionType, Marks, CreatedAt, ExamId)
                        VALUES (@QuestionText, 'MCQ', @Marks, GETDATE(), @ExamId);
                        SELECT SCOPE_IDENTITY();";

                    int newQuestionId;
                    using (SqlCommand insertCmd = new SqlCommand(insertSql, conn, (SqlTransaction)transaction))
                    {
                        insertCmd.Parameters.AddWithValue("@QuestionText", questionText);
                        insertCmd.Parameters.AddWithValue("@Marks", marks);
                        insertCmd.Parameters.AddWithValue("@ExamId", examId);
                        newQuestionId = Convert.ToInt32(await insertCmd.ExecuteScalarAsync());
                    }

                    int order = 1;
                    if (!string.IsNullOrEmpty(optionA))
                        await InsertOption(conn, (SqlTransaction)transaction, newQuestionId, optionA, order++, correctAnswer == "A");
                    if (!string.IsNullOrEmpty(optionB))
                        await InsertOption(conn, (SqlTransaction)transaction, newQuestionId, optionB, order++, correctAnswer == "B");
                    if (!string.IsNullOrEmpty(optionC))
                        await InsertOption(conn, (SqlTransaction)transaction, newQuestionId, optionC, order++, correctAnswer == "C");
                    if (!string.IsNullOrEmpty(optionD))
                        await InsertOption(conn, (SqlTransaction)transaction, newQuestionId, optionD, order++, correctAnswer == "D");

                    addedCount++;
                }

                await transaction.CommitAsync();

                return Ok(new { message = $"{addedCount} question(s) added successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private async Task InsertOption(SqlConnection conn, SqlTransaction transaction, int questionId, string optionText, int order, bool isCorrect)
        {
            string sql = @"
                INSERT INTO Options (QuestionId, OptionText, OptionOrder, IsCorrect, CreatedAt)
                VALUES (@QuestionId, @OptionText, @OptionOrder, @IsCorrect, GETDATE())";

            using (SqlCommand cmd = new SqlCommand(sql, conn, transaction))
            {
                cmd.Parameters.AddWithValue("@QuestionId", questionId);
                cmd.Parameters.AddWithValue("@OptionText", optionText);
                cmd.Parameters.AddWithValue("@OptionOrder", order);
                cmd.Parameters.AddWithValue("@IsCorrect", isCorrect);
                await cmd.ExecuteNonQueryAsync();
            }
        }

        // POST: api/QuestionBank (Add to bank)
        [HttpPost]
        public async Task<IActionResult> AddToBank([FromBody] AddToBankRequest request)
        {
            using SqlConnection conn = new SqlConnection(_connectionString);
            string sql = @"
                INSERT INTO QuestionBank (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks, Category, Difficulty, CreatedAt)
                VALUES (@QuestionText, @OptionA, @OptionB, @OptionC, @OptionD, @CorrectAnswer, @Marks, @Category, @Difficulty, GETDATE());
                SELECT SCOPE_IDENTITY();";

            using SqlCommand cmd = new SqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("@QuestionText", request.QuestionText);
            cmd.Parameters.AddWithValue("@OptionA", request.Options.Count > 0 ? request.Options[0].OptionText : "");
            cmd.Parameters.AddWithValue("@OptionB", request.Options.Count > 1 ? request.Options[1].OptionText : "");
            cmd.Parameters.AddWithValue("@OptionC", request.Options.Count > 2 ? request.Options[2].OptionText : "");
            cmd.Parameters.AddWithValue("@OptionD", request.Options.Count > 3 ? request.Options[3].OptionText : "");

            string correctAnswer = "A";
            for (int i = 0; i < request.Options.Count; i++)
            {
                if (request.Options[i].IsCorrect)
                {
                    correctAnswer = ((char)(65 + i)).ToString();
                    break;
                }
            }
            cmd.Parameters.AddWithValue("@CorrectAnswer", correctAnswer);
            cmd.Parameters.AddWithValue("@Marks", request.Marks);
            cmd.Parameters.AddWithValue("@Category", request.Category);
            cmd.Parameters.AddWithValue("@Difficulty", request.Difficulty);

            await conn.OpenAsync();
            int newId = Convert.ToInt32(await cmd.ExecuteScalarAsync());

            return Ok(new { id = newId, message = "Question added to bank successfully" });
        }
    }

    // DTOs for AddToBank - Note: No OptionDto here, using the one from Models.DTOs.Question
    public class AddToBankRequest
    {
        public string QuestionText { get; set; } = string.Empty;
        public List<OptionDto> Options { get; set; } = new List<OptionDto>();  // Uses OptionDto from Models.DTOs.Question
        public int Marks { get; set; }
        public string Category { get; set; } = "General";
        public string Difficulty { get; set; } = "Medium";
    }
}