-- Migration 001: Initial ELEVSKILL AI Schema

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        UserId INT IDENTITY(1,1) PRIMARY KEY,
        FullName NVARCHAR(150) NOT NULL,
        Email NVARCHAR(255) NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        AccountStatus NVARCHAR(30) NOT NULL DEFAULT 'active',
        Education NVARCHAR(150) NULL,
        Degree NVARCHAR(150) NULL,
        Institution NVARCHAR(200) NULL,
        GraduationYear NVARCHAR(20) NULL,
        TargetRole NVARCHAR(150) NULL,
        ExperienceLevel NVARCHAR(80) NULL,
        Skills NVARCHAR(MAX) NULL,
        CareerInterests NVARCHAR(MAX) NULL,
        WeeklyGoalHours DECIMAL(5,2) NOT NULL DEFAULT 0,
        EmailNotifications BIT NOT NULL DEFAULT 0,
        StudyReminders BIT NOT NULL DEFAULT 0,
        OnboardingDismissed BIT NOT NULL DEFAULT 0,
        ThemeVariant NVARCHAR(30) NOT NULL DEFAULT 'lavender',
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_Users_Email UNIQUE (Email)
    );
END
GO

IF OBJECT_ID(N'dbo.ResumeVault', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ResumeVault (
        ResumeId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        ResumeName NVARCHAR(200) NOT NULL,
        ExtractedText NVARCHAR(MAX) NOT NULL,
        CandidateClassification NVARCHAR(150) NULL,
        OriginalFileName NVARCHAR(255) NULL,
        StoredFilePath NVARCHAR(500) NULL,
        FileSize BIGINT NULL,
        LastAnalysisScore INT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ResumeVault_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE
    );
    CREATE INDEX IX_ResumeVault_UserId ON dbo.ResumeVault(UserId, UpdatedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.ResumeAnalyses', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ResumeAnalyses (
        AnalysisId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        ResumeId INT NULL,
        OverallScore INT NOT NULL,
        StatusLabel NVARCHAR(80) NULL,
        WordCount INT NOT NULL DEFAULT 0,
        AnalysisPayloadJson NVARCHAR(MAX) NULL,
        AnalyzedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ResumeAnalyses_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
        CONSTRAINT FK_ResumeAnalyses_ResumeVault FOREIGN KEY (ResumeId) REFERENCES dbo.ResumeVault(ResumeId) ON DELETE NO ACTION
    );
    CREATE INDEX IX_ResumeAnalyses_UserId ON dbo.ResumeAnalyses(UserId, AnalyzedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.ResumeDrafts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ResumeDrafts (
        DraftId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        DraftTitle NVARCHAR(200) NOT NULL DEFAULT 'Untitled Resume',
        TemplateName NVARCHAR(60) NOT NULL DEFAULT 'modern',
        DraftDataJson NVARCHAR(MAX) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ResumeDrafts_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE
    );
    CREATE INDEX IX_ResumeDrafts_UserId ON dbo.ResumeDrafts(UserId, UpdatedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.InterviewHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.InterviewHistory (
        InterviewId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        QuestionId NVARCHAR(100) NULL,
        QuestionText NVARCHAR(MAX) NULL,
        Category NVARCHAR(80) NOT NULL,
        Difficulty NVARCHAR(40) NULL,
        AnswerText NVARCHAR(MAX) NULL,
        EvaluationScore INT NOT NULL,
        Feedback NVARCHAR(MAX) NULL,
        EvaluationPayloadJson NVARCHAR(MAX) NULL,
        EvaluationDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_InterviewHistory_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE
    );
    CREATE INDEX IX_InterviewHistory_UserId ON dbo.InterviewHistory(UserId, EvaluationDate DESC);
END
GO

IF OBJECT_ID(N'dbo.JobMatchHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.JobMatchHistory (
        MatchId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        ResumeId INT NULL,
        JobTitle NVARCHAR(200) NULL,
        JobDescription NVARCHAR(MAX) NOT NULL,
        OverallScore INT NOT NULL,
        ReadinessLabel NVARCHAR(80) NULL,
        DimensionScores NVARCHAR(MAX) NULL,
        MatchedSkills NVARCHAR(MAX) NULL,
        MissingSkills NVARCHAR(MAX) NULL,
        MatchPayloadJson NVARCHAR(MAX) NULL,
        MatchDate DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_JobMatchHistory_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
        CONSTRAINT FK_JobMatchHistory_ResumeVault FOREIGN KEY (ResumeId) REFERENCES dbo.ResumeVault(ResumeId) ON DELETE NO ACTION
    );
    CREATE INDEX IX_JobMatchHistory_UserId ON dbo.JobMatchHistory(UserId, MatchDate DESC);
END
GO

IF OBJECT_ID(N'dbo.CareerRoadmaps', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CareerRoadmaps (
        RoadmapId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        TargetRole NVARCHAR(150) NOT NULL,
        ExperienceLevel NVARCHAR(80) NULL,
        RoadmapMetaJson NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_CareerRoadmaps_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE
    );
    CREATE INDEX IX_CareerRoadmaps_UserId ON dbo.CareerRoadmaps(UserId, UpdatedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.RoadmapSkills', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RoadmapSkills (
        SkillId INT IDENTITY(1,1) PRIMARY KEY,
        RoadmapId INT NOT NULL,
        UserId INT NOT NULL,
        SkillName NVARCHAR(200) NOT NULL,
        Category NVARCHAR(100) NOT NULL DEFAULT 'General',
        Priority NVARCHAR(40) NOT NULL DEFAULT 'Medium',
        Status NVARCHAR(30) NOT NULL DEFAULT 'not_started',
        IsKnown BIT NOT NULL DEFAULT 0,
        EstimatedHours DECIMAL(6,2) NOT NULL DEFAULT 4,
        CompletedAt DATETIME2 NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_RoadmapSkills_CareerRoadmaps FOREIGN KEY (RoadmapId) REFERENCES dbo.CareerRoadmaps(RoadmapId) ON DELETE CASCADE,
        CONSTRAINT FK_RoadmapSkills_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION,
        CONSTRAINT CK_RoadmapSkills_Status CHECK (Status IN ('not_started', 'in_progress', 'completed'))
    );
    CREATE INDEX IX_RoadmapSkills_RoadmapId ON dbo.RoadmapSkills(RoadmapId);
    CREATE INDEX IX_RoadmapSkills_UserId ON dbo.RoadmapSkills(UserId);
END
GO

IF OBJECT_ID(N'dbo.StudyActivity', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.StudyActivity (
        StudySessionId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        Subject NVARCHAR(150) NOT NULL,
        Duration DECIMAL(6,2) NOT NULL,
        SessionDate DATE NOT NULL,
        Notes NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_StudyActivity_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
        CONSTRAINT CK_StudyActivity_Duration CHECK (Duration > 0)
    );
    CREATE INDEX IX_StudyActivity_UserId_Date ON dbo.StudyActivity(UserId, SessionDate DESC);
END
GO

IF OBJECT_ID(N'dbo.ActivityLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ActivityLogs (
        ActivityId INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        Title NVARCHAR(300) NOT NULL,
        Category NVARCHAR(80) NOT NULL,
        Badge NVARCHAR(50) NULL,
        Variant NVARCHAR(30) NOT NULL DEFAULT 'neutral',
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ActivityLogs_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE
    );
    CREATE INDEX IX_ActivityLogs_UserId ON dbo.ActivityLogs(UserId, CreatedAt DESC);
END
GO
