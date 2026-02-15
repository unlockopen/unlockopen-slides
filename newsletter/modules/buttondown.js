import { readFile } from 'node:fs/promises';
import { resolve } from './credentials.js';

const API_BASE = 'https://api.buttondown.com/v1';

/**
 * Create a draft email in Buttondown from a rendered newsletter.
 *
 * @param {Object} config - Newsletter configuration
 * @param {Object} params
 * @param {string} params.markdownPath - Path to the rendered newsletter.md
 * @param {string} params.periodLabel - Human-readable period label for the subject
 * @param {string} [params.subject] - Override subject line
 * @returns {Promise<Object>} The created draft email object from Buttondown
 */
export async function createDraft(config, { markdownPath, periodLabel, subject }) {
  const token = await resolve(config.credentials.buttondown_token);
  const body = await readFile(markdownPath, 'utf-8');

  const emailSubject = subject || renderSubject(config, periodLabel);

  const payload = {
    subject: emailSubject,
    body,
    status: 'draft',
  };

  // If a specific newsletter ID is set (for multi-newsletter Buttondown accounts)
  if (config.buttondown?.newsletterId) {
    payload.newsletter = config.buttondown.newsletterId;
  }

  const res = await fetch(`${API_BASE}/emails`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Buttondown API error ${res.status}: ${errBody}`);
  }

  return res.json();
}

/**
 * Update an existing draft email in Buttondown.
 *
 * @param {Object} config - Newsletter configuration
 * @param {string} emailId - The draft email ID to update
 * @param {Object} updates - Fields to update (subject, body)
 * @returns {Promise<Object>} The updated email object
 */
export async function updateDraft(config, emailId, updates) {
  const token = await resolve(config.credentials.buttondown_token);

  const res = await fetch(`${API_BASE}/emails/${emailId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Buttondown API error ${res.status}: ${errBody}`);
  }

  return res.json();
}

/**
 * List recent emails (drafts and sent) from Buttondown.
 *
 * @param {Object} config - Newsletter configuration
 * @param {Object} [options]
 * @param {string} [options.status] - Filter by status: "draft", "sent", "scheduled"
 * @returns {Promise<Array>} List of email objects
 */
export async function listEmails(config, options = {}) {
  const token = await resolve(config.credentials.buttondown_token);

  const params = new URLSearchParams();
  if (options.status) {
    params.set('status', options.status);
  }

  const url = `${API_BASE}/emails?${params}`;
  const res = await fetch(url, {
    headers: { Authorization: `Token ${token}` },
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Buttondown API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  return data.results || data;
}

/**
 * Send a draft email (moves it to "about to send" status).
 *
 * @param {Object} config - Newsletter configuration
 * @param {string} emailId - The draft email ID to send
 * @returns {Promise<Object>} The response from Buttondown
 */
export async function sendDraft(config, emailId) {
  const token = await resolve(config.credentials.buttondown_token);

  const res = await fetch(`${API_BASE}/emails/${emailId}/send-draft`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Buttondown API error ${res.status}: ${errBody}`);
  }

  return res.json();
}

/**
 * Render the subject line using the config template.
 */
function renderSubject(config, periodLabel) {
  const template = config.buttondown?.subjectTemplate || '{{title}} - {{period}}';
  return template
    .replace(/\{\{title\}\}/g, config.title)
    .replace(/\{\{name\}\}/g, config.name)
    .replace(/\{\{period\}\}/g, periodLabel);
}
