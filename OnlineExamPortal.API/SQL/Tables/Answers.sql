CREATE TABLE Answers
(
    Id INT PRIMARY KEY IDENTITY(1,1),

    SelectedOption NVARCHAR(10) NOT NULL,

    IsCorrect BIT NOT NULL,

    ExamAttemptId INT NOT NULL,

    QuestionId INT NOT NULL,

    CONSTRAINT FK_Answers_ExamAttempts
        FOREIGN KEY (ExamAttemptId)
        REFERENCES ExamAttempts(Id),

    CONSTRAINT FK_Answers_Questions
        FOREIGN KEY (QuestionId)
        REFERENCES Questions(Id)
);