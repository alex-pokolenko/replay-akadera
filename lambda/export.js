// Lambda handler for per-show playlist export.
// Invoked by EventBridge Scheduler — one schedule per show, each passing {"showIndex": N}.
// N is the index into the SCHEDULE array in lib/schedule.js.

const { fetchRadioPage, parseSongs, filterSongsByTimeRange } = require('../lib/songs');
const { generatePlaylistText } = require('../lib/playlist');
const { SCHEDULE, buildFilename } = require('../lib/schedule');
const { exists, upload } = require('../lib/storage');

exports.handler = async (event) => {
    const entry = SCHEDULE[event.showIndex];

    if (!entry) {
        console.error(`Invalid showIndex: ${event.showIndex}`);
        return { status: 'error', error: `Invalid showIndex: ${event.showIndex}` };
    }

    console.log(`Exporting "${entry.title}" (${entry.day} ${entry.startTime}-${entry.endTime})`);

    // Use Warsaw timezone for the date in the filename
    const now = new Date();
    const warsawDateStr = now.toLocaleDateString('en-GB', { timeZone: 'Europe/Warsaw' });
    const [dd, mm, yyyy] = warsawDateStr.split('/');
    const warsawDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

    const filename = buildFilename(entry, warsawDate);

    try {
        if (await exists(filename)) {
            console.log(`Already exported: ${filename}`);
            return { status: 'skipped', show: entry.title, reason: 'already exported' };
        }

        const html = await fetchRadioPage();
        const allSongs = parseSongs(html);
        const songs = filterSongsByTimeRange(allSongs, entry.startTime, entry.endTime);

        if (songs.length === 0) {
            console.warn(`No songs found for "${entry.title}"`);
            return { status: 'skipped', show: entry.title, reason: 'no songs found' };
        }

        const text = generatePlaylistText(songs);
        const url = await upload(filename, text);
        console.log(`Exported: ${filename} (${songs.length} songs)`);
        return { status: 'exported', show: entry.title, songs: songs.length, url };
    } catch (error) {
        console.error(`Failed to export "${entry.title}":`, error.message);
        return { status: 'error', show: entry.title, error: error.message };
    }
};
