CREATE PROCEDURE sp_DeleteQuestion
    @Id INT
AS
BEGIN
    DELETE FROM Questions WHERE Id = @Id;
END
