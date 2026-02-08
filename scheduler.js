const fs = require('fs');
const path = require('path');
const { fetchRadioPage, parseSongs, filterSongsByTimeRange } = require('./lib/songs');
const { generatePlaylistText } = require('./lib/playlist');
const { DAY_NAMES, SCHEDULE, buildFilename } = require('./lib/schedule');

const FETCH_DELAY_MINUTES = 10;
const PLAYLISTS_DIR = path.join(__dirname, 'playlists');

function startScheduler() {
    fs.mkdirSync(PLAYLISTS_DIR, { recursive: true });

    console.log(`Playlist scheduler started. Monitoring ${SCHEDULE.length} audition(s):`);
    for (const entry of SCHEDULE) {
        console.log(`  ${entry.day} ${entry.startTime}-${entry.endTime} "${entry.title}" (${entry.dj})`);
    }

    scheduleNext();
}

function scheduleNext() {
    const next = getNextTrigger();
    if (!next) return;

    const msUntil = Math.max(next.triggerDate - Date.now(), 1000);
    const minutes = Math.round(msUntil / 60000);

    console.log(`Next export: "${next.entry.title}" at ${next.triggerDate.toLocaleString()} (in ~${minutes} min)`);

    setTimeout(async () => {
        await exportPlaylist(next.entry);
        scheduleNext();
    }, msUntil);
}

function getNextTrigger() {
    const now = new Date();
    let soonest = null;

    for (const entry of SCHEDULE) {
        const triggerDate = getNextOccurrence(entry, now);
        if (!soonest || triggerDate < soonest.triggerDate) {
            soonest = { entry, triggerDate };
        }
    }

    return soonest;
}

function getNextOccurrence(entry, now) {
    const targetDay = DAY_NAMES.indexOf(entry.day);
    const [endH, endM] = entry.endTime.split(':').map(Number);

    // Start from today, check up to 7 days ahead
    for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
        const candidate = new Date(now);
        candidate.setDate(candidate.getDate() + daysAhead);

        if (candidate.getDay() !== targetDay) continue;

        candidate.setHours(endH, endM + FETCH_DELAY_MINUTES, 0, 0);

        if (candidate > now) {
            return candidate;
        }
    }

    // Fallback: next week same day (shouldn't reach here with 0-7 range)
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + 7);
    candidate.setHours(endH, endM + FETCH_DELAY_MINUTES, 0, 0);
    return candidate;
}

async function exportPlaylist(entry) {
    const now = new Date();
    const filename = buildFilename(entry, now);
    const filePath = path.join(PLAYLISTS_DIR, filename);

    if (fs.existsSync(filePath)) {
        console.log(`Playlist already exists, skipping: ${filename}`);
        return;
    }

    try {
        console.log(`Exporting playlist for "${entry.title}"...`);
        const html = await fetchRadioPage();
        const allSongs = parseSongs(html);
        const songs = filterSongsByTimeRange(allSongs, entry.startTime, entry.endTime);

        if (songs.length === 0) {
            console.warn(`No songs found for "${entry.title}" (${entry.startTime}-${entry.endTime}), skipping`);
            return;
        }

        const text = generatePlaylistText(songs);
        fs.writeFileSync(filePath, text, 'utf-8');
        console.log(`Exported: ${filename} (${songs.length} songs)`);
    } catch (error) {
        console.error(`Failed to export "${entry.title}":`, error.message);
    }
}

module.exports = { startScheduler };
