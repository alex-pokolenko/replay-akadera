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
        const params = new URLSearchParams({
            from: timeFromInput.value,
            to: timeToInput.value,
        });
        const response = await fetch(`${API_BASE}/api/songs?${params}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Unknown error');
        }

        fetchedSongs = data.songs;

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

function handleDownload() {
    if (fetchedSongs.length === 0) return;

    const playlistText = generatePlaylistText(fetchedSongs);
    downloadFile(playlistText, 'akadera-playlist.txt');
    showStatus(`Downloaded ${fetchedSongs.length} songs!`, 'success');
}

function generatePlaylistText(songs) {
    // Reverse so oldest songs are first (chronological order for Spotify playback)
    return [...songs]
        .reverse()
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
    // Reverse to show oldest first (chronological order)
    songsUl.innerHTML = [...songs]
        .reverse()
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
