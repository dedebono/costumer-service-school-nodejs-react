-- Migration: Parent Document Upload System
-- Run this migration to add support for secure parent upload links

USE customer_service;

-- 1) upload_tokens - Store secure tokens for parent access
CREATE TABLE IF NOT EXISTS upload_tokens (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_id      BIGINT UNSIGNED NOT NULL,
  token             VARCHAR(64) NOT NULL UNIQUE,
  expires_at        DATETIME NOT NULL,
  is_used           TINYINT(1) NOT NULL DEFAULT 0,
  created_by        BIGINT UNSIGNED NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_upload_tokens_token (token),
  KEY idx_upload_tokens_applicant (applicant_id),
  CONSTRAINT fk_upload_tokens_applicant
    FOREIGN KEY (applicant_id) REFERENCES applicants(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_upload_tokens_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2) Add pending_data column to applicants for temporary parent edits
ALTER TABLE applicants 
  ADD COLUMN IF NOT EXISTS pending_data JSON NULL,
  ADD COLUMN IF NOT EXISTS pending_data_at DATETIME NULL;

-- 3) Modify applicant_documents to support review workflow
ALTER TABLE applicant_documents 
  ADD COLUMN IF NOT EXISTS status ENUM('pending','approved','rejected') DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by BIGINT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255) NULL;

-- Add FK for reviewed_by
ALTER TABLE applicant_documents 
  ADD CONSTRAINT IF NOT EXISTS fk_appdocs_reviewed_by
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL;
