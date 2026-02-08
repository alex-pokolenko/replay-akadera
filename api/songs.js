const { fetchRadioPage, parseSongs, filterSongsByTimeRange } = require('../lib/songs');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    if (req.method !== 'GET') {
        res.statusCode = 405;
        return res.end(JSON.stringify({ error: 'Method not allowed' }));
    }

    try {
        const html = await fetchRadioPage();
        let songs = parseSongs(html);

        const { from, to } = req.query || {};
        if (from && to) {
            songs = filterSongsByTimeRange(songs, from, to);
        }

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({ songs }));
    } catch (error) {
        console.error('Failed to fetch songs:', error);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 500;
        res.end(JSON.stringify({ error: `Failed to fetch songs: ${error.message}` }));
    }
};
