CREATE PROCEDURE sp_CalculateResult
    @AttemptId INT
AS
BEGIN
    -- Result summary
    SELECT 
        ea.Score,
        e.TotalMarks,
        ea.Percentage,
        ea.IsPassed,
        ea.SubmittedAt
    FROM ExamAttempts ea
    JOIN Exams e ON ea.ExamId = e.Id
    WHERE ea.Id = @AttemptId;
    
    -- Answer details
    SELECT 
        q.Id AS QuestionId,
        q.QuestionText,
        ISNULL(a.SelectedOption, 'Not Answered') AS YourAnswer,
        q.CorrectAnswer,
        ISNULL(a.IsCorrect, 0) AS IsCorrect,
        ISNULL(a.MarksObtained, 0) AS MarksObtained
    FROM Questions q
    LEFT JOIN Answers a ON q.Id = a.QuestionId AND a.ExamAttemptId = @AttemptId
    WHERE q.ExamId = (SELECT ExamId FROM ExamAttempts WHERE Id = @AttemptId)
    ORDER BY q.Id;
END