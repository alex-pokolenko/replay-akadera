const cheerio = require('cheerio');

const RADIO_URL = 'https://akadera.bialystok.pl/bylo-grane/';

async function fetchRadioPage() {
    const url = `${RADIO_URL}?_=${Date.now()}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Radio Akadera returned HTTP ${response.status}`);
    }
    return await response.text();
}

function parseSongs(html) {
    const $ = cheerio.load(html);
    const songs = [];

    // Page uses flex-column-reverse, so DOM order is oldest first — reverse to get freshest first
    const items = $('ul.audio-lista li, .audio-lista li').toArray().reverse();

    for (const li of items) {
        const text = $(li).text().trim();
        const parsed = parseSongText(text);
        if (parsed) {
            songs.push(parsed);
        }
    }

    // Fallback: try regex on raw HTML if DOM parsing didn't work
    if (songs.length === 0) {
        const regex = /<li>(\d{2}:\d{2})\s*(?:&nbsp;)?\s*<strong>(.+?)\s*-\s*(.+?)<\/strong><\/li>/gi;
        const allMatches = [];
        let match;

        while ((match = regex.exec(html)) !== null) {
            allMatches.push({
                time: match[1],
                artist: decodeHtmlEntities($, match[2].trim()),
                title: decodeHtmlEntities($, match[3].trim()),
            });
        }

        songs.push(...allMatches.reverse());
    }

    return songs;
}

function parseSongText(text) {
    // Match: "HH:MM  Artist - Title" or "HH:MM Artist - Title"
    const match = text.match(/^(\d{2}:\d{2})\s+(.+?)\s+-\s+(.+)$/);

    if (match) {
        return {
            time: match[1],
            artist: match[2].trim(),
            title: match[3].trim(),
        };
    }

    return null;
}

function decodeHtmlEntities($, text) {
    return cheerio.load(`<p>${text}</p>`)('p').text();
}

function filterSongsByTimeRange(songs, fromTime, toTime) {
    if (!fromTime || !toTime) return songs;

    return songs.filter(song => {
        return song.time >= fromTime && song.time <= toTime;
    });
}

module.exports = { fetchRadioPage, parseSongs, filterSongsByTimeRange };
