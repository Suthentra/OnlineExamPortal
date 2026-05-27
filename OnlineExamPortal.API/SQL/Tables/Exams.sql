CREATE TABLE Exams
(
    Id INT PRIMARY KEY IDENTITY(1,1),

    Title NVARCHAR(200) NOT NULL,

    Description NVARCHAR(MAX) NOT NULL,

    TotalMarks INT NOT NULL,

    DurationInMinutes INT NOT NULL,

    StartTime DATETIME NOT NULL,

    EndTime DATETIME NOT NULL,

    IsPublished BIT NOT NULL DEFAULT 0,

    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),

    UserId INT NOT NULL,

    CONSTRAINT FK_Exams_Users
        FOREIGN KEY (UserId)
        REFERENCES Users(Id)
);