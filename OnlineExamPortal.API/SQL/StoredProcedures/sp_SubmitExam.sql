CREATE PROCEDURE sp_SubmitExam
    @AttemptId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    BEGIN TRY
        -- ===== VALIDATIONS =====
        
        -- 1. Check if attempt exists
        IF NOT EXISTS (SELECT 1 FROM ExamAttempts WHERE Id = @AttemptId)
        BEGIN
            RAISERROR('Exam attempt not found', 16, 1);
            RETURN;
        END
        
        -- 2. Check if attempt is already submitted
        IF EXISTS (SELECT 1 FROM ExamAttempts WHERE Id = @AttemptId AND Status = 'Completed')
        BEGIN
            RAISERROR('Exam already submitted', 16, 1);
            RETURN;
        END
        
        -- 3. Check if attempt is in progress
        IF NOT EXISTS (SELECT 1 FROM ExamAttempts WHERE Id = @AttemptId AND Status = 'InProgress')
        BEGIN
            RAISERROR('Exam is not in progress', 16, 1);
            RETURN;
        END
        
        -- ===== SUBMIT EXAM =====
        DECLARE @TotalScore INT;
        DECLARE @TotalMarks INT;
        DECLARE @Percentage DECIMAL(5,2);
        DECLARE @IsPassed BIT;
        DECLARE @ExamId INT;
        
        -- Get ExamId
        SELECT @ExamId = ExamId FROM ExamAttempts WHERE Id = @AttemptId;
        
        -- Calculate total score from Answers table
        SELECT @TotalScore = ISNULL(SUM(q.Marks), 0)
        FROM Answers a
        INNER JOIN Questions q ON a.QuestionId = q.Id
        WHERE a.ExamAttemptId = @AttemptId AND a.IsCorrect = 1;
        
        -- Get total marks for the exam
        SELECT @TotalMarks = ISNULL(SUM(q.Marks), 0)
        FROM Questions q
        WHERE q.ExamId = @ExamId;
        
        -- Check if student answered all questions (warning only)
        DECLARE @TotalQuestions INT = (SELECT COUNT(*) FROM Questions WHERE ExamId = @ExamId);
        DECLARE @AnsweredQuestions INT = (SELECT COUNT(*) FROM Answers WHERE ExamAttemptId = @AttemptId);
        
        -- Calculate percentage
        IF @TotalMarks > 0
            SET @Percentage = (@TotalScore * 100.0) / @TotalMarks;
        ELSE
            SET @Percentage = 0;
        
        -- Determine if passed (40% passing marks)
        SET @IsPassed = CASE WHEN @Percentage >= 40 THEN 1 ELSE 0 END;
        
        BEGIN TRANSACTION;
        
        -- Update exam attempt
        UPDATE ExamAttempts
        SET SubmittedAt = GETDATE(),
            Score = @TotalScore,
            Status = 'Completed',
            IsPassed = @IsPassed,
            Percentage = @Percentage
        WHERE Id = @AttemptId;
        
        COMMIT TRANSACTION;
        
        -- Return result
        SELECT 
            @AttemptId AS AttemptId,
            @TotalScore AS Score,
            @TotalMarks AS TotalMarks,
            @Percentage AS Percentage,
            @IsPassed AS IsPassed,
            GETDATE() AS SubmittedAt;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO