CREATE PROCEDURE sp_GetAttemptsByStudentId
    @StudentId INT
AS
BEGIN
    SELECT Id, UserId, ExamId, StartedAt, SubmittedAt, Score, Status, IsPassed, Percentage
    FROM ExamAttempts
    WHERE UserId = @StudentId
    ORDER BY StartedAt DESC;
END