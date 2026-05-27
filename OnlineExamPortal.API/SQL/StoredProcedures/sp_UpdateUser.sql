CREATE PROCEDURE sp_UpdateUser
    @Id INT,
    @FullName NVARCHAR(100),
    @Email NVARCHAR(100),
    @UserRole NVARCHAR(50)
AS
BEGIN
    UPDATE Users
    SET FullName = @FullName,
        Email = @Email,
        UserRole = @UserRole
    WHERE Id = @Id;
END