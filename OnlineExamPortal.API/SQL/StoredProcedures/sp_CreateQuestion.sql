CREATE PROCEDURE sp_CreateQuestion
    @QuestionText NVARCHAR(MAX),
    @QuestionType NVARCHAR(50),
    @Marks INT,
    @ExamId INT,
    @CreatedAt DATETIME
AS
BEGIN
    INSERT INTO Questions (QuestionText, QuestionType, Marks, ExamId, CreatedAt)
    VALUES (@QuestionText, @QuestionType, @Marks, @ExamId, @CreatedAt);
    
    SELECT SCOPE_IDENTITY() AS Id;
END
GO