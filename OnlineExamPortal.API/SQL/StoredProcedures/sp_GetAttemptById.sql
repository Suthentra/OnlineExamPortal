CREATE PROCEDURE sp_GetAttemptById
    @AttemptId INT
AS
BEGIN
    SELECT Id, UserId, ExamId, StartedAt, SubmittedAt, Score, Status, IsPassed, Percentage
    FROM ExamAttempts
    WHERE Id = @AttemptId;
END