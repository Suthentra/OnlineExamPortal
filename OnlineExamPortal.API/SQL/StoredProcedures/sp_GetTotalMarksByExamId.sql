CREATE PROCEDURE sp_GetTotalMarksByExamId
    @ExamId INT
AS
BEGIN
    SELECT ISNULL(SUM(Marks), 0) FROM Questions WHERE ExamId = @ExamId;
END