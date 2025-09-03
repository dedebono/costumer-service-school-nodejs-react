module.exports = {
openapi: '3.0.3',
info: { title: 'Ticketing API', version: '1.0.0' },
paths: {
'/api/auth/register': { post: {/* ...requestBody: username, email, password... */} },
'/api/auth/login': { post: {/* ...email, password... */} },
'/api/tickets': { post: {/* ... */} },
'/api/tickets/{id}': {
get: { parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: 'a3f2c8f2-1d3e-4b9d-9b3c-0a6f8f2d1e9c' }] },
delete: { /* ... */ },
},
'/api/tickets/{id}/status': { patch: {/* ... */} },
'/api/users': { get: {/* role Supervisor */} },
},
};