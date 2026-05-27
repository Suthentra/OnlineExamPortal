CREATE PROCEDURE sp_CreateExam
(
    @Title NVARCHAR(200),
    @Description NVARCHAR(MAX),
    @TotalMarks INT,
    @DurationInMinutes INT,
    @StartTime DATETIME,
    @EndTime DATETIME,
    @UserId INT
)
AS
BEGIN
    INSERT INTO Exams
    (
        Title,
        Description,
        TotalMarks,
        DurationInMinutes,
        StartTime,
        EndTime,
        UserId
    )
    VALUES
    (
        @Title,
        @Description,
        @TotalMarks,
        @DurationInMinutes,
        @StartTime,
        @EndTime,
        @UserId
    );
END