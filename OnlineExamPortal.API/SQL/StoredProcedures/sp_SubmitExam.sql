CREATE PROCEDURE sp_SubmitExam
    @AttemptId INT
AS
BEGIN
    DECLARE @TotalScore INT;
    DECLARE @TotalMarks INT;
    DECLARE @Percentage DECIMAL(5,2);
    DECLARE @IsPassed BIT;
    
    -- Calculate total score
    SELECT @TotalScore = ISNULL(SUM(MarksObtained), 0)
    FROM Answers WHERE ExamAttemptId = @AttemptId;
    
    -- Get total marks for the exam
    SELECT @TotalMarks = e.TotalMarks
    FROM ExamAttempts ea
    JOIN Exams e ON ea.ExamId = e.Id
    WHERE ea.Id = @AttemptId;
    
    -- Calculate percentage
    SET @Percentage = (@TotalScore * 100.0) / NULLIF(@TotalMarks, 0);
    
    -- Determine if passed (assuming 40% passing marks)
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