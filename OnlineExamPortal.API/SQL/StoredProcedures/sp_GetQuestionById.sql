CREATE PROCEDURE sp_GetQuestionById
    @Id INT
AS
BEGIN
    SELECT Id, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks, CreatedAt, ExamId
    FROM Questions
    WHERE Id = @Id;
END