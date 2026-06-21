CREATE PROCEDURE sp_CreateExam
(
    @Title NVARCHAR(200),
    @Description NVARCHAR(MAX),
    @TotalMarks INT,
    @DurationInMinutes INT,
    @StartTime DATETIME,
    @EndTime DATETIME,
    @UserId INT
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    
    BEGIN TRY
        -- ===== VALIDATIONS =====
        
        -- 1. Validate Title
        IF @Title IS NULL OR LEN(LTRIM(RTRIM(@Title))) < 3
        BEGIN
            RAISERROR('Title must be at least 3 characters long', 16, 1);
            RETURN;
        END
        
        -- 2. Validate Total Marks
        IF @TotalMarks < 1
        BEGIN
            RAISERROR('Total marks must be at least 1', 16, 1);
            RETURN;
        END
        
        IF @TotalMarks > 1000
        BEGIN
            RAISERROR('Total marks cannot exceed 1000', 16, 1);
            RETURN;
        END
        
        -- 3. Validate Duration
        IF @DurationInMinutes < 1
        BEGIN
            RAISERROR('Duration must be at least 1 minute', 16, 1);
            RETURN;
        END
        
        IF @DurationInMinutes > 480
        BEGIN
            RAISERROR('Duration cannot exceed 480 minutes (8 hours)', 16, 1);
            RETURN;
        END
        
        -- 4. Validate Start Time
        IF @StartTime < GETDATE()
        BEGIN
            RAISERROR('Start time must be in the future', 16, 1);
            RETURN;
        END
        
        -- 5. Validate End Time
        IF @EndTime <= @StartTime
        BEGIN
            RAISERROR('End time must be after start time', 16, 1);
            RETURN;
        END
        
        -- 6. Validate Duration matches time difference
        DECLARE @ActualDuration INT = DATEDIFF(MINUTE, @StartTime, @EndTime);
        IF @ActualDuration != @DurationInMinutes
        BEGIN
            RAISERROR('Duration mismatch. Actual time difference: %d minutes, but entered: %d minutes', 16, 1, @ActualDuration, @DurationInMinutes);
            RETURN;
        END
        
        -- 7. Validate User exists
        IF NOT EXISTS (SELECT 1 FROM Users WHERE Id = @UserId)
        BEGIN
            RAISERROR('User not found', 16, 1);
            RETURN;
        END
        
        -- 8. Check for duplicate exam title
        IF EXISTS (SELECT 1 FROM Exams WHERE Title = @Title)
        BEGIN
            RAISERROR('An exam with this title already exists', 16, 1);
            RETURN;
        END
        
        -- ===== CREATE EXAM =====
        BEGIN TRANSACTION;
        
        INSERT INTO Exams
        (
            Title,
            Description,
            TotalMarks,
            DurationInMinutes,
            StartTime,
            EndTime,
            UserId,
            IsPublished,
            ResultsPublished,
            CreatedAt
        )
        VALUES
        (
            @Title,
            @Description,
            @TotalMarks,
            @DurationInMinutes,
            @StartTime,
            @EndTime,
            @UserId,
            0,
            0,
            GETDATE()
        );
        
        DECLARE @NewExamId INT = SCOPE_IDENTITY();
        
        COMMIT TRANSACTION;
        
        -- Return the created exam
        SELECT * FROM Exams WHERE Id = @NewExamId;
        
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