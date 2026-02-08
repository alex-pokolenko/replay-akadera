const { fetchRadioPage, parseSongs, filterSongsByTimeRange } = require('../../lib/songs');
const { generatePlaylistText } = require('../../lib/playlist');
const { DAY_NAMES, SCHEDULE, buildFilename } = require('../../lib/schedule');
const { exists, upload } = require('../../lib/storage');

module.exports = async function handler(req, res) {
    // Verify cron secret (Vercel sends this as Authorization: Bearer <secret>)
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const auth = req.headers.authorization;
        if (auth !== `Bearer ${secret}`) {
            res.statusCode = 401;
            return res.end(JSON.stringify({ error: 'Unauthorized' }));
        }
    }

    // Determine today's day name in Poland timezone
    const now = new Date();
    const warsawDay = now.toLocaleDateString('en-US', {
        weekday: 'long',
        timeZone: 'Europe/Warsaw',
    });

    const todaysShows = SCHEDULE.filter(entry => entry.day === warsawDay);

    if (todaysShows.length === 0) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        return res.end(JSON.stringify({ message: `No shows scheduled for ${warsawDay}`, results: [] }));
    }

    // Use Warsaw-timezone date for filename (so the date matches the local calendar day)
    const warsawDateStr = now.toLocaleDateString('en-GB', { timeZone: 'Europe/Warsaw' });
    const [dd, mm, yyyy] = warsawDateStr.split('/');
    const warsawDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));

    const html = await fetchRadioPage();
    const allSongs = parseSongs(html);
    const results = [];

    for (const entry of todaysShows) {
        const filename = buildFilename(entry, warsawDate);

        try {
            // Duplicate prevention
            const alreadyExists = await exists(filename);
            if (alreadyExists) {
                results.push({ show: entry.title, status: 'skipped', reason: 'already exported' });
                continue;
            }

            const songs = filterSongsByTimeRange(allSongs, entry.startTime, entry.endTime);

            if (songs.length === 0) {
                results.push({ show: entry.title, status: 'skipped', reason: 'no songs found' });
                continue;
            }

            const text = generatePlaylistText(songs);
            const url = await upload(filename, text);
            results.push({ show: entry.title, status: 'exported', songs: songs.length, url });
        } catch (error) {
            results.push({ show: entry.title, status: 'error', error: error.message });
        }
    }

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ day: warsawDay, results }));
};
