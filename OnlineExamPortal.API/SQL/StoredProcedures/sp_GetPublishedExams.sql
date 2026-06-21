CREATE PROCEDURE sp_GetPublishedExams
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- ===== WITH CTE =====
        WITH ExamStats AS (
            SELECT 
                ExamId,
                COUNT(DISTINCT UserId) AS TotalAttempts,
                AVG(Percentage) AS AverageScore,
                SUM(CASE WHEN IsPassed = 1 THEN 1 ELSE 0 END) AS PassedCount,
                COUNT(*) AS TotalCount
            FROM ExamAttempts
            WHERE Status = 'Completed'
            GROUP BY ExamId
        )
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
            -- ===== SUBQUERY =====
            (SELECT COUNT(*) FROM Questions WHERE ExamId = e.Id) AS TotalQuestions,
            ISNULL(es.TotalAttempts, 0) AS TotalAttempts,
            ISNULL(es.AverageScore, 0) AS AverageScore,
            ISNULL(es.PassedCount, 0) AS PassedCount,
            ISNULL(es.TotalCount, 0) AS TotalAttemptedCount,
            -- ===== CASE STATEMENT =====
            CASE 
                WHEN GETDATE() < e.StartTime THEN 'Upcoming'
                WHEN GETDATE() > e.EndTime THEN 'Expired'
                WHEN GETDATE() BETWEEN e.StartTime AND e.EndTime THEN 'Active'
                ELSE 'Unknown'
            END AS ExamStatus
        FROM Exams e
        LEFT JOIN ExamStats es ON e.Id = es.ExamId
        WHERE e.IsPublished = 1
        ORDER BY 
            CASE 
                WHEN GETDATE() BETWEEN e.StartTime AND e.EndTime THEN 1
                WHEN GETDATE() < e.StartTime THEN 2
                WHEN GETDATE() > e.EndTime THEN 3
            END,
            e.StartTime DESC;
        
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO