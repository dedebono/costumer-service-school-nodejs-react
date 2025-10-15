# TODO: Fix Timezone Conversion for Queue Ticket Creation

## Tasks
- [x] Modify backend/src/models/queueTicket.js to use UTC time for business hours check instead of server local time
- [ ] Test queue ticket creation during configured business hours
- [ ] Verify that tickets can be created successfully when within business hours in the selected timezone
