CREATE PROCEDURE sp_UpdateExam
(
    @Id INT,
    @Title NVARCHAR(200),
    @Description NVARCHAR(MAX),
    @TotalMarks INT,
    @DurationInMinutes INT,
    @StartTime DATETIME,
    @EndTime DATETIME,
    @IsPublished BIT
)
AS
BEGIN
    UPDATE Exams
    SET Title = @Title,
        Description = @Description,
        TotalMarks = @TotalMarks,
        DurationInMinutes = @DurationInMinutes,
        StartTime = @StartTime,
        EndTime = @EndTime,
        IsPublished = @IsPublished
    WHERE Id = @Id;
END