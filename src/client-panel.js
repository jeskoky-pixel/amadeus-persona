// DSH settings-section client source. This file is wrapped in the lazy-CJS
// module loader by scripts/build-client.mjs; it is not imported by the Host.
const { createElement: h, useEffect, useState } = require('react');

const API_ROOT = '/api/amadeus-persona';
const CONSOLE_URL = API_ROOT + '/console';
const LANGUAGE_KEY = 'amadeus.persona.language';
const LANGUAGES = ['zh-CN', 'en-US'];
const DEFAULT_LANGUAGE = 'zh-CN';
// Replaced with the shared src/i18n/catalog.js data by scripts/build-client.mjs.
const I18N_CATALOG = /* @amadeus-persona-i18n */ null;

const PANEL_CSS = `
[data-amadeus-persona]{box-sizing:border-box;color:var(--dsw-alias-label-primary,#203333);font:13px/1.6 system-ui,sans-serif;max-width:760px}
[data-amadeus-persona] *{box-sizing:border-box}
[data-amadeus-persona] h2{font-size:21px;margin:0 0 5px}
[data-amadeus-persona] p{margin:0 0 14px;opacity:.75}
[data-amadeus-persona] .persona-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
[data-amadeus-persona] .language-select{border:1px solid var(--dsw-alias-border-secondary,#8c8c8c55);background:var(--dsw-alias-bg-layer-2,#8c8c8c10);color:inherit;border-radius:8px;padding:4px 7px;font:inherit;font-size:12px;cursor:pointer}
[data-amadeus-persona] .summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:14px 0}
[data-amadeus-persona] .metric{border:1px solid var(--dsw-alias-border-secondary,#8c8c8c55);border-radius:12px;padding:12px;background:var(--dsw-alias-bg-layer-2,#8c8c8c10)}
[data-amadeus-persona] .metric small{display:block;opacity:.68;font-size:11px}
[data-amadeus-persona] .metric strong{display:block;font-size:14px;margin-top:3px;word-break:break-word}
[data-amadeus-persona] button{border:1px solid #178a69;background:#178a69;color:white;border-radius:9px;padding:8px 14px;font:inherit;cursor:pointer}
[data-amadeus-persona] button:focus-visible{outline:2px solid #178a69;outline-offset:2px}
[data-amadeus-persona] .error{color:#ab3535;margin:12px 0}
[data-amadeus-persona] .note{font-size:11px;opacity:.6;margin:12px 0 0}
@media(max-width:560px){[data-amadeus-persona] .summary{grid-template-columns:1fr}[data-amadeus-persona] .persona-head{flex-direction:column}}
`;

/**
 * Persisted UI language only; Persona configuration is never browser state.
 * @returns {'zh-CN'|'en-US'} saved language or the zh-CN default.
 */
function readLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (LANGUAGES.includes(stored)) return stored;
  } catch {
    // Storage is optional; the panel remains usable without it.
  }
  return DEFAULT_LANGUAGE;
}

/**
 * @param {'zh-CN'|'en-US'} language selected language.
 */
function saveLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_KEY, language === 'en-US' ? 'en-US' : 'zh-CN');
  } catch {
    // Language persistence is a convenience, never Persona state.
  }
}

/**
 * @param {string} template message template.
 * @param {Record<string, unknown>} [values] placeholder values.
 * @returns {string} interpolated text.
 */
function interpolate(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (match, name) => (
    values && Object.hasOwn(values, name) ? String(values[name] ?? '') : match
  ));
}

/**
 * @param {string} language selected language.
 * @param {string} key catalog key.
 * @param {Record<string, unknown>} [values] placeholder values.
 * @returns {string} localized message.
 */
function t(language, key, values) {
  const table = I18N_CATALOG?.[language] ?? I18N_CATALOG?.[DEFAULT_LANGUAGE] ?? {};
  const template = table[key];
  return typeof template === 'string' ? interpolate(template, values) : key;
}

/**
 * @param {string} language selected language.
 * @param {string} key base key with `.one`/`.other` variants.
 * @param {number} count item count.
 * @param {Record<string, unknown>} [values] placeholder values.
 * @returns {string} localized plural message.
 */
function tn(language, key, count, values) {
  return t(language, `${key}.${count === 1 ? 'one' : 'other'}`, { ...(values ?? {}), count });
}

async function readOverview() {
  const response = await fetch(API_ROOT + '/overview', {
    credentials: 'same-origin',
    headers: { accept: 'application/json' },
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    const error = new Error('unreadable overview response');
    error.status = response.status;
    throw error;
  }
  if (!response.ok || payload?.ok !== true) {
    const error = new Error('overview request failed');
    error.status = response.status;
    if (typeof payload?.code === 'string') error.code = payload.code;
    throw error;
  }
  return payload.data;
}

/**
 * Convert a Host failure into fixed localized copy. Raw server messages and
 * filesystem paths are never rendered.
 * @param {unknown} failure thrown failure.
 * @param {string} language selected language.
 * @returns {string} localized error message.
 */
function errorMessage(failure, language) {
  const code = failure && typeof failure === 'object' ? failure.code : undefined;
  if (typeof code === 'string') {
    const key = `error.code.${code}`;
    const table = I18N_CATALOG?.[language] ?? I18N_CATALOG?.[DEFAULT_LANGUAGE] ?? {};
    if (typeof table[key] === 'string') return t(language, key);
  }
  const status = Number(failure?.status);
  if (status === 401 || status === 403) return t(language, 'panel.error.auth');
  if (status === 503) return t(language, 'panel.error.unavailable', { status });
  if (status === 400 || status === 404) return t(language, 'panel.error.generic');
  if (Number.isFinite(status)) return t(language, 'panel.error.unavailable', { status });
  return t(language, 'panel.error.generic');
}

function Metric({ label, value }) {
  return h('div', { className: 'metric' },
    h('small', null, label),
    h('strong', null, value));
}

function LanguageSelect({ language, onLanguageChange }) {
  return h('select', {
    className: 'language-select',
    id: 'amadeus-persona-language',
    'aria-label': t(language, 'panel.language'),
    value: language,
    onChange: event => onLanguageChange(event.target.value),
  },
  h('option', { value: 'zh-CN' }, t(language, 'app.languageChinese')),
  h('option', { value: 'en-US' }, t(language, 'app.languageEnglish')));
}

function Panel() {
  const [language, setLanguage] = useState(readLanguage);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const tr = (key, values) => t(language, key, values);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const overview = await readOverview();
        if (!active) return;
        setData(overview);
        setError(null);
      } catch (failure) {
        if (!active) return;
        setData(null);
        setError(failure);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const storage = data?.storage;
  const workspace = data?.workspace;
  const revision = storage?.revision ?? '—';
  const storageLabel = loading
    ? tr('panel.checking')
    : storage?.status === 'ok'
      ? tr('panel.storageHealthy', { revision })
      : storage?.status === 'invalid'
        ? tr('panel.storageInvalid')
        : tr('panel.storageUnavailable');
  const workspaceLabel = loading
    ? tr('panel.checking')
    : workspace
      ? tn(language, 'panel.workspaceValue', Number(workspace.sessionCount ?? 0), { title: workspace.title })
      : tr('panel.notBound');

  return h('div', { 'data-amadeus-persona': 'true' },
    h('style', null, PANEL_CSS),
    h('div', { className: 'persona-head' },
      h('h2', null, tr('panel.title')),
      h(LanguageSelect, {
        language,
        onLanguageChange: next => {
          if (!LANGUAGES.includes(next)) return;
          setLanguage(next);
          saveLanguage(next);
        },
      })),
    h('p', null, tr('panel.description')),
    error ? h('div', { className: 'error', role: 'status' }, errorMessage(error, language)) : null,
    h('div', { className: 'summary' },
      h(Metric, { label: tr('panel.storageHealth'), value: storageLabel }),
      h(Metric, { label: tr('panel.boundWorkspace'), value: workspaceLabel })),
    h('button', {
      type: 'button',
      onClick: () => window.open(CONSOLE_URL, '_blank', 'noopener,noreferrer'),
    }, tr('panel.openConsole')),
    h('p', { className: 'note' }, tr('panel.note')));
}

return {
  name: '@amadeus/persona-client',
  inject: ['slots'],
  apply(ctx) {
    try {
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'amadeus-persona',
        order: 32,
        label: () => t(readLanguage(), 'panel.sectionLabel'),
      }, Panel));
    } catch (error) {
      console.error('[amadeus-persona] settings.section unavailable', error);
    }
  },
};
