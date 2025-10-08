# TODO: Modify CSDashboard for Admission Flow

## Tasks
- [x] Modify handleStartService function in frontend/src/pages/CSDashboard.jsx for connectionType === 'admission'
  - Replace `await api.queue.resolveTicket(ticketId, \`Converted to admission applicant in pipeline\`)` with `await api.queue.startService(ticketId)`
  - Update success message to 'Applicant created successfully. Please resolve the ticket when done.'
- [ ] Test the admission flow: Start Service -> Select Pipeline -> Create Applicant -> Resolve Ticket button appears -> Click to end queue ticket
