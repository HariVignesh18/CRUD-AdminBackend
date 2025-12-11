-- Create Database
CREATE DATABASE IF NOT EXISTS sample_admin_poc;
USE sample_admin_poc;

-- Table: countries
CREATE TABLE IF NOT EXISTS countries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: zipcode_formats
CREATE TABLE IF NOT EXISTS zipcode_formats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL,
    format VARCHAR(50) NOT NULL,
    regex VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Table: efp_languages
CREATE TABLE IF NOT EXISTS efp_languages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    iso_code VARCHAR(5) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seeds
INSERT INTO countries (name, code) VALUES 
('United States', 'USA'),
('India', 'IND'),
('Germany', 'DEU');

INSERT INTO zipcode_formats (country_code, format, regex) VALUES 
('USA', '99999', '^\\d{5}$'),
('IND', '999999', '^\\d{6}$');

INSERT INTO efp_languages (name, iso_code, is_active) VALUES 
('English', 'en', 1),
('Spanish', 'es', 1),
('French', 'fr', 1);
