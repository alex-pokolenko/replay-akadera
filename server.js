const http = require('http');
const fs = require('fs');
const path = require('path');
const { fetchRadioPage, parseSongs, filterSongsByTimeRange } = require('./lib/songs');
const { startScheduler } = require('./scheduler');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
};

const server = http.createServer(async (req, res) => {
    // Songs API — same logic as lambda/songs.js but using req/res for local dev
    if (req.url.startsWith('/api/songs')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        try {
            const params = Object.fromEntries(new URL(req.url, `http://localhost:${PORT}`).searchParams);
            const html = await fetchRadioPage();
            let songs = parseSongs(html);

            if (params.from && params.to) {
                songs = filterSongsByTimeRange(songs, params.from, params.to);
            }

            res.writeHead(200);
            return res.end(JSON.stringify({ songs }));
        } catch (error) {
            console.error('Failed to fetch songs:', error);
            res.writeHead(500);
            return res.end(JSON.stringify({ error: `Failed to fetch songs: ${error.message}` }));
        }
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
