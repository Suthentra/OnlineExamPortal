CREATE OR ALTER PROCEDURE sp_SubmitAnswer
    @AttemptId INT,
    @QuestionId INT,
    @SelectedOption CHAR(1)
AS
BEGIN
    DECLARE @CorrectAnswer CHAR(1);
    DECLARE @IsCorrect BIT;
    
    -- First check if the question exists
    IF NOT EXISTS (SELECT 1 FROM Questions WHERE Id = @QuestionId)
    BEGIN
        -- Question doesn't exist - return error
        SELECT -1 AS IsCorrect;
        RETURN;
    END
    
    -- Get correct answer for this question
    SELECT @CorrectAnswer = CorrectAnswer
    FROM Questions WHERE Id = @QuestionId;
    
    -- Check if answer is correct
    SET @IsCorrect = CASE WHEN @SelectedOption = @CorrectAnswer THEN 1 ELSE 0 END;
    
    -- Check if answer already exists
    IF EXISTS (SELECT 1 FROM Answers WHERE ExamAttemptId = @AttemptId AND QuestionId = @QuestionId)
    BEGIN
        UPDATE Answers
        SET SelectedOption = @SelectedOption,
            IsCorrect = @IsCorrect
        WHERE ExamAttemptId = @AttemptId AND QuestionId = @QuestionId;
    END
    ELSE
    BEGIN
        INSERT INTO Answers (ExamAttemptId, QuestionId, SelectedOption, IsCorrect)
        VALUES (@AttemptId, @QuestionId, @SelectedOption, @IsCorrect);
    END
    
    SELECT @IsCorrect AS IsCorrect;
END
GO