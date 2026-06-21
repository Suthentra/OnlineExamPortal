CREATE PROCEDURE sp_GetExamById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- ===== VALIDATION =====
        IF NOT EXISTS (SELECT 1 FROM Exams WHERE Id = @Id)
        BEGIN
            RAISERROR('Exam not found', 16, 1);
            RETURN;
        END
        
        -- ===== GET EXAM WITH QUESTIONS COUNT =====
        SELECT 
            e.Id,
            e.Title,
            e.Description,
            e.TotalMarks,
            e.DurationInMinutes,
            e.StartTime,
            e.EndTime,
            e.IsPublished,
            e.ResultsPublished,
            e.CreatedAt,
            e.UserId,
            u.FullName AS CreatedBy,
            (SELECT COUNT(*) FROM Questions WHERE ExamId = e.Id) AS TotalQuestions,
            (SELECT COUNT(*) FROM ExamAttempts WHERE ExamId = e.Id AND Status = 'Completed') AS TotalAttempts
        FROM Exams e
        LEFT JOIN Users u ON e.UserId = u.Id
        WHERE e.Id = @Id;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO