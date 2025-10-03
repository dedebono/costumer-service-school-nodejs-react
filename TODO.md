# TODO: Add Queue Feature to Customer Service App

## Phase 1: Database Schema Updates
- [ ] Update schema.sql: Add services table (id, name, code_prefix, is_active, sla_warn_minutes)
- [ ] Add counters table (id, name, allowed_service_ids as TEXT/JSON)
- [ ] Rename queue to queue_tickets: id, service_id, number, customer_id, status (WAITING, CALLED, IN_SERVICE, DONE, NO_SHOW, CANCELED), claimed_by, called_at, started_at, finished_at, no_show_at, notes
- [ ] Add support_tickets table (id, queue_ticket_id, summary, details, status, category, attachments_json, created_by, resolved_at)
- [ ] Update customers: add phone_verified BOOLEAN DEFAULT 0 (no verified_at)
- [ ] Update users: add assigned_counter_id INTEGER
- [ ] Add settings table (id, key, value) for SLAs, business hours, etc.
- [ ] Run migration script to update database

## Phase 2: Backend Models
- [x] Create backend/src/models/service.js: CRUD for services
- [x] Create backend/src/models/counter.js: CRUD for counters
- [x] Create backend/src/models/queueTicket.js: Functions for create, claim, start, resolve, requeue, no-show, get queue by service, etc.
- [x] Create backend/src/models/supportTicket.js: CRUD for support tickets
- [x] Create backend/src/models/setting.js: Get/set settings
- [x] Update backend/src/models/ticket.js: Deprecate old statuses, integrate with queue (no changes needed, queue is separate system)
- [x] Update backend/src/models/customer.js: Add phone_verified, auto-create on queue ticket creation
- [x] Update backend/src/models/user.js: Add assigned_counter_id

## Phase 3: Backend Routes
- [x] Create backend/src/routes/queueRoutes.js: Claim ticket, start service, resolve, requeue, no-show, get queue status
- [x] Create backend/src/routes/serviceRoutes.js: Admin CRUD for services
- [x] Create backend/src/routes/counterRoutes.js: Admin CRUD for counters
- [x] Create backend/src/routes/kioskRoutes.js: Customer intake, create queue ticket (check/create customer by phone)
- [x] Create backend/src/routes/adminRoutes.js: Settings, reports
- [x] Update backend/src/routes/ticketRoutes.js: Link to queue tickets (no changes needed, queue is separate system)
- [x] Update backend/server.js: Add new routes, integrate socket.io for websockets

## Phase 4: Frontend API and Components
- [x] Update frontend/src/api.js: Add endpoints for queue, services, counters, kiosk
- [x] Create frontend/src/pages/Kiosk.jsx: Intake form, service selection, confirmation, live status
- [x] Create frontend/src/pages/CSDashboard.jsx: Queue list, claim, active ticket with support form
- [x] Create frontend/src/pages/AdminSetup.jsx: Services, counters, users, settings
- [x] Update frontend/src/pages/CustomerService.jsx: Add queue tabs
- [x] Create components for queue display, live status, etc.
- [x] Integrate socket.io client for real-time updates

## Phase 5: Authentication and Permissions
- [x] Ensure middleware checks for ADMIN on setup routes, CS on queue operations
- [x] Update role assignments as needed

## Phase 6: Testing and Rollout
- [x] Write unit tests for new models
- [x] Manual test customer flow: Kiosk -> Queue -> CS claim -> Resolve
- [x] Test admin setup
- [x] Seed initial services and counters
- [x] Update README with queue feature docs
