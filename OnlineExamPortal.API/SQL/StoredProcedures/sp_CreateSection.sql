-- sp_CreateSection
CREATE PROCEDURE sp_CreateSection
    @ExamId INT,
    @SectionName NVARCHAR(100),
    @SectionOrder INT,
    @TotalQuestions INT,
    @TotalMarks INT,
    @NewId INT OUTPUT
AS
BEGIN
    INSERT INTO Sections (ExamId, SectionName, SectionOrder, TotalQuestions, TotalMarks, CreatedAt)
    VALUES (@ExamId, @SectionName, @SectionOrder, @TotalQuestions, @TotalMarks, GETDATE());
    
    SET @NewId = SCOPE_IDENTITY();
END
GO

-- sp_GetSectionsByExamId
CREATE PROCEDURE sp_GetSectionsByExamId
    @ExamId INT
AS
BEGIN
    SELECT Id, ExamId, SectionName, SectionOrder, TotalQuestions, TotalMarks, CreatedAt
    FROM Sections
    WHERE ExamId = @ExamId
    ORDER BY SectionOrder;
END
GO

-- sp_GetSectionById
CREATE PROCEDURE sp_GetSectionById
    @Id INT
AS
BEGIN
    SELECT Id, ExamId, SectionName, SectionOrder, TotalQuestions, TotalMarks, CreatedAt
    FROM Sections
    WHERE Id = @Id;
END
GO

-- sp_UpdateSection
CREATE PROCEDURE sp_UpdateSection
    @Id INT,
    @SectionName NVARCHAR(100),
    @SectionOrder INT,
    @TotalQuestions INT,
    @TotalMarks INT
AS
BEGIN
    UPDATE Sections
    SET SectionName = @SectionName,
        SectionOrder = @SectionOrder,
        TotalQuestions = @TotalQuestions,
        TotalMarks = @TotalMarks
    WHERE Id = @Id;
END
GO

-- sp_DeleteSection
CREATE PROCEDURE sp_DeleteSection
    @Id INT
AS
BEGIN
    DELETE FROM Sections WHERE Id = @Id;
END
GO