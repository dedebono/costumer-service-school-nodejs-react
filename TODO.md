# TODO: Add "All" Option to CSDashboard for Displaying All Queues

## Steps to Complete:
- [x] Add "All Services" option to the service select dropdown in CSDashboard.jsx
- [x] Modify the onChange handler for the service select to set selectedService to "all" when "All Services" is selected
- [x] Update loadQueue function to fetch and combine queues from all services when selectedService is "all"
- [x] Adjust socket logic in useEffect to join queues for all services when selectedService is "all"
- [x] Update exportCSV function to handle the "all" case by exporting combined queue data
- [x] Ensure activeTicket logic works correctly when displaying all queues (e.g., find active ticket across all services)
- [x] Test the changes to ensure "all" displays combined queues without errors

## Additional Changes for CSCompleted.jsx:
- [x] Simplify the ticket display in filteredTickets to show only number and name
- [x] Make tickets clickable to open a modal with full details
- [x] Add modal component import and state management
- [x] Implement modal with comprehensive ticket information
