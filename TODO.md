# TODO: Add Admission Backend Route and Frontend

## Steps to Complete

- [x] Update backend/schema.sql to include admission tables (pipelines, steps, step_requirements, applicants, applicant_documents, applicant_history) and modify users table to allow 'ADMIN' role.
- [x] Create backend/src/models/pipeline.js for pipeline-related database operations.
- [x] Create backend/src/models/step.js for step-related database operations.
- [x] Create backend/src/models/applicant.js for applicant-related database operations.
- [x] Create backend/src/routes/admissionRoutes.js with routes for pipelines (PUT /:id/steps) and applicants (POST /:id/move), using auth middleware.
- [x] Update backend/server.js to include app.use('/api/admission', admissionRoutes);
- [x] Add additional backend routes for fetching pipelines and applicants, and creating them.
- [x] Create frontend/src/pages/Admission.jsx for admission management.
- [x] Create frontend components: PipelineBuilder, ApplicantsBoard, SortableItem, StepColumn for drag-and-drop functionality.
- [x] Update frontend/src/pages/CustomerService.jsx to include Admission tab.
- [x] Run database migration or recreate database.sqlite to apply schema changes.
- [x] Test the new admission routes and frontend.
