CREATE PROCEDURE sp_CreateOption
    @QuestionId INT,
    @OptionText NVARCHAR(500),
    @OptionOrder INT,
    @IsCorrect BIT,
    @CreatedAt DATETIME
AS
BEGIN
    INSERT INTO Options (QuestionId, OptionText, OptionOrder, IsCorrect, CreatedAt)
    VALUES (@QuestionId, @OptionText, @OptionOrder, @IsCorrect, @CreatedAt);
    
    SELECT SCOPE_IDENTITY() AS Id;
END
GO