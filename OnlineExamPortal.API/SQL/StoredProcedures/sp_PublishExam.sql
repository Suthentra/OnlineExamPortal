CREATE PROCEDURE sp_PublishExam
    @Id INT
AS
BEGIN
    UPDATE Exams
    SET IsPublished = 1
    WHERE Id = @Id;
END