CREATE PROCEDURE sp_DeleteExam
    @Id INT
AS
BEGIN
    -- This will cascade delete questions and exam attempts if you have foreign keys with CASCADE
    DELETE FROM Exams WHERE Id = @Id;
END