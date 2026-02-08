// Storage abstraction for playlist files.
// Currently uses Vercel Blob. To migrate to AWS S3, swap this module
// (same interface: exists, upload, with pathname/content/contentType).

const { put, head } = require('@vercel/blob');

async function exists(pathname) {
    try {
        await head(pathname);
        return true;
    } catch (error) {
        if (error.code === 'blob_not_found' || error.message?.includes('not found')) {
            return false;
        }
        throw error;
    }
}

async function upload(pathname, content) {
    const blob = await put(pathname, content, {
        access: 'public',
        contentType: 'text/plain',
        addRandomSuffix: false,
    });
    return blob.url;
}

module.exports = { exists, upload };
