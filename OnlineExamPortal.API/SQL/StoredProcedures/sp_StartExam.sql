CREATE PROCEDURE sp_StartExam
    @StudentId INT,
    @ExamId INT,
    @AttemptId INT OUTPUT
AS
BEGIN
    INSERT INTO ExamAttempts (UserId, ExamId, StartedAt, Status)
    VALUES (@StudentId, @ExamId, GETDATE(), 'InProgress');
    
    SET @AttemptId = SCOPE_IDENTITY();
END
