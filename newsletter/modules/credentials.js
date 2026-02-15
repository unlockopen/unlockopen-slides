import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Resolve a 1Password secret reference using the `op` CLI.
 * References use the format: op://vault/item/field
 *
 * @param {string} reference - 1Password secret reference (e.g. "op://Shared/Raindrop/api-token")
 * @returns {Promise<string>} The resolved secret value
 */
export async function resolve(reference) {
  if (!reference || !reference.startsWith('op://')) {
    throw new Error(`Invalid 1Password reference: "${reference}". Must start with "op://"`);
  }

  try {
    const { stdout } = await execFileAsync('op', ['read', reference, '--no-newline']);
    return stdout;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        '1Password CLI (op) is not installed. Install it from https://1password.com/downloads/command-line/'
      );
    }
    throw new Error(`Failed to read 1Password secret "${reference}": ${err.stderr || err.message}`);
  }
}

/**
 * Resolve multiple credential references from a config's credentials block.
 *
 * @param {Object} credentialsConfig - Map of key -> 1Password reference
 * @returns {Promise<Object>} Map of key -> resolved secret value
 */
export async function resolveAll(credentialsConfig) {
  const entries = Object.entries(credentialsConfig);
  const resolved = await Promise.all(
    entries.map(async ([key, ref]) => [key, await resolve(ref)])
  );
  return Object.fromEntries(resolved);
}
