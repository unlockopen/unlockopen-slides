import { resolve } from './credentials.js';

const API_BASE = 'https://api.raindrop.io/rest/v1';

/**
 * Fetch raindrops (bookmarks) from a Raindrop.io collection.
 *
 * @param {Object} config - The newsletter configuration object
 * @param {Object} [options] - Override options
 * @param {number} [options.page=0] - Page number (0-indexed)
 * @param {string} [options.sort] - Sort order: "-created", "-title", "-domain", "title", etc.
 * @returns {Promise<Object>} { items: Array<Raindrop>, count: number }
 */
export async function fetchRaindrops(config, options = {}) {
  const token = await resolve(config.credentials.raindrop_token);
  const { collectionId, limit = 25, sort = '-created', search, tags } = config.raindrop;
  const page = options.page ?? 0;

  const params = new URLSearchParams({
    perpage: String(Math.min(limit, 50)),
    page: String(page),
    sort: options.sort ?? sort,
  });

  // Build search query from tags and/or freeform search
  const searchParts = [];
  if (tags && tags.length > 0) {
    searchParts.push(...tags.map(t => `#${t}`));
  }
  if (search) {
    searchParts.push(search);
  }
  if (searchParts.length > 0) {
    params.set('search', searchParts.join(' '));
  }

  const url = `${API_BASE}/raindrops/${collectionId}?${params}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Raindrop API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return {
    items: data.items.map(normalizeRaindrop),
    count: data.count,
  };
}

/**
 * Fetch all available collections for discovery/debugging.
 *
 * @param {Object} config - The newsletter configuration object
 * @returns {Promise<Array>} List of collections
 */
export async function fetchCollections(config) {
  const token = await resolve(config.credentials.raindrop_token);

  const res = await fetch(`${API_BASE}/collections`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Raindrop API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.items.map(c => ({
    id: c._id,
    title: c.title,
    count: c.count,
    slug: c.slug,
  }));
}

/**
 * Normalize a raw Raindrop API object into a clean structure.
 */
function normalizeRaindrop(raw) {
  return {
    id: raw._id,
    title: raw.title,
    link: raw.link,
    excerpt: raw.excerpt || '',
    note: raw.note || '',
    cover: raw.cover || null,
    tags: raw.tags || [],
    type: raw.type,
    domain: raw.domain,
    created: raw.created,
    highlights: (raw.highlights || []).map(h => h.text),
    media: (raw.media || []).map(m => ({ link: m.link, type: m.type })),
    collection: {
      id: raw.collection?.$id,
    },
  };
}
