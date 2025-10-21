# TODO: Add Progress Meter to Applicant Cards

## Overview
Add a progress meter to the applicant card in DraggableApplicant.jsx that shows how many required stepDynamicDetails are filled for the current step, indicating readiness to move to the next step.

## Steps to Complete

### 1. Update ApplicantsBoard.jsx
- [ ] Add state for `stepDynamicDetailsMap` (object keyed by stepId to cache stepDynamicDetails)
- [ ] Add state for `applicantDynamicDetailsMap` (object keyed by applicantId to cache applicantDynamicDetails)
- [ ] Add useEffect to load stepDynamicDetails for `selectedStepId` if not cached
- [ ] Add logic in useEffect or separate function to load applicantDynamicDetails for each applicant in the selected step if not cached
- [ ] Add `calculateProgress` function: for an applicant, get stepDetails from map, get appDetails from map, count filled required fields vs total required fields
- [ ] Pass progress object `{filled, total}` to DraggableApplicant for each applicant
- [ ] Update `applicantDynamicDetailsMap` after saving in `handleSaveNotes` to keep progress accurate

### 2. Update DraggableApplicant.jsx
- [ ] Add `progress` prop to component (object with `filled` and `total`)
- [ ] Render a progress bar below the applicant name if `total > 0` (e.g., green filled bar over gray background, showing percentage)

### 3. Testing and Verification
- [ ] Test that progress meter updates correctly after editing details in the modal
- [ ] Ensure performance with multiple applicants (verify caching prevents excessive API calls)
- [ ] Verify that auto-move logic in ApplicantsBoard.jsx aligns with progress display (all required filled means 100% progress)
- [ ] Check UI: progress bar is visually clear and fits within the card layout

## Dependent Files
- frontend/src/features/admission/ApplicantsBoard.jsx
- frontend/src/features/admission/DraggableApplicant.jsx

## Notes
- Progress is based on required stepDynamicDetails for the current step.
- Caching in maps to avoid reloading data unnecessarily.
- Progress bar: simple div with background color, width based on (filled/total)*100%.
