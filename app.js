const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
];
let currentProxyIndex = 0;

const RADIO_URL = 'https://akadera.bialystok.pl/bylo-grane/';

const downloadBtn = document.getElementById('downloadBtn');
const fetchBtn = document.getElementById('fetchBtn');
const statusDiv = document.getElementById('status');
const songListSection = document.getElementById('songList');
const songsUl = document.getElementById('songs');
const timeFromInput = document.getElementById('timeFrom');
const timeToInput = document.getElementById('timeTo');

let fetchedSongs = [];

downloadBtn.addEventListener('click', handleDownload);
fetchBtn.addEventListener('click', () => fetchSongs());

// Set default time range (last hour) and fetch on load
setDefaultTimeRange();
fetchSongs();

function setDefaultTimeRange() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    timeToInput.value = formatTime(now);
    timeFromInput.value = formatTime(oneHourAgo);
}

function formatTime(date) {
    return date.toTimeString().slice(0, 5); // "HH:MM"
}

async function fetchSongs() {
    showStatus('Fetching songs from Radio Akadera...', 'info');
    fetchBtn.disabled = true;

    try {
        const html = await fetchRadioPage();
        const allSongs = parseSongs(html);
        fetchedSongs = filterSongsByTimeRange(allSongs, timeFromInput.value, timeToInput.value);

        if (fetchedSongs.length === 0) {
            showStatus('No songs found in this time range.', 'error');
            songListSection.hidden = true;
            downloadBtn.hidden = true;
            return;
        }

        displaySongs(fetchedSongs);
        downloadBtn.hidden = false;
        statusDiv.hidden = true;
    } catch (error) {
        console.error(error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        fetchBtn.disabled = false;
    }
}

function filterSongsByTimeRange(songs, fromTime, toTime) {
    if (!fromTime || !toTime) return songs;

    return songs.filter(song => {
        return song.time >= fromTime && song.time <= toTime;
    });
}

function handleDownload() {
    if (fetchedSongs.length === 0) return;

    const playlistText = generatePlaylistText(fetchedSongs);
    downloadFile(playlistText, 'akadera-playlist.txt');
    showStatus(`Downloaded ${fetchedSongs.length} songs!`, 'success');
}

// Fetches radio page HTML via CORS proxy (browser security restriction).
// TODO: Move to Node.js backend to eliminate proxy dependency - server-side
// requests aren't subject to CORS.
async function fetchRadioPage() {
    let lastError;

    for (let i = 0; i < CORS_PROXIES.length; i++) {
        const proxyIndex = (currentProxyIndex + i) % CORS_PROXIES.length;
        const proxy = CORS_PROXIES[proxyIndex];

        try {
            // Add cache-busting param to bypass proxy cache
            const bustCache = `${RADIO_URL}?_=${Date.now()}`;
            const url = proxy + encodeURIComponent(bustCache);
            const response = await fetch(url);

            if (response.ok) {
                currentProxyIndex = proxyIndex; // Remember working proxy
                return await response.text();
            }

            lastError = new Error(`Proxy ${proxyIndex + 1} failed (${response.status})`);
        } catch (error) {
            lastError = error;
        }
    }

    throw new Error(`All proxies failed. Last error: ${lastError?.message}`);
}

function parseSongs(html) {
    const songs = [];

    // Parse HTML to find song entries
    // Format: <li>HH:MM &nbsp; <strong>Artist - Title</strong></li>
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find the song list - try multiple selectors
    // Page uses flex-column-reverse, so DOM order is oldest first - we need to reverse
    const listItems = Array.from(doc.querySelectorAll('ul.audio-lista li, .audio-lista li'));
    const reversedItems = listItems.reverse(); // Freshest songs first

    for (const li of reversedItems) {
        const text = li.textContent.trim();
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
                artist: decodeHtmlEntities(match[2].trim()),
                title: decodeHtmlEntities(match[3].trim())
            });
        }

        // Reverse to get freshest songs first
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
            title: match[3].trim()
        };
    }

    return null;
}

function decodeHtmlEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}

function generatePlaylistText(songs) {
    return songs
        .map(song => `${song.artist} - ${song.title}`)
        .join('\n');
}

function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

function displaySongs(songs) {
    songsUl.innerHTML = songs
        .map(song => `
            <li>
                <span class="time">${song.time}</span>
                <span class="track">
                    <span class="artist">${escapeHtml(song.artist)}</span> - ${escapeHtml(song.title)}
                </span>
            </li>
        `)
        .join('');

    songListSection.hidden = false;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.hidden = false;
}

