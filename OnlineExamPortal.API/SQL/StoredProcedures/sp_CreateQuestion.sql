CREATE PROCEDURE sp_CreateQuestion
    @QuestionText NVARCHAR(MAX),
    @OptionA NVARCHAR(500),
    @OptionB NVARCHAR(500),
    @OptionC NVARCHAR(500),
    @OptionD NVARCHAR(500),
    @CorrectAnswer CHAR(1),
    @Marks INT,
    @ExamId INT,
    @NewId INT OUTPUT
AS
BEGIN
    INSERT INTO Questions (QuestionText, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Marks, CreatedAt, ExamId)
    VALUES (@QuestionText, @OptionA, @OptionB, @OptionC, @OptionD, @CorrectAnswer, @Marks, GETDATE(), @ExamId);
    
    SET @NewId = SCOPE_IDENTITY();
END
