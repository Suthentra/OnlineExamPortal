CREATE PROCEDURE sp_StartExam
    @StudentId INT,
    @ExamId INT,
    @AttemptId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    BEGIN TRY
        -- ===== VALIDATIONS =====
        
        -- 1. Check if student exists
        IF NOT EXISTS (SELECT 1 FROM Users WHERE Id = @StudentId)
        BEGIN
            RAISERROR('Student not found', 16, 1);
            RETURN;
        END
        
        -- 2. Check if exam exists
        IF NOT EXISTS (SELECT 1 FROM Exams WHERE Id = @ExamId)
        BEGIN
            RAISERROR('Exam not found', 16, 1);
            RETURN;
        END
        
        -- 3. Check if exam is published
        IF NOT EXISTS (SELECT 1 FROM Exams WHERE Id = @ExamId AND IsPublished = 1)
        BEGIN
            RAISERROR('Exam is not published yet', 16, 1);
            RETURN;
        END
        
        -- 4. Check if exam is available
        DECLARE @StartTime DATETIME, @EndTime DATETIME;
        SELECT @StartTime = StartTime, @EndTime = EndTime 
        FROM Exams WHERE Id = @ExamId;
        
        IF GETDATE() < @StartTime
        BEGIN
            RAISERROR('Exam has not started yet', 16, 1);
            RETURN;
        END
        
        IF GETDATE() > @EndTime
        BEGIN
            RAISERROR('Exam has already ended', 16, 1);
            RETURN;
        END
        
        -- 5. Check if student already completed this exam
        IF EXISTS (
            SELECT 1 FROM ExamAttempts 
            WHERE UserId = @StudentId AND ExamId = @ExamId AND Status = 'Completed'
        )
        BEGIN
            RAISERROR('You have already completed this exam', 16, 1);
            RETURN;
        END
        
        -- 6. Check if student has an in-progress attempt
        IF EXISTS (
            SELECT 1 FROM ExamAttempts 
            WHERE UserId = @StudentId AND ExamId = @ExamId AND Status = 'InProgress'
        )
        BEGIN
            SELECT @AttemptId = Id 
            FROM ExamAttempts 
            WHERE UserId = @StudentId AND ExamId = @ExamId AND Status = 'InProgress';
            RETURN;
        END
        
        -- ===== START EXAM =====
        BEGIN TRANSACTION;
        
        INSERT INTO ExamAttempts (UserId, ExamId, StartedAt, Status)
        VALUES (@StudentId, @ExamId, GETDATE(), 'InProgress');
        
        SET @AttemptId = SCOPE_IDENTITY();
        
        COMMIT TRANSACTION;
        
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        SET @AttemptId = -1;
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO