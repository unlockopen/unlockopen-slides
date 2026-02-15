import { writeFile, mkdir } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';

/**
 * Download an image from a URL and save it to the target directory.
 * Returns the local relative path for use in markdown.
 *
 * @param {string} url - Image URL to download
 * @param {string} targetDir - Directory to save the image in
 * @returns {Promise<string|null>} Relative filename of saved image, or null on failure
 */
export async function downloadImage(url, targetDir) {
  if (!url) return null;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    const ext = extensionFromContentType(contentType) || extensionFromUrl(url) || '.jpg';
    const hash = createHash('md5').update(url).digest('hex').slice(0, 10);
    const filename = `${hash}${ext}`;

    await mkdir(targetDir, { recursive: true });

    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(join(targetDir, filename), buffer);

    return filename;
  } catch {
    return null;
  }
}

/**
 * Download all cover images from a list of raindrops.
 * Mutates items in-place, adding a `localCover` field.
 *
 * @param {Array} items - Normalized raindrop items
 * @param {string} imageDir - Directory to save images
 * @returns {Promise<Array>} The items with localCover populated
 */
export async function downloadAllCovers(items, imageDir) {
  await mkdir(imageDir, { recursive: true });

  const results = await Promise.allSettled(
    items.map(async (item) => {
      if (item.cover) {
        const filename = await downloadImage(item.cover, imageDir);
        item.localCover = filename ? `images/${filename}` : null;
      } else {
        item.localCover = null;
      }
      return item;
    })
  );

  return results.map(r => r.status === 'fulfilled' ? r.value : r.reason);
}

function extensionFromContentType(ct) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/avif': '.avif',
  };
  for (const [mime, ext] of Object.entries(map)) {
    if (ct.includes(mime)) return ext;
  }
  return null;
}

function extensionFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const ext = extname(basename(pathname));
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'].includes(ext.toLowerCase())
      ? ext.toLowerCase()
      : null;
  } catch {
    return null;
  }
}
