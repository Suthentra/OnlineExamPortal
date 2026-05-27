CREATE PROCEDURE sp_HasStudentAttemptedExam
    @StudentId INT,
    @ExamId INT
AS
BEGIN
    SELECT CAST(CASE WHEN EXISTS (
        SELECT 1 FROM ExamAttempts 
        WHERE UserId = @StudentId AND ExamId = @ExamId
    ) THEN 1 ELSE 0 END AS BIT);
END