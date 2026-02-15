// Lambda handler for the songs API.
// Invoked by API Gateway (HTTP API) on GET /songs.
// Same logic as the old api/songs.js but in Lambda's event/response format.

const { fetchRadioPage, parseSongs, filterSongsByTimeRange } = require('../lib/songs');

exports.handler = async (event) => {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };

    try {
        const params = event.queryStringParameters || {};
        const html = await fetchRadioPage();
        let songs = parseSongs(html);

        if (params.from && params.to) {
            songs = filterSongsByTimeRange(songs, params.from, params.to);
        }

        return { statusCode: 200, headers, body: JSON.stringify({ songs }) };
    } catch (error) {
        console.error('Failed to fetch songs:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: `Failed to fetch songs: ${error.message}` }),
        };
    }
};
