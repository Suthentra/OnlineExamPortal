CREATE PROCEDURE sp_UpdateQuestion
    @Id INT,
    @QuestionText NVARCHAR(MAX),
    @OptionA NVARCHAR(500),
    @OptionB NVARCHAR(500),
    @OptionC NVARCHAR(500),
    @OptionD NVARCHAR(500),
    @CorrectAnswer CHAR(1),
    @Marks INT
AS
BEGIN
    UPDATE Questions
    SET QuestionText = @QuestionText,
        OptionA = @OptionA,
        OptionB = @OptionB,
        OptionC = @OptionC,
        OptionD = @OptionD,
        CorrectAnswer = @CorrectAnswer,
        Marks = @Marks
    WHERE Id = @Id;
END