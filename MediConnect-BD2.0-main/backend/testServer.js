const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ status: 'OK', message: 'Test server works' }));
});

const PORT = 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Test server listening on port ${PORT}`);
    console.log(`Try: http://localhost:${PORT}`);
});

server.on('error', (err) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use!`);
    }
});

// Keep the process alive
process.on('SIGINT', () => {
    console.log('\nShutting down test server...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
