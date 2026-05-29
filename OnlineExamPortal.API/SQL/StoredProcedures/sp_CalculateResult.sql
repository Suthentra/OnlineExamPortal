CREATE PROCEDURE sp_SubmitExam
    @AttemptId INT
AS
BEGIN
    DECLARE @TotalScore INT;
    DECLARE @TotalMarks INT;
    DECLARE @Percentage DECIMAL(5,2);
    DECLARE @IsPassed BIT;
    
    -- Calculate total score from Answers table (using Marks from Questions table)
    SELECT @TotalScore = ISNULL(SUM(q.Marks), 0)
    FROM Answers a
    INNER JOIN Questions q ON a.QuestionId = q.Id
    WHERE a.ExamAttemptId = @AttemptId AND a.IsCorrect = 1;
    
    -- Get total marks for the exam
    SELECT @TotalMarks = ISNULL(SUM(q.Marks), 0)
    FROM Questions q
    WHERE q.ExamId = (SELECT ExamId FROM ExamAttempts WHERE Id = @AttemptId);
    
    -- Calculate percentage
    IF @TotalMarks > 0
        SET @Percentage = (@TotalScore * 100.0) / @TotalMarks;
    ELSE
        SET @Percentage = 0;
    
    -- Determine if passed (40% passing marks)
    SET @IsPassed = CASE WHEN @Percentage >= 40 THEN 1 ELSE 0 END;
    
    -- Update exam attempt
    UPDATE ExamAttempts
    SET SubmittedAt = GETDATE(),
        Score = @TotalScore,
        Status = 'Completed',
        IsPassed = @IsPassed,
        Percentage = @Percentage
    WHERE Id = @AttemptId;
END
GO