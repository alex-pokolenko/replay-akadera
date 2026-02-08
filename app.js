const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
];
let currentProxyIndex = 0;

const RADIO_URL = 'https://akadera.bialystok.pl/bylo-grane/';
const SONG_LIMIT = 10;

const downloadBtn = document.getElementById('downloadBtn');
const statusDiv = document.getElementById('status');
const songListSection = document.getElementById('songList');
const songsUl = document.getElementById('songs');

let fetchedSongs = [];

downloadBtn.addEventListener('click', handleDownload);

// Fetch songs on page load
fetchSongs();

async function fetchSongs() {
    showStatus('Fetching songs from Radio Akadera...', 'info');

    try {
        const html = await fetchRadioPage();
        fetchedSongs = parseSongs(html, SONG_LIMIT);

        if (fetchedSongs.length === 0) {
            showStatus('No songs found. The page structure may have changed.', 'error');
            return;
        }

        displaySongs(fetchedSongs);
        downloadBtn.hidden = false;
        statusDiv.hidden = true;
    } catch (error) {
        console.error(error);
        showStatus(`Error: ${error.message}`, 'error');
    }
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

function parseSongs(html, limit) {
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
        if (songs.length >= limit) break;

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

        // Reverse to get freshest songs first, then take limit
        songs.push(...allMatches.reverse().slice(0, limit));
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

