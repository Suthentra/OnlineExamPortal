-- sp_GetUserByEmail.sql
CREATE PROCEDURE sp_GetUserByEmail
    @Email NVARCHAR(100)
AS
BEGIN
    SELECT Id, FullName, Email, PasswordHash, UserRole, CreatedAt
    FROM Users
    WHERE Email = @Email;
END