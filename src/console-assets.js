/**
 * Static owner-console assets.
 *
 * The files are shipped with the plugin and read once at module load.  They are
 * served only by `src/http.js` behind same-origin checks and DSH Owner
 * admission; nothing here performs runtime authorization.
 */

import { readFileSync } from 'node:fs';

/**
 * @param {string} name file in ./console.
 * @returns {string} UTF-8 asset content.
 */
function asset(name) {
  return readFileSync(new URL(`./console/${name}`, import.meta.url), 'utf8');
}

export const CONSOLE_HTML = asset('index.html');
export const CONSOLE_CSS = asset('console.css');
export const CONSOLE_I18N = asset('i18n.js');
export const CONSOLE_JS = asset('console.js');
