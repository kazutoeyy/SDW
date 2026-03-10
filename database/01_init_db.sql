-- ==========================================
-- Six Degrees of Wikipedia - SQL Server 2019 Init
-- Description: Khai bao DB luu tru BFS Paths va NextAuth
-- ==========================================

-- 1. Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'SixDegreesWiki')
BEGIN
    CREATE DATABASE SixDegreesWiki;
END
GO

USE SixDegreesWiki;
GO

-- ==========================================
-- A. NEXTAUTH V5 TABLES (Chuan Authentication)
-- ==========================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        name NVARCHAR(255),
        email NVARCHAR(255) UNIQUE,
        emailVerified DATETIME2,
        image NVARCHAR(MAX)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Accounts')
BEGIN
    CREATE TABLE Accounts (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        userId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(id) ON DELETE CASCADE,
        type NVARCHAR(255) NOT NULL,
        provider NVARCHAR(255) NOT NULL,
        providerAccountId NVARCHAR(255) NOT NULL,
        refresh_token NVARCHAR(MAX),
        access_token NVARCHAR(MAX),
        expires_at INT,
        token_type NVARCHAR(255),
        scope NVARCHAR(255),
        id_token NVARCHAR(MAX),
        session_state NVARCHAR(255),
        CONSTRAINT UQ_Provider_Account UNIQUE (provider, providerAccountId)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Sessions')
BEGIN
    CREATE TABLE Sessions (
        id NVARCHAR(50) NOT NULL PRIMARY KEY,
        sessionToken NVARCHAR(255) NOT NULL UNIQUE,
        userId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(id) ON DELETE CASCADE,
        expires DATETIME2 NOT NULL
    );
END
GO

-- ==========================================
-- B. SQL GRAPH TABLES (Core Data: Nodes & Edges)
-- ==========================================

-- B1. Bảng NODE: Lưu trữ bài viết Wikipedia (Articles)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Articles')
BEGIN
    CREATE TABLE Articles (
        ArticleId INT NOT NULL PRIMARY KEY,   -- Map với Wikipedia PageID
        Title NVARCHAR(500) NOT NULL,         -- Tên bài viết
        Url NVARCHAR(1000) NOT NULL,          -- Full URL
        Language NVARCHAR(10) NOT NULL,       -- 'vi' hoặc 'en'
        CreatedAt DATETIME2 DEFAULT GETDATE()
    ) AS NODE;
    
    -- Index de query node cuc nhanh
    CREATE UNIQUE INDEX IX_Articles_Title_Lang ON Articles(Title, Language);
END
GO

-- B2. Bảng EDGE: Lưu trữ các liên kết Wikilink (Chữ xanh nối 2 bài)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Wikilinks')
BEGIN
    CREATE TABLE Wikilinks (
        Weight INT DEFAULT 1,                 -- Chi phí di chuyển (mặc định = 1 bước)
        SessionId NVARCHAR(255),              -- Trace lại phiên query BFS tạo ra Link này
        CreatedAt DATETIME2 DEFAULT GETDATE()
    ) AS EDGE;
END
GO

-- ==========================================
-- C. ANALYTICS TABLES (Heatmap & User History)
-- ==========================================

-- Lưu trữ lịch sử tìm kiếm của người dùng
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SearchHistory')
BEGIN
    CREATE TABLE SearchHistory (
        HistoryId INT IDENTITY(1,1) PRIMARY KEY,
        UserId NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES Users(id) ON DELETE CASCADE,
        SourceTitle NVARCHAR(500) NOT NULL,
        TargetTitle NVARCHAR(500) NOT NULL,
        Language NVARCHAR(10) NOT NULL,
        Degrees INT NOT NULL,                 -- Số khoảng cách N degrees
        SearchTimeMs INT NOT NULL,            -- Execution time cua BFS
        IsCachedResult BIT DEFAULT 0,         -- Đánh dấu lấy từ Redis/SQL thay vì Live
        CreatedAt DATETIME2 DEFAULT GETDATE()
    );
END
GO

-- Lưu trữ thống kê tần suất một Wikipedia Page làm điểm trung chuyển (Cầu nối)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'HeatmapStats')
BEGIN
    CREATE TABLE HeatmapStats (
        ArticleId INT NOT NULL FOREIGN KEY REFERENCES Articles(ArticleId) ON DELETE CASCADE,
        PassThroughCount INT DEFAULT 1,       -- Số lần bài viết nằm trên một Path thành công
        LastPassedAt DATETIME2 DEFAULT GETDATE(),
        PRIMARY KEY (ArticleId)
    );
END
GO
