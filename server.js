const http = require('http');
const fs = require('fs');
const path = require('path');
const handler = require('./api/songs');
const cronHandler = require('./api/cron/export');
const { startScheduler } = require('./scheduler');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
};

const server = http.createServer(async (req, res) => {
    // API routes
    if (req.url.startsWith('/api/cron/export')) {
        return cronHandler(req, res);
    }
    if (req.url.startsWith('/api/songs')) {
        req.query = Object.fromEntries(new URL(req.url, `http://localhost:${PORT}`).searchParams);
        return handler(req, res);
    }

    // Static files from public/
    const filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
    const ext = path.extname(filePath);

    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(content);
    } catch {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    startScheduler();
});
