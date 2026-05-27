CREATE PROCEDURE sp_GetPublishedExams
AS
BEGIN
    SELECT * FROM Exams
    WHERE IsPublished = 1
    AND StartTime <= GETDATE()
    AND EndTime >= GETDATE()
    ORDER BY StartTime DESC;
END