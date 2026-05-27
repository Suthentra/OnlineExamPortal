CREATE PROCEDURE sp_GetQuestionsByExamId
    @ExamId INT
AS
BEGIN
    SELECT Id, QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks, CreatedAt, ExamId
    FROM Questions
    WHERE ExamId = @ExamId
    ORDER BY Id;
END