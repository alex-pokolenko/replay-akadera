// Storage abstraction for playlist files.
// Dual-mode: uses S3 when S3_BUCKET env var is set (Lambda/production),
// falls back to local filesystem (playlists/ directory) for local dev.

const fs = require('fs');
const path = require('path');

const BUCKET = process.env.S3_BUCKET;

// --- S3 mode (Lambda / production) ---

let s3;
function getS3() {
    // Lazy-init: only created on first call, avoids cold-start overhead if unused.
    // @aws-sdk/client-s3 is built into Lambda Node.js 20 runtime — no npm install needed.
    if (!s3) {
        const { S3Client } = require('@aws-sdk/client-s3');
        s3 = new S3Client();
    }
    return s3;
}

async function existsS3(pathname) {
    const { HeadObjectCommand } = require('@aws-sdk/client-s3');
    try {
        await getS3().send(new HeadObjectCommand({ Bucket: BUCKET, Key: pathname }));
        return true;
    } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false;
        throw err;
    }
}

async function uploadS3(pathname, content) {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await getS3().send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: pathname,
        Body: content,
        ContentType: 'text/plain',
    }));
    return `https://${BUCKET}.s3.amazonaws.com/${encodeURIComponent(pathname)}`;
}

// --- Filesystem mode (local dev) ---

const PLAYLISTS_DIR = path.join(__dirname, '..', 'playlists');

function existsFS(pathname) {
    return Promise.resolve(fs.existsSync(path.join(PLAYLISTS_DIR, pathname)));
}

function uploadFS(pathname, content) {
    fs.mkdirSync(PLAYLISTS_DIR, { recursive: true });
    const filePath = path.join(PLAYLISTS_DIR, pathname);
    fs.writeFileSync(filePath, content, 'utf-8');
    return Promise.resolve(filePath);
}

// --- Pick mode based on environment ---

const exists = BUCKET ? existsS3 : existsFS;
const upload = BUCKET ? uploadS3 : uploadFS;

module.exports = { exists, upload };
