-- GPA Calculator Database Schema
-- For XAMPP MySQL

-- Create database
CREATE DATABASE IF NOT EXISTS gpa_calculator;
USE gpa_calculator;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    credits DECIMAL(3,1) NOT NULL,
    year INT NOT NULL,
    semester INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_year_semester (user_id, year, semester)
);

-- Results Table
CREATE TABLE IF NOT EXISTS results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT NOT NULL,
    grade_point DECIMAL(3,2) NOT NULL,
    status ENUM('Completed', 'Incomplete') DEFAULT 'Completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_subject_result (subject_id)
);

-- Insert sample user for testing
INSERT INTO users (name, email, password) VALUES 
('Test User', 'test@example.com', '$2a$10$XqZ9J8mP3Km4YcH.7dJ4PO8pjvH8yK5xY7L2qW9xN3mZ8vB7fT6vO');
-- Password is: password123

-- Sample data for testing
-- Uncomment below to add test subjects and results
/*
INSERT INTO subjects (user_id, subject_name, credits, year, semester) VALUES
(1, 'Mathematics I', 3.0, 1, 1),
(1, 'Physics I', 4.0, 1, 1),
(1, 'Chemistry I', 3.0, 1, 1),
(1, 'English I', 2.0, 1, 1),
(1, 'Programming Fundamentals', 4.0, 1, 1),
(1, 'Mathematics II', 3.0, 1, 2),
(1, 'Physics II', 4.0, 1, 2),
(1, 'Data Structures', 4.0, 1, 2);

INSERT INTO results (subject_id, grade_point, status) VALUES
(1, 3.7, 'Completed'),
(2, 3.3, 'Completed'),
(3, 4.0, 'Completed'),
(4, 3.5, 'Completed'),
(5, 3.8, 'Completed'),
(6, 3.9, 'Completed'),
(7, 3.4, 'Completed'),
(8, 4.0, 'Completed');
*/
