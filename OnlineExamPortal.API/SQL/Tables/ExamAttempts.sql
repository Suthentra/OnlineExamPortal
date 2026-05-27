CREATE TABLE ExamAttempts
(
    Id INT PRIMARY KEY IDENTITY(1,1),

    StartedAt DATETIME NOT NULL,

    SubmittedAt DATETIME NULL,

    Score INT NOT NULL,

    Status NVARCHAR(50) NOT NULL,

    IsPassed BIT NOT NULL,

    Percentage DECIMAL(5,2) NOT NULL,

    UserId INT NOT NULL,

    ExamId INT NOT NULL,

    CONSTRAINT FK_ExamAttempts_Users
        FOREIGN KEY (UserId)
        REFERENCES Users(Id),

    CONSTRAINT FK_ExamAttempts_Exams
        FOREIGN KEY (ExamId)
        REFERENCES Exams(Id)
);