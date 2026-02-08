// Keep in sync with public/app.js generatePlaylistText()
function generatePlaylistText(songs) {
    // Reverse so oldest songs are first (chronological order for Spotify playback)
    return [...songs]
        .reverse()
        .map(song => `${song.artist} - ${song.title}`)
        .join('\n');
}

module.exports = { generatePlaylistText };
