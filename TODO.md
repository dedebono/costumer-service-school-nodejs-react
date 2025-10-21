# TODO: Optimize setEditDynamicDetails Save Operation

## Pending Tasks
- [ ] Test the save operation on localhost and VPS to compare performance

## Completed Tasks
- [x] Analyze code and identify bottleneck (sequential API calls in saveEditSteps)
- [x] Create plan to optimize by parallelizing calls and adding logging
- [x] Refactor saveEditSteps in Supervisor.jsx to parallelize API calls using Promise.all
- [x] Add console.time logging around the save operation to measure total time
- [x] Add SweetAlert loading notification during save
