-- Customer Service Queue and Ticketing System (MySQL 8.0)

-- Use your DB first
USE customer_service;

-- =====================
-- 1) USERS (auth base)
-- =====================
CREATE TABLE IF NOT EXISTS users (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username          VARCHAR(191) NOT NULL UNIQUE,
  email             VARCHAR(191) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  role              ENUM('CustomerService','Supervisor','ADMIN') NOT NULL,
  assigned_counter_id BIGINT UNSIGNED NULL,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================
-- 2) CUSTOMERS
-- =====================
CREATE TABLE IF NOT EXISTS customers (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(191) NOT NULL UNIQUE,
  phone             VARCHAR(20),
  phone_verified    TINYINT(1) NOT NULL DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customers_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================
-- 3) QUEUE_CUSTOMERS (kiosk, email optional)
-- =====================
CREATE TABLE IF NOT EXISTS queue_customers (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name              VARCHAR(255),
  email             VARCHAR(191),
  phone             VARCHAR(20) NOT NULL,
  phone_verified    TINYINT(1) NOT NULL DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_queue_customers_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================
-- 4) SERVICES
-- =====================
CREATE TABLE IF NOT EXISTS services (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name              VARCHAR(255) NOT NULL,
  code_prefix       VARCHAR(64) NOT NULL,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  sla_warn_minutes  INT DEFAULT 10,
  connection_type   ENUM('none','admission','ticket') NOT NULL DEFAULT 'none',
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_services_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================
-- 5) COUNTERS
-- =====================
CREATE TABLE IF NOT EXISTS counters (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name              VARCHAR(255) NOT NULL,
  allowed_service_ids TEXT, -- comma-separated IDs (keep as text for now)
  is_active         TINYINT(1) NOT NULL DEFAULT 1,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_counters_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- set the FK from users.assigned_counter_id (needs counters to exist)
ALTER TABLE users
  ADD CONSTRAINT fk_users_counter
  FOREIGN KEY (assigned_counter_id) REFERENCES counters(id)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- =====================
-- 6) TICKETS (app tickets)
-- =====================
CREATE TABLE IF NOT EXISTS tickets (
  id                VARCHAR(255) NOT NULL,
  customer_id       BIGINT UNSIGNED,
  title             TEXT NOT NULL,
  description       TEXT,
  priority          ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  status            ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  category          TEXT,
  assigned_to       TEXT,
  created_by        BIGINT UNSIGNED,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  resolved_at       TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_tickets_status (status),
  KEY idx_tickets_priority (priority),
  KEY idx_tickets_customer_id (customer_id),
  CONSTRAINT fk_tickets_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_tickets_createdby
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================
-- 7) QUEUE_TICKETS (renamed from queue)
-- =====================
CREATE TABLE IF NOT EXISTS queue_tickets (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  service_id        BIGINT UNSIGNED NOT NULL,
  number            VARCHAR(64) NOT NULL,
  customer_id       BIGINT UNSIGNED NULL,
  queue_customer_id BIGINT UNSIGNED NULL,
  status            ENUM('WAITING','CALLED','IN_SERVICE','DONE','NO_SHOW','CANCELED') NOT NULL DEFAULT 'WAITING',
  claimed_by        BIGINT UNSIGNED NULL,
  called_at         DATETIME NULL,
  started_at        DATETIME NULL,
  finished_at       DATETIME NULL,
  no_show_at        DATETIME NULL,
  timer_start       DATETIME NULL,
  timer_end         DATETIME NULL,
  notes             TEXT,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_queue_tickets_status (status),
  KEY idx_queue_tickets_service (service_id),
  KEY idx_queue_tickets_customer (customer_id),
  KEY idx_queue_tickets_queue_customer (queue_customer_id),
  CONSTRAINT fk_qt_service
    FOREIGN KEY (service_id) REFERENCES services(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_qt_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_qt_queue_customer
    FOREIGN KEY (queue_customer_id) REFERENCES queue_customers(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_qt_claimed_by
    FOREIGN KEY (claimed_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================
-- 8) SUPPORT_TICKETS
-- =====================
CREATE TABLE IF NOT EXISTS support_tickets (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  queue_ticket_id   BIGINT UNSIGNED NOT NULL,
  summary           TEXT,
  details           TEXT,
  status            ENUM('OPEN','IN_PROGRESS','RESOLVED','CLOSED') NOT NULL DEFAULT 'OPEN',
  category          TEXT,
  attachments_json  JSON NULL,
  created_by        BIGINT UNSIGNED NOT NULL,
  resolved_at       DATETIME NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_support_qt (queue_ticket_id),
  KEY idx_support_status (status),
  CONSTRAINT fk_support_qt
    FOREIGN KEY (queue_ticket_id) REFERENCES queue_tickets(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_support_createdby
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================
-- 9) SETTINGS (key/value)
-- =====================
CREATE TABLE IF NOT EXISTS settings (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `key`             VARCHAR(191) NOT NULL UNIQUE,
  `value`           TEXT NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================
-- 10) TICKET HISTORY
-- =====================
CREATE TABLE IF NOT EXISTS ticket_history (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id         VARCHAR(255) NOT NULL,
  action            TEXT NOT NULL,
  old_value         TEXT,
  new_value         TEXT,
  changed_by        VARCHAR(191),
  changed_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_th_ticket (ticket_id),
  CONSTRAINT fk_th_ticket
    FOREIGN KEY (ticket_id) REFERENCES tickets(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================================================
-- =========== Admission System (PSB) Tables ===========
-- =====================================================

-- 11) pipelines
CREATE TABLE IF NOT EXISTS pipelines (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(255) NOT NULL,
  year          INT NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 12) steps
CREATE TABLE IF NOT EXISTS steps (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pipeline_id   BIGINT UNSIGNED NOT NULL,
  title         VARCHAR(255) NOT NULL,
  slug          VARCHAR(191) NOT NULL,
  ord           INT NOT NULL,
  is_final      TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_steps_pipeline_slug (pipeline_id, slug),
  UNIQUE KEY uq_steps_pipeline_ord  (pipeline_id, ord),
  KEY idx_steps_pipeline (pipeline_id),
  CONSTRAINT fk_steps_pipeline
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 13) step_requirements
CREATE TABLE IF NOT EXISTS step_requirements (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  step_id       BIGINT UNSIGNED NOT NULL,
  doc_key       VARCHAR(191) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stepreq (step_id, doc_key),
  CONSTRAINT fk_stepreq_step
    FOREIGN KEY (step_id) REFERENCES steps(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 14) applicants
CREATE TABLE IF NOT EXISTS applicants (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pipeline_id      BIGINT UNSIGNED NOT NULL,
  current_step_id  BIGINT UNSIGNED NOT NULL,
  name             VARCHAR(255) NOT NULL,
  nisn             VARCHAR(64),
  birthdate        DATE NULL,
  parent_phone     VARCHAR(32),
  email            VARCHAR(191),
  address          TEXT,
  notes            TEXT,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_applicants_pipeline (pipeline_id),
  CONSTRAINT fk_applicants_pipeline
    FOREIGN KEY (pipeline_id) REFERENCES pipelines(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_applicants_step
    FOREIGN KEY (current_step_id) REFERENCES steps(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 15) applicant_documents
CREATE TABLE IF NOT EXISTS applicant_documents (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_id  BIGINT UNSIGNED NOT NULL,
  doc_key       VARCHAR(191) NOT NULL,
  filename      VARCHAR(255),
  url           TEXT,
  mime          VARCHAR(127),
  uploaded_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_appdocs (applicant_id, doc_key),
  KEY idx_appdocs_applicant (applicant_id),
  CONSTRAINT fk_appdocs_applicant
    FOREIGN KEY (applicant_id) REFERENCES applicants(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 16) applicant_history
CREATE TABLE IF NOT EXISTS applicant_history (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_id  BIGINT UNSIGNED NOT NULL,
  from_step_id  BIGINT UNSIGNED NULL,
  to_step_id    BIGINT UNSIGNED NOT NULL,
  by_admin_id   BIGINT UNSIGNED NOT NULL,
  note          TEXT,
  at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_history_applicant (applicant_id),
  CONSTRAINT fk_hist_applicant
    FOREIGN KEY (applicant_id) REFERENCES applicants(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_hist_fromstep
    FOREIGN KEY (from_step_id) REFERENCES steps(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_hist_tostep
    FOREIGN KEY (to_step_id) REFERENCES steps(id)
    ON UPDATE CASCADE,
  CONSTRAINT fk_hist_admin
    FOREIGN KEY (by_admin_id) REFERENCES users(id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 17) step_dynamic_details
CREATE TABLE IF NOT EXISTS step_dynamic_details (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  step_id       BIGINT UNSIGNED NOT NULL,
  `key`         VARCHAR(191) NOT NULL,
  `type`        ENUM('text','checkbox','select') NOT NULL,
  `required`    TINYINT(1) NOT NULL DEFAULT 0,
  label         VARCHAR(255) NOT NULL,
  options       TEXT,
  PRIMARY KEY (id),
  UNIQUE KEY uq_stepdyn (step_id, `key`),
  KEY idx_step_dynamic_details_step (step_id),
  CONSTRAINT fk_stepdyn_step
    FOREIGN KEY (step_id) REFERENCES steps(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 18) applicant_dynamic_details
CREATE TABLE IF NOT EXISTS applicant_dynamic_details (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  applicant_id  BIGINT UNSIGNED NOT NULL,
  detail_key    VARCHAR(191) NOT NULL,
  `value`       TEXT,
  PRIMARY KEY (id),
  UNIQUE KEY uq_appdyn (applicant_id, detail_key),
  KEY idx_applicant_dynamic_details_applicant (applicant_id),
  CONSTRAINT fk_appdyn_app
    FOREIGN KEY (applicant_id) REFERENCES applicants(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =====================
-- 19) PASSWORD RESET REQUESTS
-- =====================
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         BIGINT UNSIGNED NOT NULL,
  status          ENUM('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
  reset_token     VARCHAR(255),
  token_expires_at DATETIME NULL,
  requested_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_by     BIGINT UNSIGNED NULL,
  approved_at     DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_prr_user (user_id),
  CONSTRAINT fk_prr_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_prr_approver
    FOREIGN KEY (approved_by) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
