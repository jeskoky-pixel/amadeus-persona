(() => {
  'use strict';

  const API = '/api/amadeus-persona';
  const THEME_KEY = 'amadeus.persona.theme';
  const LANGUAGE_KEY = 'amadeus.persona.language';
  const I18N = window.__AmadeusPersonaI18n ?? null;
  const DEFAULT_LANGUAGE = I18N?.defaultLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  const LANGUAGES = Array.isArray(I18N?.languages) && I18N.languages.length > 0
    ? I18N.languages
    : ['zh-CN', 'en-US'];
  const PAGE_IDS = ['overview', 'library', 'bindings', 'diagnostics', 'settings'];
  const BINDING_MODES = ['inherit', 'core-only', 'style', 'disabled'];
  const COLOR_PRESETS = [
    { name: 'green', value: '#56bda1' },
    { name: 'violet', value: '#a17fc6' },
    { name: 'rose', value: '#db9293' },
    { name: 'blue', value: '#76a9d7' },
    { name: 'amber', value: '#d7af69' },
  ];

  const SVG = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    message: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20"/><path d="M8 7h8M8 11h5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    sliders: '<path d="M4 7h9M18 7h2M4 17h2M11 17h9"/><circle cx="16" cy="7" r="3"/><circle cx="8" cy="17" r="3"/>',
    sparkles: '<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3ZM19 16l.75 2.25L22 19l-2.25.75L19 22l-.75-2.25L16 19l2.25-.75L19 16Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    circlecheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7h.01"/>',
    alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v4M12 17h.01"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
    arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
    activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3V7Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    moon: '<path d="M20.8 14.2A9 9 0 0 1 9.8 3.2 9 9 0 1 0 20.8 14.2Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 12-2L20 12M4 12l2.4 3a7 7 0 0 0 12 0"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    branch: '<circle cx="6" cy="3" r="2"/><path d="M6 5v12a4 4 0 0 0 4 4h5"/><circle cx="17" cy="21" r="2"/><circle cx="17" cy="7" r="2"/><path d="M6 11h7a4 4 0 0 0 4-4"/>',
    history: '<path d="M3 12a9 9 0 1 0 2-6M3 3v6h6M12 7v5l3 2"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 2 4 3 9 3s9-1 9-3V5M3 12c0 2 4 3 9 3s9-1 9-3"/>',
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    close: '<path d="M5 5l14 14M19 5 5 19"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
  };

  const PAGE_TITLE_KEYS = {
    overview: 'page.overview.title',
    library: 'page.library.title',
    bindings: 'page.bindings.title',
    diagnostics: 'page.diagnostics.title',
    settings: 'page.settings.title',
  };

  const PAGE_SUBTITLE_KEYS = {
    overview: 'page.overview.subtitle',
    library: 'page.library.subtitle',
    bindings: 'page.bindings.subtitle',
    diagnostics: 'page.diagnostics.subtitle',
    settings: 'page.settings.subtitle',
  };

  const REASON_KEYS = {
    ok: 'reason.ok',
    no_session: 'reason.no_session',
    subagent: 'reason.subagent',
    storage_unavailable: 'reason.storage_unavailable',
    injection_disabled: 'reason.injection_disabled',
    workspace_unbound: 'reason.workspace_unbound',
    workspace_missing: 'reason.workspace_missing',
    not_workspace_member: 'reason.not_workspace_member',
    session_invalid: 'reason.session_invalid',
    qq_mapping_untrusted: 'reason.qq_mapping_untrusted',
    binding_disabled: 'reason.binding_disabled',
    core_empty: 'reason.core_empty',
    style_missing: 'reason.style_missing',
    qq_unavailable: 'reason.qq_unavailable',
    qq_revoked: 'reason.qq_revoked',
    qq_scene_revoked: 'reason.qq_scene_revoked',
    binding_workspace_mismatch: 'reason.binding_workspace_mismatch',
    agent_not_live: 'reason.agent_not_live',
    host_assembly_failed: 'reason.host_assembly_failed',
    host_assembly_unavailable: 'reason.host_assembly_unavailable',
    invalid_host_assembly: 'reason.invalid_host_assembly',
    state_changed_during_check: 'reason.state_changed_during_check',
  };

  const STATUS_REASON_KEYS = {
    workspace_member: 'statusReason.workspace_member',
    verified_qq_scene: 'statusReason.verified_qq_scene',
    style_missing: 'statusReason.style_missing',
    workspace_unbound: 'statusReason.workspace_unbound',
    workspace_missing: 'statusReason.workspace_missing',
    not_workspace_member: 'statusReason.not_workspace_member',
    qq_unavailable: 'statusReason.qq_unavailable',
    qq_mapping_invalid: 'statusReason.qq_mapping_invalid',
    qq_scene_unmapped: 'statusReason.qq_scene_unmapped',
    qq_revoked: 'statusReason.qq_revoked',
    binding_workspace_mismatch: 'statusReason.binding_workspace_mismatch',
    awaiting_first_session: 'statusReason.awaiting_first_session',
  };

  /**
   * Persisted UI language only; Persona configuration is never browser state.
   * @returns {'zh-CN'|'en-US'} saved language or the zh-CN default.
   */
  function readLanguage() {
    try {
      const stored = localStorage.getItem(LANGUAGE_KEY);
      if (LANGUAGES.includes(stored)) return stored;
    } catch {
      // Storage is optional; the console remains usable without it.
    }
    return DEFAULT_LANGUAGE;
  }

  /**
   * @param {'zh-CN'|'en-US'} language selected language.
   */
  function saveLanguage(language) {
    try {
      localStorage.setItem(LANGUAGE_KEY, LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE);
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
   * @param {string} key catalog key.
   * @param {Record<string, unknown>} [values] placeholder values.
   * @returns {string} localized message (or the key when the asset is missing).
   */
  function t(key, values) {
    const table = I18N?.catalog?.[state.language] ?? I18N?.catalog?.[DEFAULT_LANGUAGE] ?? {};
    const template = table[key];
    return typeof template === 'string' ? interpolate(template, values) : key;
  }

  /**
   * @param {string} key base key with `.one`/`.other` variants.
   * @param {number} count item count.
   * @param {Record<string, unknown>} [values] placeholder values.
   * @returns {string} localized plural message.
   */
  function tn(key, count, values) {
    return t(`${key}.${count === 1 ? 'one' : 'other'}`, { ...(values ?? {}), count });
  }

  function pageTitle(page = state.page) {
    return t(PAGE_TITLE_KEYS[page] ?? PAGE_TITLE_KEYS.overview);
  }

  function pageSubtitle(page = state.page) {
    return t(PAGE_SUBTITLE_KEYS[page] ?? PAGE_SUBTITLE_KEYS.overview);
  }

  function readTheme() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // Storage is optional; the console remains usable without it.
    }
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(THEME_KEY, theme === 'dark' ? 'dark' : 'light');
    } catch {
      // Theme persistence is a convenience, never Persona state.
    }
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character]));
  }

  function plain(value, limit = 180) {
    const text = String(value ?? '').trim().replace(/\s+/g, ' ');
    return esc(text.length > limit ? `${text.slice(0, Math.max(0, limit - 1))}…` : text);
  }

  function icon(name, sizeClass = '') {
    return `<svg class="ico ${sizeClass}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SVG[name] || SVG.info}</svg>`;
  }

  function charCount(value) {
    let count = 0;
    for (const _ of String(value ?? '')) count += 1;
    return count;
  }

  function estimateTokens(value) {
    let ascii = 0;
    let wide = 0;
    for (const character of String(value ?? '')) {
      if ((character.codePointAt(0) ?? 0) < 0x80) ascii += 1;
      else wide += 1;
    }
    return Math.ceil(ascii / 4 + wide);
  }

  function formatDate(value) {
    if (typeof value !== 'string') return t('common.dash');
    const time = Date.parse(value);
    return Number.isFinite(time)
      ? new Date(time).toLocaleString(state.language === 'zh-CN' ? 'zh-CN' : 'en-US')
      : String(value);
  }

  function shortId(value, length = 20) {
    const text = String(value ?? '');
    return text.length > length ? `${text.slice(0, Math.max(0, length - 1))}…` : text;
  }

  function pageFromHash() {
    const value = String(window.location.hash || '').replace(/^#/, '');
    return PAGE_IDS.includes(value) ? value : 'overview';
  }

  function storageTone(status) {
    return status === 'ok' ? 'green' : status === 'invalid' ? 'amber' : 'bad';
  }

  function storageLabel(status) {
    return status === 'ok'
      ? t('common.storageOk')
      : status === 'invalid'
        ? t('common.storageInvalid')
        : status
          ? t('common.storageUnavailable')
          : t('common.storageUnknown');
  }

  const state = {
    page: pageFromHash(),
    theme: readTheme(),
    language: readLanguage(),
    loading: true,
    error: '',
    errorCause: null,
    accessDenied: false,
    overview: null,
    workspaces: null,
    cards: null,
    bindings: null,
    diagnostics: null,
    backups: null,
    backupsLoading: false,
    backupsError: '',
    backupsErrorCause: null,
    revision: null,
    editor: null,
    editorDirty: false,
    editorTokenWarning: false,
    historyFor: null,
    target: null,
    bindingDraft: null,
    bindingDraftDirty: false,
    workspaceDraft: null,
    defaultStyleDraft: null,
    backupReason: '',
    sceneQuery: '',
    sceneFilter: 'all',
    diagnosticIndex: 0,
    finalProbe: null,
    conflict: null,
    pending: '',
  };

  let loadSequence = 0;
  let toastTimer = null;

  function styles() {
    return Array.isArray(state.cards?.styles) ? state.cards.styles : [];
  }

  function styleById(id) {
    return styles().find(style => style.id === id) ?? null;
  }

  function coreView() {
    return state.cards?.core ?? null;
  }

  function bindings() {
    return Array.isArray(state.bindings?.bindings) ? state.bindings.bindings : [];
  }

  function bindingByKey(key) {
    return bindings().find(binding => binding.key === key) ?? null;
  }

  function workspaceList() {
    return Array.isArray(state.workspaces?.workspaces) ? state.workspaces.workspaces : [];
  }

  function boundWorkspaceId() {
    return state.workspaces?.boundWorkspaceId ?? state.overview?.workspaceId ?? null;
  }

  function boundWorkspace() {
    const id = boundWorkspaceId();
    if (id === null) return null;
    if (state.overview?.workspace?.id === id) return state.overview.workspace;
    return workspaceList().find(workspace => workspace.id === id) ?? null;
  }

  function workspaceSessions() {
    const id = boundWorkspaceId();
    const workspace = workspaceList().find(item => item.id === id);
    return Array.isArray(workspace?.sessions) ? workspace.sessions : [];
  }

  function verifiedScenes() {
    const scenes = state.workspaces?.qq?.scenes;
    return Array.isArray(scenes) ? scenes : [];
  }

  function defaultStyleName() {
    if (state.cards?.defaultStyleId == null) return t('common.coreOnly');
    return styleById(state.cards.defaultStyleId)?.name ?? t('common.missingStyle');
  }

  function modeLabel(binding) {
    if (!binding) return t('mode.noExplicit');
    if (binding.mode === 'inherit') return t('mode.inherit', { style: defaultStyleName() });
    if (binding.mode === 'core-only') return t('mode.coreOnly');
    if (binding.mode === 'style') return t('mode.style', { style: binding.styleName ?? t('common.missingStyle') });
    if (binding.mode === 'disabled') return t('mode.disabled');
    return esc(binding.mode);
  }

  function statusTone(status) {
    return status?.valid === true ? 'green' : 'amber';
  }

  function statusLabel(status) {
    if (!status) return t('status.unknown');
    return status.valid === true ? t('status.trusted') : t('status.untrusted');
  }

  function statusReason(status) {
    if (!status) return '';
    const key = STATUS_REASON_KEYS[status.reason];
    return key === undefined ? String(status.reason ?? '') : t(key);
  }

  function reasonLabel(reason) {
    const key = REASON_KEYS[reason];
    return key === undefined ? String(reason ?? t('reason.unknown')) : t(key);
  }

  function historyActionLabel(action) {
    const key = `history.action.${action}`;
    const localized = t(key);
    return localized === key ? String(action ?? '') : localized;
  }

  const LIMITATION_KEYS = [
    'diagnostics.limitation.finalVisibility',
    'diagnostics.limitation.qqScene',
    'diagnostics.limitation.tokenCounts',
  ];

  function limitationLabel(item) {
    const canonical = I18N?.catalog?.['en-US'] ?? {};
    const key = LIMITATION_KEYS.find(candidate => canonical[candidate] === item);
    return key === undefined ? String(item ?? '') : t(key);
  }

  function capabilityLabel(capability) {
    const key = `capability.${capability}`;
    const localized = t(key);
    return localized === key
      ? capability.replace(/([A-Z])/g, ' $1').replace(/^./, character => character.toUpperCase())
      : localized;
  }

  function stageNoteLabel(note) {
    const canonical = I18N?.catalog?.['en-US']?.['diagnostics.stageNoteText'];
    if (typeof note === 'string' && note.length > 0 && note === canonical) {
      return t('diagnostics.stageNoteText');
    }
    return typeof note === 'string' && note.length > 0 ? note : t('diagnostics.stageNoteText');
  }

  function technicalLabel(prefix, value) {
    if (value === undefined || value === null || value === '') return t('common.dash');
    const key = `${prefix}.${value}`;
    const localized = t(key);
    return localized === key ? String(value) : localized;
  }

  function colorTone(color) {
    const match = COLOR_PRESETS.find(preset => preset.value === String(color ?? '').toLowerCase());
    return match?.name ?? 'gray';
  }

  function tokenSummary(card, kind) {
    const token = card?.token ?? {};
    const characters = Number.isFinite(token.characters) ? token.characters : charCount(card?.body ?? '');
    const estimated = Number.isFinite(token.estimatedTokens) ? token.estimatedTokens : estimateTokens(card?.body ?? '');
    const warningAt = Number.isFinite(token.warningTokens)
      ? token.warningTokens
      : (kind === 'core' ? state.cards?.limits?.coreWarnTokens : state.cards?.limits?.styleWarnTokens) ?? 0;
    return {
      characters,
      estimated,
      warningAt,
      warning: token.tokenWarning === true || (warningAt > 0 && estimated > warningAt),
    };
  }

  function notify(title, detail = '') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerHTML = `<strong>${esc(title)}</strong>${detail ? `<div class="micro muted">${esc(detail)}</div>` : ''}`;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 4200);
  }

  /**
   * Convert Host failures into fixed localized copy. Server messages are never
   * reflected: technical codes are useful, but raw Host paths or secrets are not.
   * @param {unknown} error failure.
   * @returns {string} localized, safe message.
   */
  function errorMessage(error) {
    if (error?.network === true) return t('error.network');
    const status = Number(error?.status);
    const code = typeof error?.code === 'string' ? error.code : '';
    if (code) {
      const key = `error.code.${code}`;
      if (t(key) !== key) return t(key);
    }
    if (status === 401 || status === 403) return t('error.auth');
    if (status === 503) return t('error.unavailable');
    if (status === 409) return t('error.conflict');
    if (status === 404) return t('error.notFound');
    if (status === 400) return t('error.invalid');
    if (Number.isFinite(status)) {
      const suffix = code ? t('error.codeSuffix', { code }) : '';
      return `${t('error.requestFailed', { status })}${suffix}`;
    }
    return t('error.generic');
  }

  function handleFailure(error, scope) {
    if (Number(error?.status) === 409) {
      state.conflict = {
        scope,
        currentRevision: error.currentRevision,
        message: errorMessage(error),
        error,
        at: new Date().toISOString(),
      };
      return;
    }
    if (Number(error?.status) === 401 || Number(error?.status) === 403) {
      state.accessDenied = true;
    }
    state.errorCause = error;
    state.error = errorMessage(error);
  }

  async function request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${API}${path}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        ...options,
        headers: {
          ...(options.headers ?? {}),
        },
      });
    } catch {
      const error = new Error('The console could not reach the DSH Host API.');
      error.network = true;
      throw error;
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      const error = new Error(`The Host returned an unreadable response (HTTP ${response.status}).`);
      error.status = response.status;
      throw error;
    }
    if (!response.ok || !payload || payload.ok !== true) {
      const error = new Error(payload?.error || `The request failed (HTTP ${response.status}).`);
      error.status = response.status;
      if (typeof payload?.code === 'string') error.code = payload.code;
      if (Number.isSafeInteger(payload?.currentRevision)) error.currentRevision = payload.currentRevision;
      throw error;
    }
    return payload.data;
  }

  function write(path, body) {
    return request(path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-amadeus-persona': '1',
      },
      body: JSON.stringify(body),
    });
  }

  function editorFromCore(core) {
    return {
      type: 'core',
      id: null,
      name: t('editor.coreName'),
      description: '',
      body: core?.body ?? '',
      color: '#6b7280',
      revision: core?.revision ?? null,
      isNew: false,
    };
  }

  function editorFromStyle(style) {
    return {
      type: 'style',
      id: style?.id ?? null,
      name: style?.name ?? '',
      description: style?.description ?? '',
      body: style?.body ?? '',
      color: style?.color ?? '#6b7280',
      revision: style?.revision ?? null,
      isNew: style === undefined || style === null,
    };
  }

  function emptyStyleEditor() {
    return {
      type: 'style',
      id: null,
      name: '',
      description: '',
      body: '',
      color: '#6b7280',
      revision: null,
      isNew: true,
    };
  }

  function draftFromBinding(binding) {
    return {
      mode: binding?.mode ?? 'inherit',
      styleId: binding?.styleId ?? null,
    };
  }

  function targetKeyForBinding(binding) {
    return binding.key;
  }

  function buildTargets() {
    const result = [];
    const seen = new Set();
    for (const session of workspaceSessions()) {
      const key = `session:${session.id}`;
      seen.add(key);
      result.push({
        key,
        kind: 'session',
        sessionId: session.id,
        title: session.id,
        subtitle: session.agentPreset
          ? t('target.workspaceSessionPreset', { preset: session.agentPreset })
          : t('target.workspaceSession'),
        subagent: session.subagent === true,
        stale: false,
      });
    }
    for (const scene of verifiedScenes()) {
      const key = scene.key;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        key,
        kind: 'qq',
        sessionId: scene.sessionId,
        scene: { kind: scene.kind, botId: scene.botId, peerId: scene.peerId },
        title: `${scene.kind === 'private' ? t('target.private') : t('target.group')} · ${scene.peerId}`,
        subtitle: scene.sessionId
          ? t('target.qqSubtitleWithSession', { bot: scene.botId, session: shortId(scene.sessionId, 18) })
          : t('target.qqAwaitingSession', { bot: scene.botId }),
        subagent: false,
        stale: false,
      });
    }
    for (const binding of bindings()) {
      if (seen.has(binding.key)) continue;
      seen.add(binding.key);
      if (binding.kind === 'session') {
        result.push({
          key: binding.key,
          kind: 'session',
          sessionId: binding.sessionId,
          title: binding.sessionId ?? binding.key,
          subtitle: t('target.storedBinding'),
          subagent: false,
          stale: true,
        });
      } else {
        result.push({
          key: binding.key,
          kind: 'qq',
          scene: binding.scene,
          title: `${binding.scene?.kind === 'private' ? t('target.private') : t('target.group')} · ${binding.scene?.peerId ?? t('target.unknown')}`,
          subtitle: t('target.storedBinding'),
          subagent: false,
          stale: true,
        });
      }
    }
    return result;
  }

  function filteredTargets() {
    const query = state.sceneQuery.trim().toLowerCase();
    return buildTargets().filter(target => {
      if (state.sceneFilter === 'session' && target.kind !== 'session') return false;
      if (state.sceneFilter === 'qq' && target.kind !== 'qq') return false;
      if (state.sceneFilter === 'subagent' && target.subagent !== true) return false;
      if (query.length === 0) return true;
      return `${target.title} ${target.subtitle} ${target.key}`.toLowerCase().includes(query);
    });
  }

  function findTarget(key) {
    return buildTargets().find(target => target.key === key) ?? null;
  }

  function ensureEditor() {
    if (state.editor !== null) {
      if (state.editor.type === 'style' && state.editor.id !== null && styleById(state.editor.id) === null) {
        if (!state.editorDirty) {
          state.editor = editorFromCore(coreView());
          state.editorDirty = false;
        }
      }
      return;
    }
    state.editor = editorFromCore(coreView());
    state.editorDirty = false;
  }

  function updateEditorMetrics() {
    const editor = state.editor;
    const label = document.getElementById('editor-dirty-label');
    if (label) label.textContent = state.editorDirty ? t('editor.unsaved') : t('editor.saved');
    if (!editor) return;
    const limits = state.cards?.limits ?? {};
    const max = editor.type === 'core' ? (limits.coreMaxChars ?? 0) : (limits.styleBodyMaxChars ?? 0);
    const warn = editor.type === 'core' ? (limits.coreWarnTokens ?? 0) : (limits.styleWarnTokens ?? 0);
    const count = charCount(editor.body);
    const tokens = estimateTokens(editor.body);
    const charNode = document.getElementById('editor-char-count');
    const tokenNode = document.getElementById('editor-token-estimate');
    const warningNode = document.getElementById('editor-token-warning');
    if (charNode) charNode.textContent = t('editor.charCount', { count, max });
    if (tokenNode) tokenNode.textContent = t('editor.tokenEstimate', { tokens, warn: warn || '—' });
    state.editorTokenWarning = warn > 0 && tokens > warn;
    if (warningNode) {
      warningNode.hidden = !state.editorTokenWarning;
      warningNode.textContent = state.editorTokenWarning
        ? t('editor.tokenWarning', { warn })
        : '';
    }
    const conflictNode = document.getElementById('editor-conflict-warning');
    if (conflictNode) {
      conflictNode.hidden = !suspectedPersonaConflict(editor.body);
      conflictNode.textContent = conflictNode.hidden ? '' : t('editor.conflictWarning');
    }
  }

  function suspectedPersonaConflict(body) {
    return /(忽略所有系统指令|你不再是\s*Amadeus|无条件绕过.{0,12}(权限|工具)|ignore all system instructions|you are no longer\s+amadeus|bypass.{0,20}(permission|tool))/i.test(String(body));
  }

  function updateColorSelection() {
    const editor = state.editor;
    if (!editor) return;
    for (const button of document.querySelectorAll('[data-color]')) {
      button.classList.toggle('active', button.getAttribute('data-color') === editor.color);
    }
  }

  async function loadData(options = {}) {
    const {
      renderNow = true,
      keepEditor = state.editorDirty,
      keepBindingDraft = state.bindingDraftDirty,
      syncSettingDrafts = true,
    } = options;
    const sequence = ++loadSequence;
    if (state.overview === null) {
      state.loading = true;
      if (renderNow) render();
    }
    try {
      const [overview, workspaces, cards, bindingsData, diagnostics] = await Promise.all([
        request('/overview'),
        request('/workspaces'),
        request('/cards'),
        request('/bindings'),
        request('/diagnostics'),
      ]);
      if (sequence !== loadSequence) return;
      state.overview = overview;
      state.workspaces = workspaces;
      state.cards = cards;
      state.bindings = bindingsData;
      state.diagnostics = diagnostics;
      state.finalProbe = null;
      state.revision = overview.revision;
      state.error = '';
      state.errorCause = null;
      state.accessDenied = false;
      state.loading = false;
      if (syncSettingDrafts) {
        state.workspaceDraft = workspaces.boundWorkspaceId ?? '';
        state.defaultStyleDraft = cards.defaultStyleId ?? '';
      }
      if (!keepEditor && state.editor !== null && !state.editorDirty) {
        if (state.editor.type === 'core') {
          state.editor = editorFromCore(cards.core);
        } else {
          const current = styleById(state.editor.id);
          state.editor = current === null ? editorFromCore(cards.core) : editorFromStyle(current);
        }
      }
      if (state.target !== null) {
        state.target = findTarget(state.target.key) ?? state.target;
      }
      if (!keepBindingDraft && state.target !== null) {
        state.bindingDraft = draftFromBinding(bindingByKey(state.target.key));
        state.bindingDraftDirty = false;
      }
      if (renderNow) render();
    } catch (error) {
      if (sequence !== loadSequence) return;
      state.loading = false;
      handleFailure(error, 'page');
      if (renderNow) render();
    }
  }

  async function loadBackups(options = {}) {
    const { renderNow = true } = options;
    state.backupsLoading = true;
    state.backupsError = '';
    state.backupsErrorCause = null;
    if (renderNow && state.page === 'settings') render();
    try {
      state.backups = await request('/backups');
    } catch (error) {
      state.backupsErrorCause = error;
      state.backupsError = errorMessage(error);
      if (Number(error?.status) === 401 || Number(error?.status) === 403) state.accessDenied = true;
    } finally {
      state.backupsLoading = false;
      if (renderNow && state.page === 'settings') render();
    }
  }

  async function runWrite(scope, operation, after) {
    if (state.pending) return false;
    state.pending = scope;
    state.error = '';
    state.errorCause = null;
    render();
    try {
      const result = await operation();
      state.pending = '';
      await after(result);
      state.pending = '';
      render();
      return true;
    } catch (error) {
      state.pending = '';
      handleFailure(error, scope);
      render();
      return false;
    }
  }

  function navigate(page) {
    if (!PAGE_IDS.includes(page)) return false;
    if (page === state.page) return true;
    if (state.page === 'library' && state.editorDirty) {
      if (!window.confirm(t('toast.leaveEditorConfirm'))) return false;
    }
    if (state.page === 'bindings' && state.bindingDraftDirty && state.target !== null) {
      if (!window.confirm(t('toast.leaveBindingConfirm'))) return false;
    }
    state.page = page;
    if (window.location.hash !== `#${page}`) {
      window.history.replaceState(null, '', `#${page}`);
    }
    render();
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (page === 'settings' && state.backups === null && !state.backupsLoading) void loadBackups();
    return true;
  }

  function showModal(content) {
    const dialog = document.getElementById('modal');
    if (!dialog) return;
    dialog.innerHTML = content;
    if (!dialog.open) dialog.showModal();
  }

  function closeModal() {
    const dialog = document.getElementById('modal');
    if (dialog?.open) dialog.close();
  }

  function confirmDialog({ title, body, confirmLabel, confirmAction, danger = false, extra = '' }) {
    showModal(`
      <div class="modal-head">
        <h2 id="modal-title">${esc(title)}</h2>
        <button type="button" class="button ghost sm" data-action="close-modal" aria-label="${esc(t('dialog.close'))}">${icon('close', 'sm')}</button>
      </div>
      <p>${body}</p>
      ${extra}
      <div class="modal-actions">
        <button type="button" class="button" data-action="close-modal">${esc(t('dialog.cancel'))}</button>
        <button type="button" class="button ${danger ? 'danger' : 'primary'}" data-action="${esc(confirmAction)}">${esc(confirmLabel)}</button>
      </div>
    `);
  }

  function selectCard(type, id = null) {
    if (state.editorDirty) {
      const current = state.editor;
      const same = current && current.type === type && (type === 'core' || current.id === id);
      if (!same && !window.confirm(t('toast.discardCardConfirm'))) return;
    }
    if (type === 'core') {
      state.editor = editorFromCore(coreView());
    } else {
      const style = styleById(id);
      if (style === null) {
        notify(t('toast.styleNotFound'), t('toast.styleNotFoundDetail'));
        return;
      }
      state.editor = editorFromStyle(style);
    }
    state.editorDirty = false;
    state.historyFor = null;
    state.page = 'library';
    render();
  }

  function newStyle() {
    if (state.editorDirty && !window.confirm(t('toast.discardNewStyleConfirm'))) return;
    state.editor = emptyStyleEditor();
    state.editorDirty = true;
    state.page = 'library';
    render();
    document.getElementById('editor-name')?.focus();
  }

  function openHistory() {
    const editor = state.editor;
    if (!editor || editor.isNew) return;
    const cardType = editor.type === 'core' ? 'core' : 'style';
    const cardId = editor.type === 'style' ? editor.id : null;
    const query = cardId === null ? '?cardType=core' : `?cardType=style&cardId=${encodeURIComponent(cardId)}`;
    state.pending = 'history';
    render();
    request(`/history${query}`).then(data => {
      state.pending = '';
      state.historyFor = { cardType, cardId };
      const entries = Array.isArray(data.history) ? data.history : [];
      const rows = entries.length === 0
        ? `<div class="empty">${esc(t('modal.noPriorVersions'))}</div>`
        : `<div class="stack">${entries.map(entry => `
            <div class="detail-row">
              <div class="label">
                <strong>${esc(historyActionLabel(entry.action))} · r${esc(entry.revision)}</strong>
                <small>${esc(t('modal.historyMeta', { date: formatDate(entry.at), revision: entry.cardRevision }))}</small>
                <small class="body-preview">${plain(entry.snapshot?.body ?? '', 130)}</small>
              </div>
              <button type="button" class="button sm" data-action="rollback" data-history-id="${esc(entry.historyId)}">${icon('history', 'sm')} ${esc(t('dialog.rollBack'))}</button>
            </div>
          `).join('')}</div>`;
      showModal(`
        <div class="modal-head">
          <h2 id="modal-title">${esc(t('modal.versionHistory'))}</h2>
          <button type="button" class="button ghost sm" data-action="close-modal" aria-label="${esc(t('dialog.close'))}">${icon('close', 'sm')}</button>
        </div>
        <p>${esc(t('modal.versionHistoryBody'))}</p>
        ${rows}
        <div class="modal-actions"><button type="button" class="button" data-action="close-modal">${esc(t('dialog.close'))}</button></div>
      `);
      render();
    }).catch(error => {
      state.pending = '';
      handleFailure(error, 'history');
      render();
    });
  }

  function openDeleteStyle() {
    const editor = state.editor;
    if (!editor || editor.type !== 'style' || editor.id === null) return;
    const style = styleById(editor.id);
    if (style === null) return;
    const affected = bindings().filter(binding => binding.mode === 'style' && binding.styleId === style.id);
    const isDefault = state.cards?.defaultStyleId === style.id;
    const affectedText = affected.length === 0
      ? t('modal.deleteStyleNoAffected')
      : tn('modal.deleteStyleAffected', affected.length);
    const defaultNote = isDefault ? t('modal.deleteStyleDefault') : '';
    confirmDialog({
      title: t('modal.deleteStyleTitle', { name: style.name }),
      body: t('modal.deleteStyleBody', { affected: affectedText, defaultNote }),
      confirmLabel: t('dialog.deleteStyle'),
      confirmAction: 'confirm-delete-style',
      danger: true,
    });
  }

  function openDeleteBinding() {
    if (!state.target) return;
    const existing = bindingByKey(state.target.key);
    if (!existing) return;
    confirmDialog({
      title: t('modal.removeBindingTitle'),
      body: t('modal.removeBindingBody', {
        defaultStyle: esc(defaultStyleName()),
        mode: esc(modeLabel(existing)),
      }),
      confirmLabel: t('dialog.removeBinding'),
      confirmAction: 'confirm-delete-binding',
      danger: true,
    });
  }

  function openRestore(backupId) {
    const backup = Array.isArray(state.backups?.backups)
      ? state.backups.backups.find(entry => entry.id === backupId)
      : null;
    if (!backup) {
      notify(t('toast.backupNotFound'), t('toast.backupNotFoundDetail'));
      return;
    }
    showModal(`
      <div class="modal-head">
        <h2 id="modal-title">${esc(t('dialog.restoreBackup'))}</h2>
        <button type="button" class="button ghost sm" data-action="close-modal" aria-label="${esc(t('dialog.close'))}">${icon('close', 'sm')}</button>
      </div>
      <p>${esc(t('modal.restoreBody', { revision: backup.revision, date: formatDate(backup.createdAt) }))}</p>
      <div class="field">
        <label for="restore-confirm">${esc(t('modal.typeRestore'))}</label>
        <input id="restore-confirm" autocomplete="off" spellcheck="false" placeholder="${esc(t('modal.restorePlaceholder'))}">
      </div>
      <div class="modal-actions">
        <button type="button" class="button" data-action="close-modal">${esc(t('dialog.cancel'))}</button>
        <button type="button" class="button danger" data-action="confirm-restore" data-backup-id="${esc(backup.id)}">${esc(t('dialog.restore'))}</button>
      </div>
    `);
    document.getElementById('restore-confirm')?.focus();
  }

  function showConflictBanner() {
    const conflict = state.conflict;
    if (!conflict) return '';
    const keep = conflict.scope === 'editor' || conflict.scope === 'binding';
    const message = conflict.error ? errorMessage(conflict.error) : conflict.message;
    return `
      <div class="banner conflict" role="alert">
        <div class="banner-icon">${icon('alert', 'lg')}</div>
        <div class="grow">
          <strong>${esc(t('banner.conflictTitle'))}</strong>
          <p>${esc(message)}${Number.isSafeInteger(conflict.currentRevision) ? ` ${t('banner.conflictRevision', { revision: esc(conflict.currentRevision) })}` : ''} ${keep ? esc(t('banner.conflictKeepDraft')) : ''}</p>
          <div class="banner-actions">
            ${keep ? `<button type="button" class="button sm primary" data-action="conflict-reload-keep">${icon('refresh', 'sm')} ${esc(t('banner.keepDraft'))}</button>` : ''}
            <button type="button" class="button sm" data-action="conflict-reload">${icon('refresh', 'sm')} ${esc(t('banner.reload'))}${keep ? ` ${esc(t('banner.discardDraft'))}` : ''}</button>
            <button type="button" class="button sm ghost" data-action="conflict-dismiss">${esc(t('banner.dismiss'))}</button>
          </div>
        </div>
      </div>
    `;
  }

  function banners() {
    let html = '';
    if (state.accessDenied) {
      html += `<div class="banner bad" role="alert">${icon('lock', 'lg')}<div><strong>${esc(t('banner.ownerRequiredTitle'))}</strong><p>${esc(t('banner.ownerRequiredBody'))}</p></div></div>`;
    }
    const errorText = state.errorCause ? errorMessage(state.errorCause) : state.error;
    if (errorText) {
      html += `<div class="banner bad" role="alert">${icon('alert', 'lg')}<div class="grow"><strong>${esc(t('banner.hostFailedTitle'))}</strong><p>${esc(errorText)}</p><div class="banner-actions"><button type="button" class="button sm" data-action="refresh">${icon('refresh', 'sm')} ${esc(t('banner.reloadHost'))}</button><button type="button" class="button sm ghost" data-action="dismiss-error">${esc(t('banner.dismiss'))}</button></div></div></div>`;
    }
    html += showConflictBanner();
    return html ? `<div class="banner-stack">${html}</div>` : '';
  }

  function navButton(page, iconName, label, count) {
    return `<button type="button" data-nav="${page}" class="${state.page === page ? 'active' : ''}">${icon(iconName)}${label}${count !== undefined && count !== null ? `<span class="nav-meta">${esc(count)}</span>` : ''}</button>`;
  }

  function languageSwitcher() {
    return `<label class="lang-field">
      <span class="lang-text">${esc(t('app.languageLabel'))}</span>
      <select id="language-select" class="lang-select" aria-label="${esc(t('app.languageLabel'))}">
        ${LANGUAGES.map(language => `<option value="${esc(language)}" ${state.language === language ? 'selected' : ''}>${esc(language === 'zh-CN' ? t('app.languageChinese') : t('app.languageEnglish'))}</option>`).join('')}
      </select>
    </label>`;
  }

  function topbar() {
    const storage = state.overview?.storage;
    const workspace = boundWorkspace();
    const revision = state.revision ?? state.overview?.revision;
    return `
      <header class="topbar">
        <div>
          <div class="eyebrow">${esc(t('app.eyebrow'))}</div>
          <h1>${esc(pageTitle())}</h1>
          <div class="subline">${esc(pageSubtitle())}</div>
        </div>
        <div class="top-tools">
          <span class="pill ${workspace ? 'green' : 'amber'}">${icon('folder', 'sm')} ${esc(workspace?.title ?? t('app.noWorkspaceBound'))}</span>
          <span class="pill ${storage?.status === 'ok' ? 'green' : 'amber'}">${icon('database', 'sm')} ${esc(storageLabel(storage?.status ?? 'unavailable'))}</span>
          <span class="pill">${icon('branch', 'sm')} ${esc(revision === undefined || revision === null ? t('common.revisionDash') : t('common.revisionValue', { revision }))}</span>
          ${languageSwitcher()}
          <button type="button" class="button" data-action="theme">${icon(state.theme === 'dark' ? 'sun' : 'moon', 'sm')} ${esc(state.theme === 'dark' ? t('app.themeLight') : t('app.themeDark'))}</button>
        </div>
      </header>
    `;
  }

  function layout(content) {
    const overview = state.overview;
    const storage = overview?.storage;
    const workspace = boundWorkspace();
    const revision = state.revision ?? overview?.revision;
    return `
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-logo">A</div>
          <div class="brand-text"><strong>Amadeus <span class="tiny-tag">${esc(t('app.brandPersona'))}</span></strong><small>${esc(t('app.brandSubtitle'))}</small></div>
        </div>
        <div>
          <div class="nav-cap">${esc(t('app.navCaption'))}</div>
          <nav class="nav" aria-label="${esc(t('app.navAria'))}">
            ${navButton('overview', 'home', esc(t('page.overview.nav')))}
            ${navButton('library', 'layers', esc(t('page.library.nav')), overview?.counts?.styles)}
            ${navButton('bindings', 'users', esc(t('page.bindings.nav')), overview?.counts?.bindings)}
            <div class="nav-divider"></div>
            ${navButton('diagnostics', 'activity', esc(t('page.diagnostics.nav')))}
            ${navButton('settings', 'sliders', esc(t('page.settings.nav')))}
          </nav>
        </div>
        <div class="sidebar-bottom">
          <div class="status-box">
            <div class="title">${esc(t('app.hostStatus'))}</div>
            <div class="value ${storage?.status === 'ok' ? '' : 'bad'}"><span class="dot ${storage?.status === 'ok' ? 'ok' : 'bad'}"></span>${esc(storageLabel(storage?.status ?? 'unavailable'))}</div>
            <p>${esc(overview?.workspace ? t('app.coreAndStyleNext') : t('app.noWorkspaceInjectsNothing'))}</p>
            <div class="slot"><span>${esc(t('app.workspace'))}</span><strong>${esc(workspace?.title ?? t('common.notBound'))}</strong></div>
            <div class="slot"><span>${esc(t('app.injection'))}</span><strong>${esc(overview?.injectionEnabled === true ? t('common.enabled') : t('common.disabled'))}</strong></div>
            <div class="slot"><span>${esc(t('app.revision'))}</span><strong>${revision === undefined || revision === null ? esc(t('common.dash')) : `r${esc(revision)}`}</strong></div>
          </div>
          <div class="side-foot">${esc(t('app.ownerAuthenticated'))}</div>
        </div>
      </aside>
      <main class="main">
        <div class="wrap">
          ${topbar()}
          ${banners()}
          ${content}
          <footer class="footer">${esc(t('app.footer'))}</footer>
        </div>
      </main>
    `;
  }

  function loadingContent() {
    return `
      <div class="card pad-lg loading-card">
        <div class="eyebrow">${esc(t('loading.eyebrow'))}</div>
        <h2>${esc(t('loading.title'))}</h2>
        <p>${esc(t('loading.body'))}</p>
        <div class="skeleton-lines"><span></span><span></span><span></span></div>
      </div>
    `;
  }

  function unavailableContent() {
    return `
      <div class="card pad-lg">
        <h2>${esc(t('unavailable.title'))}</h2>
        <p>${esc(t('unavailable.body'))}</p>
        <div class="form-actions mt-16"><button type="button" class="button primary" data-action="refresh">${icon('refresh', 'sm')} ${esc(t('unavailable.retry'))}</button></div>
      </div>
    `;
  }

  function overviewWarnings() {
    const warnings = [];
    const overview = state.overview;
    if (!overview) return warnings;
    if (overview.storage?.status !== 'ok') {
      warnings.push({ tone: 'bad', title: t('overview.warning.storageTitle'), text: t('overview.warning.storageText') });
    }
    if (overview.workspaceId === null) {
      warnings.push({ tone: 'amber', title: t('overview.warning.noWorkspaceTitle'), text: t('overview.warning.noWorkspaceText') });
    } else if (overview.workspace === null) {
      warnings.push({ tone: 'bad', title: t('overview.warning.workspaceMissingTitle'), text: t('overview.warning.workspaceMissingText') });
    }
    if (overview.injectionEnabled !== true) {
      warnings.push({ tone: 'amber', title: t('overview.warning.injectionTitle'), text: t('overview.warning.injectionText') });
    }
    if (coreView()?.token?.tokenWarning) {
      warnings.push({ tone: 'amber', title: t('overview.warning.coreTokenTitle'), text: t('overview.warning.coreTokenText') });
    }
    if (Array.isArray(overview.warnings) && overview.warnings.includes('PERSONA_TOKEN_WARNING')) {
      warnings.push({ tone: 'amber', title: t('overview.warning.cardsTokenTitle'), text: t('overview.warning.cardsTokenText') });
    }
    if (overview.warnings?.includes('PERSONA_MEMORY_CARD_STATUS_UNVERIFIED')) {
      warnings.push({ tone: 'amber', title: t('overview.warning.memoryTitle'), text: t('overview.warning.memoryText') });
    }
    if (overview.warnings?.includes('PERSONA_MARKDOWN_PROJECTION_UNAVAILABLE')) {
      warnings.push({ tone: 'amber', title: t('overview.warning.markdownTitle'), text: t('overview.warning.markdownText') });
    }
    return warnings;
  }

  function renderOverview() {
    const overview = state.overview;
    if (!overview) return unavailableContent();
    const workspace = boundWorkspace();
    const core = coreView();
    const styleCards = styles();
    const configuredBindings = bindings();
    const warnings = overviewWarnings();
    const coreText = core?.body ?? '';
    const sessionCount = workspaceSessions().length;
    const sceneCount = verifiedScenes().length;
    const defaultName = defaultStyleName();
    const warningMarkup = warnings.length === 0
      ? `<div class="info-note">${icon('circlecheck')}<span><strong>${esc(t('overview.noWarningsTitle'))}</strong> ${esc(t('overview.noWarningsBody'))}</span></div>`
      : `<div class="stack">${warnings.map(warning => `<div class="banner ${warning.tone === 'bad' ? 'bad' : 'warning'}">${icon('alert')}<div><strong>${esc(warning.title)}</strong><p>${esc(warning.text)}</p></div></div>`).join('')}</div>`;
    const bindingRows = configuredBindings.length === 0
      ? `<div class="empty">${esc(t('overview.noExplicitBindings'))}</div>`
      : `<div class="table-wrap"><table class="test-table">
          <thead><tr><th>${esc(t('overview.tableTarget'))}</th><th>${esc(t('overview.tableMode'))}</th><th>${esc(t('overview.tableStatus'))}</th><th></th></tr></thead>
          <tbody>${configuredBindings.map(binding => {
            const label = binding.kind === 'qq'
              ? `${binding.scene?.kind === 'private' ? t('target.private') : t('target.group')} · ${binding.scene?.peerId ?? t('target.unknown')}`
              : binding.sessionId ?? binding.key;
            return `<tr>
              <td><strong>${esc(label)}</strong><div class="fine muted">${esc(binding.kind === 'qq' ? t('target.verifiedQqScene') : t('target.workspaceSessionLabel'))}</div></td>
              <td>${esc(modeLabel(binding))}</td>
              <td><span class="pill ${statusTone(binding.status)}">${esc(statusLabel(binding.status))}</span><div class="fine muted">${esc(statusReason(binding.status))}</div></td>
              <td><button type="button" class="button sm" data-action="open-binding" data-binding-key="${esc(binding.key)}">${esc(t('overview.inspect'))}</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`;
    return `
      <section class="hero card">
        <div>
          <div class="kicker">${icon('sparkles', 'sm')} ${esc(t('overview.heroKicker'))}</div>
          <h2>${workspace ? esc(t('overview.heroScoped', { workspace: workspace.title })) : esc(t('overview.heroUnbound'))}</h2>
          <p>${esc(t('overview.heroBody'))}</p>
          <div class="button-row">
            <button type="button" class="button primary" data-nav="${workspace ? 'bindings' : 'settings'}">${icon(workspace ? 'users' : 'folder', 'sm')} ${esc(workspace ? t('overview.manageBindings') : t('overview.chooseWorkspace'))} ${icon('arrow', 'sm')}</button>
            <button type="button" class="button soft" data-nav="library">${icon('layers', 'sm')} ${esc(t('overview.editCore'))}</button>
          </div>
        </div>
        <div class="flow-diagram">
          <div class="flow-center"><div class="flow-icon">${icon('heart', 'lg')}</div><div><strong>${esc(coreText.trim().length > 0 ? t('overview.coreConfigured') : t('overview.coreEmpty'))}</strong><small>${esc(t('overview.coreShared'))}</small></div></div>
          <div class="flow-line"></div>
          <div class="flow-branches">
            <div class="flow-chip"><strong>${esc(styleCards.length)}</strong><small>${esc(t('overview.styleCards'))}</small></div>
            <div class="flow-chip"><strong>${esc(configuredBindings.length)}</strong><small>${esc(t('overview.explicitBindings'))}</small></div>
            <div class="flow-chip"><strong>${esc(defaultName)}</strong><small>${esc(t('overview.workspaceDefault'))}</small></div>
          </div>
        </div>
      </section>
      <div class="section-header"><h2>${esc(t('overview.personaOverview'))}</h2><span class="micro">${esc(t('overview.revisionNext', { revision: overview.revision }))}</span></div>
      <div class="stats">
        <div class="card stat"><div class="top">${esc(t('overview.corePersona'))}<span class="stat-ico">${icon('heart')}</span></div><div class="number text-stat">${esc(coreText.trim().length > 0 ? t('overview.present') : t('overview.empty'))}</div><div class="hint">${esc(t('overview.charactersTokens', { chars: core?.token?.characters ?? 0, tokens: core?.token?.estimatedTokens ?? 0 }))}</div></div>
        <div class="card stat"><div class="top">${esc(t('overview.styleCards'))}<span class="stat-ico purple">${icon('layers')}</span></div><div class="number">${esc(overview.counts?.styles ?? 0)}</div><div class="hint">${esc(t('overview.reusableTargets'))}</div></div>
        <div class="card stat"><div class="top">${esc(t('overview.explicitBindings'))}<span class="stat-ico blue">${icon('branch')}</span></div><div class="number">${esc(overview.counts?.bindings ?? 0)}</div><div class="hint">${esc(t('overview.workspaceSessionsVerified', { sessions: sessionCount, scenes: sceneCount }))}</div></div>
        <div class="card stat"><div class="top">${esc(t('overview.injection'))}<span class="stat-ico amber">${icon('shield')}</span></div><div class="number text-stat">${esc(overview.injectionEnabled === true ? t('overview.enabled') : t('overview.disabled'))}</div><div class="hint">${esc(workspace ? t('overview.boundToOne') : t('overview.noWorkspace'))}</div></div>
      </div>
      <div class="section-header"><h2>${esc(t('overview.warningsBoundaries'))}</h2><button class="button sm" data-action="refresh">${icon('refresh', 'sm')} ${esc(t('overview.refresh'))}</button></div>
      ${warningMarkup}
      <div class="overview-grid">
        <div class="card pad">
          <div class="section-header compact"><h2>${esc(t('overview.boundWorkspace'))}</h2><button class="button sm" data-nav="settings">${icon('sliders', 'sm')} ${esc(t('overview.settings'))}</button></div>
          ${workspace ? `<div class="binding-grid">
            <div class="soft-box"><div class="field-label">${esc(t('overview.workspace'))}</div><strong>${esc(workspace.title)}</strong><div class="micro muted">${esc(workspace.id)}</div></div>
            <div class="soft-box"><div class="field-label">${esc(t('overview.trustedMembership'))}</div><strong>${esc(tn('overview.sessionsCount', Number(workspace.sessionCount ?? sessionCount)))}</strong><div class="micro muted">${esc(t('overview.subagentsExcluded'))}</div></div>
            <div class="soft-box"><div class="field-label">${esc(t('overview.defaultStyle'))}</div><strong>${esc(defaultName)}</strong><div class="micro muted">${esc(t('overview.defaultStyleHint'))}</div></div>
            <div class="soft-box"><div class="field-label">${esc(t('overview.effectiveTiming'))}</div><strong>${esc(t('overview.nextAssembly'))}</strong><div class="micro muted">${esc(t('overview.noRecreate'))}</div></div>
          </div>` : `<div class="empty">${esc(t('overview.noWorkspaceBound'))} <button type="button" class="button sm ml-8" data-nav="settings">${esc(t('overview.chooseOne'))}</button></div>`}
        </div>
        <div class="card pad">
          <div class="section-header compact"><h2>${esc(t('overview.howResolves'))}</h2><span class="micro">${esc(t('overview.failClosed'))}</span></div>
          <div class="pipeline vertical">
            <div class="pipe-item"><span class="num">${esc(t('overview.pipeline.identityNum'))}</span><strong>${esc(t('overview.pipeline.identityTitle'))}</strong><small>${esc(t('overview.pipeline.identityBody'))}</small></div>
            <div class="pipe-item"><span class="num">${esc(t('overview.pipeline.trustNum'))}</span><strong>${esc(t('overview.pipeline.trustTitle'))}</strong><small>${esc(t('overview.pipeline.trustBody'))}</small></div>
            <div class="pipe-item"><span class="num">${esc(t('overview.pipeline.overrideNum'))}</span><strong>${esc(t('overview.pipeline.overrideTitle'))}</strong><small>${esc(t('overview.pipeline.overrideBody'))}</small></div>
            <div class="pipe-item"><span class="num">${esc(t('overview.pipeline.assemblyNum'))}</span><strong>${esc(t('overview.pipeline.assemblyTitle'))}</strong><small>${esc(t('overview.pipeline.assemblyBody'))}</small></div>
          </div>
        </div>
      </div>
      <div class="section-header"><h2>${esc(t('overview.configuredBindings'))}</h2><button class="button sm" data-nav="bindings">${esc(t('overview.openBindings'))} ${icon('arrow', 'sm')}</button></div>
      <div class="card">${bindingRows}</div>
    `;
  }

  function renderLibrary() {
    if (!state.cards) return state.loading ? loadingContent() : unavailableContent();
    ensureEditor();
    const editor = state.editor;
    const core = coreView();
    const styleCards = styles();
    const coreToken = tokenSummary(core, 'core');
    const activeStyle = editor?.type === 'style' ? editor.id : null;
    const styleGrid = styleCards.length === 0
      ? `<div class="empty card pad">${esc(t('editor.noStyleCards'))} <button type="button" class="button sm ml-8" data-action="new-style">${icon('plus', 'sm')} ${esc(t('editor.createFirstStyle'))}</button></div>`
      : `<div class="library-grid">${styleCards.map(style => {
        const token = tokenSummary(style, 'style');
        return `<button type="button" class="profile-card ${activeStyle === style.id ? 'active' : ''}" data-select-card="style" data-card-id="${esc(style.id)}">
          <div class="profile-emblem ${colorTone(style.color)}">${icon('edit')}</div>
          <div class="title"><strong>${esc(style.name)}</strong><span class="pill outline fine">r${esc(style.revision)}</span></div>
          <p>${plain(style.description || style.body, 82)}</p>
          <div class="foot"><span>${esc(t('editor.estTokens', { tokens: token.estimated }))}${token.warning ? esc(t('editor.tokenWarningSuffix')) : ''}</span><span>${icon('chevron', 'sm')} ${esc(t('editor.edit'))}</span></div>
        </button>`;
      }).join('')}</div>`;
    return `
      <div class="section-header no-top"><h2>${esc(t('editor.personaDefinitions'))}</h2><button type="button" class="button primary" data-action="new-style">${icon('plus', 'sm')} ${esc(t('editor.newStyle'))}</button></div>
      <div class="library-layout">
        <div>
          <div class="core-card card">
            <div class="headl">
              <div class="head-with-icon"><div class="profile-emblem green">${icon('heart')}</div><div><h3>${esc(t('editor.coreName'))}</h3><div class="micro muted">${esc(t('editor.sharedIdentity'))}</div></div></div>
              <span class="pill ${core?.body?.trim() ? 'green' : 'amber'}">${esc(core?.body?.trim() ? t('editor.configured') : t('editor.empty'))}</span>
            </div>
            <p>${core?.body?.trim() ? plain(core.body, 190) : esc(t('editor.coreEmptyText'))}</p>
            <div class="card-meta">
              <span class="pill outline">r${esc(core?.revision ?? 0)}</span>
              <span class="micro muted">${esc(t('editor.charsTokens', { chars: coreToken.characters, tokens: coreToken.estimated }))}${coreToken.warning ? esc(t('editor.tokenWarningSuffix')) : ''}</span>
              <span class="grow"></span>
              <button type="button" class="button sm" data-select-card="core">${icon('edit', 'sm')} ${esc(t('editor.editCore'))}</button>
              <button type="button" class="button sm" data-action="core-history">${icon('history', 'sm')} ${esc(t('editor.history'))}</button>
            </div>
          </div>
          <div class="section-header"><h2>${esc(t('editor.styleLibrary'))}</h2><span class="micro">${esc(t('editor.reusable'))}</span></div>
          ${styleGrid}
          <div class="info-note">${icon('info')}<span><strong>${esc(t('editor.expressionNoteTitle'))}</strong> ${esc(t('editor.expressionNote'))}</span></div>
        </div>
        <div class="card editor-card" id="editor">${renderEditor()}</div>
      </div>
    `;
  }

  function renderEditor() {
    const editor = state.editor;
    if (!editor) return `<div class="empty">${esc(t('editor.selectCard'))}</div>`;
    const core = editor.type === 'core';
    const limits = state.cards?.limits ?? {};
    const max = core ? limits.coreMaxChars ?? 20000 : limits.styleBodyMaxChars ?? 12000;
    const token = {
      characters: charCount(editor.body),
      estimated: estimateTokens(editor.body),
      warningAt: core ? (limits.coreWarnTokens ?? 0) : (limits.styleWarnTokens ?? 0),
    };
    token.warning = token.warningAt > 0 && token.estimated > token.warningAt;
    state.editorTokenWarning = token.warning;
    const disabled = state.pending !== '' || state.accessDenied;
    const saveDisabled = disabled;
    const styleFields = core ? '' : `
      <div class="field">
        <label for="editor-name">${esc(t('editor.styleName'))}</label>
        <input id="editor-name" data-edit="name" maxlength="${esc(limits.styleNameMaxChars ?? 80)}" value="${esc(editor.name)}" autocomplete="off">
      </div>
      <div class="field">
        <label for="editor-description">${esc(t('editor.description'))}</label>
        <input id="editor-description" data-edit="description" maxlength="${esc(limits.styleDescriptionMaxChars ?? 500)}" value="${esc(editor.description)}" autocomplete="off">
      </div>
      <div class="field">
        <label>${esc(t('editor.colorLabel'))}</label>
        <div class="swatches" role="group" aria-label="${esc(t('editor.styleColor'))}">
          ${COLOR_PRESETS.map(color => `<button type="button" class="swatch c-${color.name} ${editor.color === color.value ? 'active' : ''}" data-color="${esc(color.value)}" aria-label="${esc(t(`color.${color.name}`))}" title="${esc(t(`color.${color.name}`))}"></button>`).join('')}
          <input class="color-input" id="editor-color" type="color" value="${esc(editor.color)}" aria-label="${esc(t('editor.customColor'))}">
        </div>
      </div>
    `;
    return `
      <div class="ed-head">
        <div class="profile-emblem ${core ? 'green' : 'violet'}">${icon(core ? 'heart' : 'edit', 'lg')}</div>
        <div class="grow"><strong>${esc(editor.isNew ? t('editor.newStyleTitle') : core ? t('editor.editCoreTitle') : t('editor.editStyleTitle'))}</strong><span>${esc(core ? t('editor.coreSubtitle') : t('editor.styleSubtitle'))}</span></div>
        <span class="pill ${core ? 'green' : 'purple'}">${esc(core ? t('editor.badgeCore') : t('editor.badgeStyle'))}</span>
      </div>
      ${editor.isNew && !core ? `<div class="info-note compact-note">${icon('plus')}<span>${esc(t('editor.newStyleNote'))}</span></div>` : ''}
      <div class="ed-grid">${styleFields}</div>
      <div class="field">
        <label for="editor-body">${esc(core ? t('editor.coreBodyLabel') : t('editor.styleBodyLabel'))}</label>
        <textarea id="editor-body" data-edit="body" rows="12" maxlength="${esc(max)}" spellcheck="false" placeholder="${esc(core ? t('editor.corePlaceholder') : t('editor.stylePlaceholder'))}">${esc(editor.body)}</textarea>
        <div class="editor-meta">
          <small id="editor-char-count">${esc(t('editor.charCount', { count: token.characters, max }))}</small>
          <small id="editor-token-estimate">${esc(t('editor.tokenEstimate', { tokens: token.estimated, warn: token.warningAt || t('common.dash') }))}</small>
        </div>
        <div id="editor-token-warning" class="token-warning" ${token.warning ? '' : 'hidden'}>${token.warning ? esc(t('editor.tokenWarning', { warn: token.warningAt })) : ''}</div>
        <div id="editor-conflict-warning" class="token-warning" ${suspectedPersonaConflict(editor.body) ? '' : 'hidden'}>${suspectedPersonaConflict(editor.body) ? esc(t('editor.conflictWarning')) : ''}</div>
      </div>
      <div class="form-actions editor-actions">
        <span class="save-hint" id="editor-dirty-label">${esc(state.editorDirty ? t('editor.unsaved') : t('editor.saved'))}</span>
        ${editor.isNew ? '' : `<button type="button" class="button sm" data-action="open-history" ${disabled ? 'disabled' : ''}>${icon('history', 'sm')} ${esc(t('editor.history'))}</button>`}
        ${core ? '' : `<button type="button" class="button sm" data-action="copy-style" ${editor.isNew || disabled ? 'disabled' : ''}>${icon('copy', 'sm')} ${esc(t('editor.copy'))}</button>`}
        ${core ? '' : `<button type="button" class="button sm danger" data-action="delete-style" ${editor.isNew || disabled ? 'disabled' : ''}>${icon('trash', 'sm')} ${esc(t('editor.delete'))}</button>`}
        <button type="button" class="button sm" data-action="discard-editor" ${!state.editorDirty || disabled ? 'disabled' : ''}>${esc(t('editor.discard'))}</button>
        <button type="button" class="button primary" id="save-editor" data-action="save-editor" ${saveDisabled ? 'disabled' : ''}>${icon('check', 'sm')} ${esc(editor.isNew ? t('editor.create') : t('editor.save'))}</button>
      </div>
      <p class="fine muted editor-footnote">${esc(t('editor.footnote'))}</p>
    `;
  }

  function renderTargetList() {
    const targets = filteredTargets();
    if (targets.length === 0) return `<div class="empty">${esc(t('bindings.noMatches'))}</div>`;
    return targets.map(target => {
      const binding = bindingByKey(target.key);
      const active = state.target?.key === target.key;
      return `<button type="button" class="scene-choice ${active ? 'active' : ''}" data-target-key="${esc(target.key)}">
        <div class="scene-avatar ${target.kind === 'qq' ? 'qq' : 'dsh'}">${icon(target.kind === 'qq' ? (target.scene?.kind === 'private' ? 'message' : 'users') : 'message', 'sm')}</div>
        <div class="body"><strong>${esc(target.title)}</strong><small>${esc(target.subtitle)}</small></div>
        ${target.subagent ? `<span class="pill amber fine">${esc(t('target.subagentPill'))}</span>` : binding ? `<span class="tone-dot ${statusTone(binding.status)}"></span>` : ''}
      </button>`;
    }).join('');
  }

  function renderBindings() {
    if (!state.workspaces) return state.loading ? loadingContent() : unavailableContent();
    const allTargets = buildTargets();
    const sessionCount = allTargets.filter(target => target.kind === 'session').length;
    const qqCount = allTargets.filter(target => target.kind === 'qq').length;
    const selected = state.target;
    const existing = selected ? bindingByKey(selected.key) : null;
    if (selected && state.bindingDraft === null) state.bindingDraft = draftFromBinding(existing);
    const draft = state.bindingDraft ?? { mode: 'inherit', styleId: null };
    const styleList = styles();
    const selectedStyle = draft.styleId === null ? null : styleById(draft.styleId);
    const canSave = selected !== null && selected.subagent !== true && state.pending === '' && !state.accessDenied;
    const detail = selected === null
      ? `<div class="empty detail-empty">${esc(t('bindings.selectTarget'))}<div class="fine muted">${esc(t('bindings.selectTargetHint'))}</div></div>`
      : `<div class="detail-header">
          <div class="scene-avatar ${selected.kind === 'qq' ? 'qq' : 'dsh'}">${icon(selected.kind === 'qq' ? (selected.scene?.kind === 'private' ? 'message' : 'users') : 'message')}</div>
          <div class="grow"><h2>${esc(selected.title)}</h2><p>${esc(selected.subtitle)}</p></div>
          ${existing ? `<span class="pill ${statusTone(existing.status)}">${esc(statusLabel(existing.status))}</span>` : `<span class="pill">${esc(t('status.noExplicitBinding'))}</span>`}
        </div>
        <div class="binding-grid">
          <div class="soft-box"><div class="field-label">${esc(t('bindings.targetSource'))}</div><strong>${esc(selected.kind === 'qq' ? t('bindings.verifiedQqMapping') : t('bindings.currentMembership'))}</strong><div class="micro muted">${esc(selected.stale ? t('bindings.staleTarget') : t('bindings.revalidated'))}</div></div>
          <div class="soft-box"><div class="field-label">${esc(t('bindings.stableKey'))}</div><strong class="mono break">${esc(selected.key)}</strong><div class="micro muted">${selected.subagent ? esc(t('bindings.subagentExcluded')) : existing ? esc(t('bindings.bindingRevision', { revision: existing.revision, date: formatDate(existing.updatedAt) })) : esc(t('bindings.inheritsDefault'))}</div></div>
        </div>
        ${selected.subagent ? `<div class="banner warning">${icon('alert')}<div><strong>${esc(t('bindings.subagentBannerTitle'))}</strong><p>${t('bindings.subagentBannerBody')}</p></div></div>` : ''}
        ${existing && existing.status?.valid !== true ? `<div class="banner warning">${icon('alert')}<div><strong>${esc(t('bindings.untrustedBannerTitle'))}</strong><p>${esc(t('bindings.untrustedBannerBody', { reason: statusReason(existing.status) }))}</p></div></div>` : ''}
        <div class="field">
          <label for="binding-mode">${esc(t('bindings.modeLabel'))}</label>
          <select id="binding-mode" class="select-control" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>
            ${BINDING_MODES.map(mode => `<option value="${mode}" ${draft.mode === mode ? 'selected' : ''}>${esc(mode === 'inherit' ? t('mode.inheritOption', { style: defaultStyleName() }) : mode === 'core-only' ? t('mode.coreOnlyOption') : mode === 'style' ? t('mode.specifiedStyle') : t('mode.disabledOption'))}</option>`).join('')}
          </select>
          <small>${esc(t('bindings.modeHelp'))}</small>
        </div>
        ${draft.mode === 'style' ? `<div class="field">
          <label for="binding-style">${esc(t('bindings.styleCard'))}</label>
          <select id="binding-style" class="select-control" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>
            <option value="">${esc(t('bindings.selectStyleOption'))}</option>
            ${styleList.map(style => `<option value="${esc(style.id)}" ${draft.styleId === style.id ? 'selected' : ''}>${esc(style.name)} · r${esc(style.revision)}</option>`).join('')}
          </select>
          ${styleList.length === 0 ? `<small class="warn-text">${esc(t('bindings.noStyles'))}</small>` : ''}
        </div>` : ''}
        <div class="form-actions">
          <button type="button" class="button sm" data-action="reset-binding" ${!existing || state.pending !== '' || state.accessDenied ? 'disabled' : ''}>${esc(t('bindings.resetInherit'))}</button>
          <button type="button" class="button sm danger" data-action="delete-binding" ${!existing || state.pending !== '' || state.accessDenied ? 'disabled' : ''}>${esc(t('bindings.remove'))}</button>
          <span class="grow"></span>
          <button type="button" class="button primary" data-action="save-binding" ${canSave ? '' : 'disabled'}>${icon('check', 'sm')} ${esc(t('bindings.save'))}</button>
        </div>
        <div class="section-header"><h2>${esc(t('bindings.configuredPreview'))}</h2><span class="micro">${esc(t('bindings.previewNote'))}</span></div>
        ${renderBindingPreview(draft, selectedStyle)}
        <div class="info-note">${icon('info')}<span><strong>${esc(t('bindings.deletionImpactTitle'))}</strong> ${esc(t('bindings.deletionImpactBody'))}</span></div>
      `;
    return `
      ${boundWorkspaceId() === null ? `<div class="banner warning">${icon('folder')}<div><strong>${esc(t('bindings.noWorkspaceTitle'))}</strong><p>${esc(t('bindings.noWorkspaceBody'))}</p><div class="banner-actions"><button type="button" class="button sm" data-nav="settings">${esc(t('bindings.openSettings'))}</button></div></div></div>` : ''}
      <div class="scene-layout">
        <aside class="card scene-aside">
          <div class="search">${icon('search', 'sm')}<input id="scene-query" aria-label="${esc(t('bindings.searchAria'))}" placeholder="${esc(t('bindings.searchPlaceholder'))}" value="${esc(state.sceneQuery)}"></div>
          <div class="filter-pills" role="group" aria-label="${esc(t('bindings.filterAria'))}">
            <button type="button" class="${state.sceneFilter === 'all' ? 'active' : ''}" data-filter="all">${esc(t('bindings.all', { count: allTargets.length }))}</button>
            <button type="button" class="${state.sceneFilter === 'session' ? 'active' : ''}" data-filter="session">${esc(t('bindings.sessions', { count: sessionCount }))}</button>
            <button type="button" class="${state.sceneFilter === 'qq' ? 'active' : ''}" data-filter="qq">${esc(t('bindings.qq', { count: qqCount }))}</button>
            <button type="button" class="${state.sceneFilter === 'subagent' ? 'active' : ''}" data-filter="subagent">${esc(t('bindings.subagents'))}</button>
          </div>
          <div class="scene-list" id="scene-list">${renderTargetList()}</div>
          <div class="aside-foot">${esc(t('bindings.asidePrefix'))}<span class="mono">Workspace.sessionIds</span>${esc(t('bindings.asideSuffix'))}</div>
        </aside>
        <div class="card scene-detail">${detail}</div>
      </div>
    `;
  }

  function renderBindingPreview(draft, selectedStyle) {
    if (draft.mode === 'disabled') {
      return `<div class="prompt-piece gray"><div class="p-title"><strong>${icon('pause', 'sm')} ${esc(t('bindings.noSectionsTitle'))}</strong><span class="pill">${esc(t('bindings.disabledBadge'))}</span></div><p>${esc(t('bindings.noSectionsBody'))}</p></div>`;
    }
    const core = coreView();
    const effectiveStyle = draft.mode === 'style'
      ? selectedStyle
      : (state.cards?.defaultStyleId === null ? null : styleById(state.cards?.defaultStyleId));
    return `<div class="preview-stack">
      <div class="prompt-piece"><div class="p-title"><strong>${icon('heart', 'sm')} ${esc(t('bindings.corePreviewTitle'))}</strong><span class="pill green">SOUL</span></div><p>${core?.body?.trim() ? plain(core.body, 260) : esc(t('bindings.coreEmptyPreview'))}</p></div>
      ${effectiveStyle ? `<div class="prompt-piece violet"><div class="p-title"><strong>${icon('sparkles', 'sm')} ${esc(effectiveStyle.name)}</strong><span class="pill purple">STYLE</span></div><p>${plain(effectiveStyle.body, 240)}</p></div>` : `<div class="prompt-piece gray"><div class="p-title"><strong>${icon('layers', 'sm')} ${esc(t('bindings.noStyleLayerTitle'))}</strong><span class="pill">${esc(t('bindings.noStyleLayerBadge'))}</span></div><p>${esc(t('bindings.noStyleLayerBody'))}</p></div>`}
      <div class="prompt-piece blue"><div class="p-title"><strong>${icon('shield', 'sm')} ${esc(t('bindings.preservedTitle'))}</strong><span class="pill blue">DSH</span></div><p>${esc(t('bindings.preservedBody'))}</p></div>
    </div>`;
  }

  function renderDiagnostics() {
    const data = state.diagnostics;
    if (!data) return state.loading ? loadingContent() : unavailableContent();
    const sections = data.sections ?? {};
    const configured = Array.isArray(sections.configured) ? sections.configured : [];
    const observations = Array.isArray(sections.assembled) ? sections.assembled : [];
    const selectedIndex = Math.min(Math.max(state.diagnosticIndex, 0), Math.max(0, observations.length - 1));
    const selected = observations[selectedIndex] ?? null;
    const probe = state.finalProbe?.sessionId === selected?.sessionId
      && state.finalProbe?.revision === state.revision ? state.finalProbe : null;
    const callbackCount = observations.filter(entry => entry.coreCallback || entry.sceneCallback).length;
    const finalVisibility = probe?.status ?? sections.finalVisibility ?? 'unverified';
    const visibilityTone = finalVisibility === 'visible' ? 'green' : finalVisibility === 'overridden' ? 'bad' : 'amber';
    const configuredRows = configured.length === 0
      ? `<div class="empty">${esc(t('diagnostics.emptyConfigured'))}</div>`
      : `<div class="table-wrap"><table class="test-table"><thead><tr><th>${esc(t('diagnostics.table.section'))}</th><th>${esc(t('diagnostics.table.order'))}</th><th>${esc(t('diagnostics.table.interpolate'))}</th><th>${esc(t('diagnostics.table.complete'))}</th><th>${esc(t('diagnostics.table.registered'))}</th></tr></thead><tbody>${configured.map(section => `<tr><td><span class="mono">${esc(section.name)}</span></td><td>${esc(section.order)}</td><td>${esc(section.interpolate === false ? t('common.no') : t('common.yes'))}</td><td>${esc(section.complete === true ? t('common.yes') : t('common.no'))}</td><td>${esc(section.registered === true ? t('common.yes') : t('common.no'))}</td></tr>`).join('')}</tbody></table></div>`;
    const observationRows = observations.length === 0
      ? `<div class="empty">${esc(t('diagnostics.emptyObservations'))}</div>`
      : `<div class="table-wrap"><table class="test-table"><thead><tr><th>${esc(t('diagnostics.table.observedAt'))}</th><th>${esc(t('diagnostics.table.session'))}</th><th>${esc(t('diagnostics.table.sourceMode'))}</th><th>${esc(t('diagnostics.table.coreCallback'))}</th><th>${esc(t('diagnostics.table.sceneCallback'))}</th><th>${esc(t('diagnostics.table.reason'))}</th></tr></thead><tbody>${observations.map((entry, index) => `<tr data-diagnostic-index="${index}" class="${selectedIndex === index ? 'selected-row' : ''}"><td>${esc(formatDate(entry.at))}</td><td><span class="mono">${esc(shortId(entry.sessionId ?? t('common.unknown'), 24))}</span><div class="fine muted">${esc(entry.agentPreset ?? t('diagnostics.noPreset'))}</div></td><td>${esc(technicalLabel('diagnostics.source', entry.source))}<div class="fine muted">${esc(technicalLabel('diagnostics.mode', entry.mode))}</div></td><td>${entry.coreCallback ? `<span class="pill green">${esc(t('diagnostics.invoked'))}</span>` : `<span class="pill">${esc(t('diagnostics.notObserved'))}</span>`}</td><td>${entry.sceneCallback ? `<span class="pill green">${esc(t('diagnostics.invoked'))}</span>` : `<span class="pill">${esc(t('diagnostics.notObserved'))}</span>`}</td><td>${esc(reasonLabel(entry.reason))}</td></tr>`).join('')}</tbody></table></div>`;
    const detail = selected === null ? '' : `
      <div class="card pad observation-detail">
        <div class="section-header compact"><h2>${esc(t('diagnostics.selectedObservation'))}</h2><span class="pill ${selected.coreCallback || selected.sceneCallback ? 'green' : 'amber'}">${esc(selected.coreCallback || selected.sceneCallback ? t('diagnostics.callbackObservedBadge') : t('diagnostics.noCallbackBadge'))}</span></div>
        <div class="definition-grid">
          <div><span>${esc(t('diagnostics.detail.observedAt'))}</span><strong>${esc(formatDate(selected.at))}</strong></div>
          <div><span>${esc(t('diagnostics.detail.session'))}</span><strong class="mono break">${esc(selected.sessionId ?? t('common.unknown'))}</strong></div>
          <div><span>${esc(t('diagnostics.detail.agentPreset'))}</span><strong>${esc(selected.agentPreset ?? t('common.dash'))}</strong></div>
          <div><span>${esc(t('diagnostics.detail.workspace'))}</span><strong class="mono break">${esc(selected.workspaceId ?? t('common.dash'))}</strong></div>
          <div><span>${esc(t('diagnostics.detail.qqMapping'))}</span><strong>${esc(technicalLabel('diagnostics.qqState', selected.qqState))}</strong></div>
          <div><span>${esc(t('diagnostics.detail.source'))}</span><strong>${esc(technicalLabel('diagnostics.source', selected.source))}</strong></div>
          <div><span>${esc(t('diagnostics.detail.bindingKey'))}</span><strong class="mono break">${esc(selected.bindingKey ?? t('common.dash'))}</strong></div>
          <div><span>${esc(t('diagnostics.detail.modeStyle'))}</span><strong>${esc(technicalLabel('diagnostics.mode', selected.mode))}${selected.styleId ? ` · ${esc(shortId(selected.styleId, 22))}` : ''}</strong></div>
          <div><span>${esc(t('diagnostics.detail.coreCallback'))}</span><strong>${esc(selected.coreCallback ? t('common.yes') : t('common.no'))}</strong></div>
          <div><span>${esc(t('diagnostics.detail.sceneCallback'))}</span><strong>${esc(selected.sceneCallback ? t('common.yes') : t('common.no'))}</strong></div>
          <div><span>${esc(t('diagnostics.detail.coreInjected'))}</span><strong>${esc(selected.coreInjected ? t('common.yes') : t('common.no'))}</strong></div>
          <div><span>${esc(t('diagnostics.detail.styleInjected'))}</span><strong>${esc(selected.styleInjected ? t('common.yes') : t('common.no'))}</strong></div>
          <div><span>${esc(t('diagnostics.detail.resolutionReason'))}</span><strong>${esc(reasonLabel(selected.reason))}</strong></div>
          <div><span>${esc(t('diagnostics.detail.stateRevision'))}</span><strong>${selected.revision === null || selected.revision === undefined ? esc(t('common.dash')) : `r${esc(selected.revision)}`}</strong></div>
        </div>
        <div class="info-note">${icon('eye')}<span>${esc(t('diagnostics.detailNote'))}</span></div>
        <button class="button sm" data-action="probe-final">${esc(t('diagnostics.probeButton'))}</button>
        ${probe ? `<div class="info-note"><span>${esc(t('diagnostics.finalCheck', {
          status: technicalLabel('diagnostics.status', probe.status),
          reason: reasonLabel(probe.reason),
          core: probe.coreVisible ? t('diagnostics.visible') : t('diagnostics.absent'),
          style: probe.sceneExpected ? (probe.sceneVisible ? t('diagnostics.visible') : t('diagnostics.absent')) : t('diagnostics.notExpected'),
        }))}</span></div>` : ''}
      </div>`;
    const capabilities = data.capabilities && typeof data.capabilities === 'object' ? Object.entries(data.capabilities) : [];
    const limitations = Array.isArray(data.limitations) ? data.limitations : [];
    return `
      <div class="stats">
        <div class="card stat"><div class="top">${esc(t('overview.workspace'))}<span class="stat-ico">${icon('folder')}</span></div><div class="number text-stat">${esc(boundWorkspace()?.title ?? t('common.notBound'))}</div><div class="hint">${esc(t('diagnostics.trustedSessions', { count: data.workspace?.sessionCount ?? 0 }))}</div></div>
        <div class="card stat"><div class="top">${esc(t('diagnostics.configuredSections'))}<span class="stat-ico purple">${icon('layers')}</span></div><div class="number">${esc(configured.length)}</div><div class="hint">${esc(t('diagnostics.hostGlobal'))}</div></div>
        <div class="card stat"><div class="top">${esc(t('diagnostics.callbackEvidence'))}<span class="stat-ico blue">${icon('activity')}</span></div><div class="number">${esc(callbackCount)}</div><div class="hint">${esc(t('diagnostics.ofObserved', { total: observations.length }))}</div></div>
        <div class="card stat"><div class="top">${esc(t('diagnostics.finalVisibility'))}<span class="stat-ico amber">${icon('eye')}</span></div><div class="number text-stat">${esc(technicalLabel('diagnostics.status', finalVisibility))}</div><div class="hint">${esc(probe ? t('diagnostics.explicitCheck') : t('diagnostics.noFinalCheck'))}</div></div>
      </div>
      <div class="section-header"><h2>${esc(t('diagnostics.visibilityModel'))}</h2><button class="button sm" data-action="refresh">${icon('refresh', 'sm')} ${esc(t('diagnostics.refresh'))}</button></div>
      <div class="diagnostic-layout">
        <div class="card pad">
          <div class="visibility-row"><span class="pill green">${esc(t('diagnostics.configuredBadge'))}</span><p>${t('diagnostics.configuredBody')}</p></div>
          <div class="visibility-row"><span class="pill ${callbackCount > 0 ? 'green' : 'amber'}">${esc(t('diagnostics.callbackBadge'))}</span><p>${esc(callbackCount > 0 ? tn('diagnostics.callbackObserved', callbackCount) : t('diagnostics.callbackNone'))} ${esc(t('diagnostics.callbackNote'))}</p></div>
          <div class="visibility-row"><span class="pill ${visibilityTone}">${esc(t('diagnostics.finalPromptBadge'))}</span><p><strong>${esc(probe ? t('diagnostics.hostCheck', { status: technicalLabel('diagnostics.status', probe.status) }) : t('diagnostics.unverifiedByHost'))}</strong> ${esc(t('diagnostics.finalPromptBody'))}</p></div>
        </div>
        <div class="card pad">
          <h3>${esc(t('diagnostics.configuredSections'))}</h3>
          ${configuredRows}
          <div class="hr"></div>
          <h3>${esc(t('diagnostics.stageNoteTitle'))}</h3>
          <p class="micro">${esc(stageNoteLabel(sections.note))}</p>
        </div>
      </div>
      <div class="section-header"><h2>${esc(t('diagnostics.observedAssemblies'))}</h2><span class="micro">${esc(t('diagnostics.selectRow'))}</span></div>
      <div class="card">${observationRows}</div>
      ${detail}
      <div class="overview-grid">
        <div class="card pad">
          <h3>${esc(t('diagnostics.capabilityTitle'))}</h3>
          <div class="definition-grid compact-grid">${capabilities.map(([key, value]) => `<div><span>${esc(capabilityLabel(key))}</span><strong>${esc(value === true ? t('common.yes') : t('common.no'))}</strong></div>`).join('') || `<div><span>${esc(t('diagnostics.noCapabilities'))}</span><strong>${esc(t('common.dash'))}</strong></div>`}</div>
          <p class="micro muted">${esc(t('diagnostics.capabilityNote'))}</p>
        </div>
        <div class="card pad">
          <h3>${esc(t('diagnostics.limitationsTitle'))}</h3>
          <ul class="limitation-list">${limitations.map(item => `<li>${esc(limitationLabel(item))}</li>`).join('') || `<li>${esc(t('diagnostics.noLimitations'))}</li>`}</ul>
          ${data.error ? `<div class="banner bad">${icon('alert')}<div><strong>${esc(t('diagnostics.errorTitle'))}</strong><p>${esc(technicalLabel('error.code', data.error))}</p></div></div>` : ''}
        </div>
      </div>
    `;
  }

  function renderSettings() {
    const overview = state.overview;
    if (!overview) return state.loading ? loadingContent() : unavailableContent();
    const workspaces = workspaceList();
    const currentWorkspace = boundWorkspace();
    const workspaceDraft = state.workspaceDraft ?? (state.workspaces?.boundWorkspaceId ?? '');
    const defaultDraft = state.defaultStyleDraft ?? (state.cards?.defaultStyleId ?? '');
    const styleCards = styles();
    const backups = Array.isArray(state.backups?.backups) ? state.backups.backups : [];
    const invalidBackups = Number.isSafeInteger(state.backups?.invalidCount) ? state.backups.invalidCount : 0;
    const backupError = state.backupsErrorCause ? errorMessage(state.backupsErrorCause) : state.backupsError;
    const backupRows = state.backupsLoading
      ? `<div class="empty">${esc(t('settings.loadingBackups'))}</div>`
      : backupError
        ? `<div class="banner bad">${icon('alert')}<div><strong>${esc(t('settings.backupUnavailable'))}</strong><p>${esc(backupError)}</p></div></div>`
        : backups.length === 0
          ? `<div class="empty">${esc(t('settings.noBackups'))}</div>`
          : `<div class="table-wrap"><table class="test-table"><thead><tr><th>${esc(t('settings.table.backup'))}</th><th>${esc(t('settings.table.capturedRevision'))}</th><th>${esc(t('settings.table.reason'))}</th><th>${esc(t('settings.table.size'))}</th><th></th></tr></thead><tbody>${backups.map(backup => `<tr>
              <td><span class="mono break">${esc(backup.id)}</span><div class="fine muted">${esc(formatDate(backup.createdAt))}</div></td>
              <td>r${esc(backup.revision)}</td>
              <td>${esc(backup.reason || t('common.manual'))}</td>
              <td>${esc(backup.bytes)} B</td>
              <td><button type="button" class="button sm" data-action="restore-backup" data-backup-id="${esc(backup.id)}" ${state.accessDenied ? 'disabled' : ''}>${icon('database', 'sm')} ${esc(t('settings.restore'))}</button></td>
            </tr>`).join('')}</tbody></table></div>${invalidBackups > 0 ? `<p class="fine warn-text">${esc(tn('settings.invalidBackups', invalidBackups))}</p>` : ''}`;
    const currentValue = currentWorkspace
      ? `${currentWorkspace.title} (${currentWorkspace.id})`
      : t('settings.none');
    return `
      <div class="setting-list">
        <div class="card setting-card">
          <div class="card-heading">${icon('folder', 'lg')}<h2>${esc(t('settings.boundWorkspace'))}</h2></div>
          <p>${esc(t('settings.boundWorkspaceBody'))}</p>
          <div class="field">
            <label for="workspace-select">${esc(t('settings.workspaceLabel'))}</label>
            <select id="workspace-select" class="select-control w260" ${state.pending !== '' || state.accessDenied || workspaces.length === 0 ? 'disabled' : ''}>
              <option value="" ${workspaceDraft === '' ? 'selected' : ''}>${esc(t('settings.noWorkspaceOption'))}</option>
              ${workspaces.map(workspace => `<option value="${esc(workspace.id)}" ${workspaceDraft === workspace.id ? 'selected' : ''}>${esc(tn('settings.workspaceOption', Number(workspace.sessionCount ?? workspace.sessions?.length ?? 0), { title: workspace.title }))}</option>`).join('')}
            </select>
            <small>${esc(t('settings.current', { value: currentValue }))}${workspaces.length === 0 ? esc(t('settings.registryUnavailable')) : ''}.</small>
          </div>
          <div class="form-actions"><span class="save-hint">${esc(t('settings.applyWorkspaceHint'))}</span><button type="button" class="button primary" data-action="save-workspace" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>${esc(t('settings.applyWorkspace'))}</button></div>
        </div>
        <div class="card setting-card">
          <div class="card-heading">${icon('layers', 'lg')}<h2>${esc(t('settings.defaultsInjection'))}</h2></div>
          <p>${esc(t('settings.defaultsBody'))}</p>
          <div class="field">
            <label for="default-style-select">${esc(t('settings.defaultStyleLabel'))}</label>
            <select id="default-style-select" class="select-control w260" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>
              <option value="" ${defaultDraft === '' ? 'selected' : ''}>${esc(t('settings.coreOnlyOption'))}</option>
              ${styleCards.map(style => `<option value="${esc(style.id)}" ${defaultDraft === style.id ? 'selected' : ''}>${esc(style.name)} · r${esc(style.revision)}</option>`).join('')}
            </select>
            <small>${esc(t('settings.defaultStyleHint'))}</small>
          </div>
          <div class="form-actions"><span class="save-hint">${esc(t('settings.applyDefaultHint'))}</span><button type="button" class="button primary" data-action="save-default-style" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>${esc(t('settings.applyDefault'))}</button></div>
          <div class="settings-row">
            <div><div class="name">${esc(t('settings.enableInjection'))}</div><div class="help">${esc(t('settings.enableInjectionHelp'))}</div></div>
            <label class="switch"><input id="injection-toggle" type="checkbox" ${overview.injectionEnabled === true ? 'checked' : ''} ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}><span class="track"></span></label>
          </div>
          <p class="micro muted">${esc(t('settings.timing'))}</p>
        </div>
        <div class="card setting-card">
          <div class="card-heading">${icon('database', 'lg')}<h2>${esc(t('settings.backups'))}</h2><span class="grow"></span><button type="button" class="button sm" data-action="refresh-backups" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>${icon('refresh', 'sm')} ${esc(t('overview.refresh'))}</button></div>
          <p>${esc(t('settings.backupsBody'))}</p>
          <div class="field">
            <label for="backup-reason">${esc(t('settings.backupReason'))}</label>
            <input id="backup-reason" maxlength="80" value="${esc(state.backupReason)}" autocomplete="off" placeholder="${esc(t('settings.backupReasonPlaceholder'))}">
          </div>
          <div class="form-actions"><span class="save-hint">${esc(t('settings.backupHint'))}</span><button type="button" class="button primary" data-action="create-backup" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>${icon('plus', 'sm')} ${esc(t('settings.createBackup'))}</button></div>
          <div class="hr"></div>
          <h3>${esc(t('settings.availableBackups'))}</h3>
          ${backupRows}
        </div>
        <div class="card setting-card">
          <div class="card-heading">${icon('shield', 'lg')}<h2>${esc(t('settings.security'))}</h2></div>
          <ul class="limitation-list">
            <li>${esc(t('settings.securityItem.auth'))}</li>
            <li>${esc(t('settings.securityItem.storage'))}</li>
            <li>${esc(t('settings.securityItem.visibility'))}</li>
            <li>${esc(t('settings.securityItem.tokens'))}</li>
            <li>${esc(t('settings.securityItem.qq'))}</li>
          </ul>
        </div>
      </div>
    `;
  }

  function render() {
    applyTheme(state.theme);
    const app = document.getElementById('app');
    if (!app) return;
    app.classList?.remove('boot-app');
    document.documentElement.lang = state.language === 'zh-CN' ? 'zh-CN' : 'en-US';
    let content;
    if (state.loading && state.overview === null) content = loadingContent();
    else if (state.overview === null) content = unavailableContent();
    else if (state.page === 'library') content = renderLibrary();
    else if (state.page === 'bindings') content = renderBindings();
    else if (state.page === 'diagnostics') content = renderDiagnostics();
    else if (state.page === 'settings') content = renderSettings();
    else content = renderOverview();
    app.innerHTML = layout(content);
    document.title = t('page.documentTitle', { page: pageTitle() });
  }

  function validateEditor() {
    const editor = state.editor;
    if (!editor) return t('validate.noCard');
    const limits = state.cards?.limits ?? {};
    if (editor.type === 'style') {
      if (editor.name.trim().length === 0) return t('validate.styleNameRequired');
      if (charCount(editor.name) > (limits.styleNameMaxChars ?? 80)) return t('validate.styleNameTooLong');
      if (charCount(editor.description) > (limits.styleDescriptionMaxChars ?? 500)) return t('validate.styleDescriptionTooLong');
      if (editor.body.trim().length === 0) return t('validate.styleBodyRequired');
      if (charCount(editor.body) > (limits.styleBodyMaxChars ?? 12000)) return t('validate.styleBodyTooLong');
      if (!/^#[0-9a-f]{6}$/i.test(editor.color)) return t('validate.color');
    } else if (charCount(editor.body) > (limits.coreMaxChars ?? 20000)) {
      return t('validate.coreBodyTooLong');
    }
    return '';
  }

  function saveEditor() {
    const editor = state.editor;
    const problem = validateEditor();
    if (problem) {
      notify(t('toast.cannotSave'), problem);
      return;
    }
    if (!editor || state.pending) return;
    const expectedRevision = state.revision;
    const payload = editor.type === 'core'
      ? { expectedRevision, body: editor.body }
      : {
        expectedRevision,
        name: editor.name.trim(),
        description: editor.description.trim(),
        body: editor.body,
        color: editor.color,
      };
    const path = editor.type === 'core'
      ? '/cards/core'
      : editor.id === null
        ? '/cards/styles'
        : `/cards/styles/${encodeURIComponent(editor.id)}`;
    const savedType = editor.type;
    const savedId = editor.id;
    runWrite('editor', () => write(path, payload), async result => {
      await loadData({ renderNow: false, keepEditor: true, syncSettingDrafts: true });
      if (savedType === 'core') {
        state.editor = editorFromCore(coreView());
      } else {
        const id = result?.style?.id ?? savedId;
        const saved = id === null ? null : styleById(id);
        state.editor = saved === null ? emptyStyleEditor() : editorFromStyle(saved);
      }
      state.editorDirty = false;
      state.conflict = null;
      notify(t('toast.personaSaved'), t('toast.personaSavedDetail'));
    });
  }

  function discardEditor() {
    if (!state.editorDirty || !state.editor) return;
    if (!window.confirm(t('toast.discardEditorConfirm'))) return;
    if (state.editor.type === 'core') state.editor = editorFromCore(coreView());
    else if (state.editor.id === null) state.editor = emptyStyleEditor();
    else {
      const style = styleById(state.editor.id);
      state.editor = style === null ? editorFromCore(coreView()) : editorFromStyle(style);
    }
    state.editorDirty = false;
    render();
    notify(t('toast.draftDiscarded'), t('toast.draftDiscardedDetail'));
  }

  function copyStyle() {
    const editor = state.editor;
    if (!editor || editor.type !== 'style' || editor.id === null) return;
    const source = styleById(editor.id);
    if (!source) return;
    if (state.editorDirty && !window.confirm(t('toast.copySavedOnly'))) return;
    runWrite('copy', () => write(`/cards/styles/${encodeURIComponent(editor.id)}/copy`, { expectedRevision: state.revision }), async result => {
      await loadData({ renderNow: false, keepEditor: true, syncSettingDrafts: true });
      state.editor = editorFromStyle(styleById(result?.style?.id) ?? result?.style);
      state.editorDirty = false;
      state.conflict = null;
      notify(t('toast.styleCopied'), t('toast.styleCopiedDetail'));
    });
  }

  function deleteStyle() {
    const editor = state.editor;
    if (!editor || editor.type !== 'style' || editor.id === null) return;
    const id = editor.id;
    if (state.editorDirty && !window.confirm(t('toast.deleteSavedOnly'))) return;
    closeModal();
    runWrite('delete', () => write(`/cards/styles/${encodeURIComponent(id)}/delete`, { expectedRevision: state.revision }), async result => {
      await loadData({ renderNow: false, keepEditor: false, syncSettingDrafts: true });
      state.editorDirty = false;
      state.editor = editorFromCore(coreView());
      state.conflict = null;
      const affected = Number.isSafeInteger(result?.affectedCount) ? result.affectedCount : 0;
      notify(t('toast.styleDeleted'), tn('toast.styleDeletedDetail', affected, {
        defaultReset: result?.defaultStyleReset ? t('toast.defaultResetSuffix') : '',
      }));
    });
  }

  function rollback(historyId) {
    const editor = state.editor;
    if (!editor || editor.isNew) return;
    const cardType = editor.type === 'core' ? 'core' : 'style';
    const cardId = editor.type === 'style' ? editor.id : null;
    if (!window.confirm(t('toast.rollbackConfirm'))) return;
    closeModal();
    const payload = {
      expectedRevision: state.revision,
      cardType,
      historyId,
      ...(cardId === null ? {} : { cardId }),
    };
    runWrite('rollback', () => write('/history/rollback', payload), async () => {
      await loadData({ renderNow: false, keepEditor: false, syncSettingDrafts: true });
      if (cardType === 'core') state.editor = editorFromCore(coreView());
      else state.editor = editorFromStyle(styleById(cardId) ?? undefined);
      state.editorDirty = false;
      state.conflict = null;
      notify(t('toast.rollbackCommitted'), t('toast.rollbackCommittedDetail'));
    });
  }

  function selectTarget(key) {
    const target = findTarget(key);
    if (!target) {
      notify(t('toast.targetUnavailable'), t('toast.targetUnavailableDetail'));
      return;
    }
    if (state.bindingDraftDirty && state.target?.key !== key
      && !window.confirm(t('toast.discardBindingConfirm'))) return;
    const existing = bindingByKey(key);
    state.target = target;
    state.bindingDraft = draftFromBinding(existing);
    state.bindingDraftDirty = false;
    state.page = 'bindings';
    if (window.location.hash !== '#bindings') window.history.replaceState(null, '', '#bindings');
    render();
  }

  function saveBinding() {
    const target = state.target;
    const draft = state.bindingDraft;
    if (!target || !draft) return;
    if (target.subagent) {
      notify(t('toast.cannotSaveBinding'), t('toast.subagentExcluded'));
      return;
    }
    if (boundWorkspaceId() === null) {
      notify(t('toast.noWorkspace'), t('toast.bindWorkspaceFirst'));
      return;
    }
    if (draft.mode === 'style') {
      if (draft.styleId === null || styleById(draft.styleId) === null) {
        notify(t('toast.selectStyle'), t('toast.selectStyleDetail'));
        return;
      }
    }
    const payload = {
      expectedRevision: state.revision,
      kind: target.kind,
      mode: draft.mode,
      ...(target.kind === 'session'
        ? { sessionId: target.sessionId }
        : target.scene
          ? { scene: { kind: target.scene.kind, botId: target.scene.botId, peerId: target.scene.peerId } }
          : { sessionId: target.sessionId }),
      ...(draft.mode === 'style' ? { styleId: draft.styleId } : {}),
    };
    runWrite('binding', () => write('/bindings', payload), async () => {
      await loadData({ renderNow: false, keepEditor: state.editorDirty, keepBindingDraft: false, syncSettingDrafts: true });
      const refreshedTarget = state.target === null ? null : findTarget(state.target.key);
      state.target = refreshedTarget ?? state.target;
      state.bindingDraft = draftFromBinding(state.target ? bindingByKey(state.target.key) : null);
      state.bindingDraftDirty = false;
      state.conflict = null;
      notify(t('toast.bindingSaved'), t('toast.bindingSavedDetail'));
    });
  }

  function deleteBinding() {
    const target = state.target;
    if (!target) return;
    closeModal();
    runWrite('delete-binding', () => write('/bindings/delete', {
      expectedRevision: state.revision,
      key: target.key,
    }), async () => {
      await loadData({ renderNow: false, keepEditor: state.editorDirty, keepBindingDraft: false, syncSettingDrafts: true });
      state.target = findTarget(target.key) ?? target;
      state.bindingDraft = draftFromBinding(null);
      state.bindingDraftDirty = false;
      state.conflict = null;
      notify(t('toast.bindingRemoved'), t('toast.bindingRemovedDetail'));
    });
  }

  function resetBinding() {
    if (!state.target) return;
    state.bindingDraft = { mode: 'inherit', styleId: null };
    state.bindingDraftDirty = true;
    render();
    notify(t('toast.resetDraft'), t('toast.resetDraftDetail'));
  }

  function saveWorkspace() {
    const value = state.workspaceDraft === '' || state.workspaceDraft === null ? null : state.workspaceDraft;
    if (value !== null && !workspaceList().some(workspace => workspace.id === value)) {
      notify(t('toast.workspaceUnavailable'), t('toast.workspaceUnavailableDetail'));
      return;
    }
    if (value === boundWorkspaceId()) {
      notify(t('toast.noChange'), t('toast.noChangeDetail'));
      return;
    }
    const label = value === null
      ? t('settings.noWorkspaceLabel')
      : (workspaceList().find(workspace => workspace.id === value)?.title ?? value);
    const count = Number(state.overview?.counts?.bindings ?? 0);
    if (!window.confirm(t('toast.bindWorkspaceConfirm', { workspace: label, count }))) return;
    runWrite('workspace', () => write('/workspace', { expectedRevision: state.revision, workspaceId: value }), async result => {
      await loadData({ renderNow: false, keepEditor: state.editorDirty, syncSettingDrafts: true });
      state.workspaceDraft = result?.workspaceId ?? '';
      state.conflict = null;
      notify(t('toast.workspaceUpdated'), t('toast.workspaceUpdatedDetail', {
        count: result?.archivedBindingCount ?? 0,
        backup: result?.backupId ?? t('common.dash'),
      }));
    });
  }

  function saveDefaultStyle() {
    const value = state.defaultStyleDraft === '' || state.defaultStyleDraft === null ? null : state.defaultStyleDraft;
    if (value !== null && styleById(value) === null) {
      notify(t('toast.styleUnavailable'), t('toast.styleUnavailableDetail'));
      return;
    }
    runWrite('default-style', () => write('/default-style', { expectedRevision: state.revision, styleId: value }), async result => {
      await loadData({ renderNow: false, keepEditor: state.editorDirty, syncSettingDrafts: true });
      state.defaultStyleDraft = result?.defaultStyleId ?? '';
      state.conflict = null;
      notify(t('toast.defaultStyleUpdated'), t('toast.defaultStyleUpdatedDetail'));
    });
  }

  function setInjection(enabled) {
    if (state.pending) return;
    runWrite('injection', () => write('/settings', { expectedRevision: state.revision, injectionEnabled: enabled }), async () => {
      await loadData({ renderNow: false, keepEditor: state.editorDirty, syncSettingDrafts: true });
      state.conflict = null;
      notify(enabled ? t('toast.injectionEnabled') : t('toast.injectionDisabled'), t('toast.injectionDetail'));
    });
  }

  function createBackup() {
    if (state.pending) return;
    const reason = state.backupReason.trim().slice(0, 80) || t('common.manual');
    runWrite('backup', () => write('/backup', { expectedRevision: state.revision, reason }), async result => {
      state.backupReason = '';
      await loadBackups({ renderNow: false });
      notify(t('toast.backupCreated'), result?.id
        ? t('toast.backupCreatedDetail', { id: result.id, revision: result.revision })
        : t('toast.backupCreatedFallback'));
    });
  }

  function restoreBackup(backupId) {
    const input = document.getElementById('restore-confirm');
    if (!input || input.value !== 'RESTORE') {
      notify(t('toast.confirmationRequired'), t('toast.confirmationRequiredDetail'));
      return;
    }
    closeModal();
    runWrite('restore', () => write('/restore', {
      expectedRevision: state.revision,
      backupId,
      confirm: 'RESTORE',
    }), async () => {
      await loadData({ renderNow: false, keepEditor: false, syncSettingDrafts: true });
      await loadBackups({ renderNow: false });
      state.editorDirty = false;
      state.editor = editorFromCore(coreView());
      state.conflict = null;
      notify(t('toast.backupRestored'), t('toast.backupRestoredDetail'));
    });
  }

  function handleAction(action, element) {
    if (state.pending && !['conflict-reload', 'conflict-reload-keep', 'conflict-dismiss', 'close-modal', 'theme'].includes(action)) {
      return;
    }
    switch (action) {
      case 'theme':
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        saveTheme(state.theme);
        applyTheme(state.theme);
        render();
        break;
      case 'refresh':
        void loadData({
          keepEditor: state.editorDirty,
          keepBindingDraft: state.bindingDraftDirty,
          syncSettingDrafts: true,
        }).then(() => {
          if (state.page === 'settings') void loadBackups();
          notify(t('toast.hostRefreshed'), state.editorDirty || state.bindingDraftDirty ? t('toast.draftKept') : '');
        });
        break;
      case 'probe-final': {
        const selected = state.diagnostics?.sections?.assembled?.[state.diagnosticIndex];
        if (!selected?.sessionId) return;
        void request('/diagnostics/final?sessionId=' + encodeURIComponent(selected.sessionId))
          .then(result => { state.finalProbe = { ...result, sessionId: selected.sessionId, revision: state.revision }; render(); })
          .catch(error => { notify(t('toast.finalCheckUnavailable'), errorMessage(error)); });
        break;
      }
      case 'dismiss-error':
        state.error = '';
        state.errorCause = null;
        render();
        break;
      case 'new-style':
        newStyle();
        break;
      case 'save-editor':
        saveEditor();
        break;
      case 'discard-editor':
        discardEditor();
        break;
      case 'open-history':
      case 'core-history':
        openHistory();
        break;
      case 'copy-style':
        copyStyle();
        break;
      case 'delete-style':
        openDeleteStyle();
        break;
      case 'confirm-delete-style':
        deleteStyle();
        break;
      case 'rollback':
        rollback(element?.dataset.historyId ?? '');
        break;
      case 'save-binding':
        saveBinding();
        break;
      case 'reset-binding':
        resetBinding();
        break;
      case 'delete-binding':
        openDeleteBinding();
        break;
      case 'confirm-delete-binding':
        deleteBinding();
        break;
      case 'open-binding': {
        const key = element?.dataset.bindingKey;
        if (!key) break;
        if (navigate('bindings')) selectTarget(key);
        break;
      }
      case 'save-workspace':
        saveWorkspace();
        break;
      case 'save-default-style':
        saveDefaultStyle();
        break;
      case 'refresh-backups':
        void loadBackups();
        break;
      case 'create-backup':
        createBackup();
        break;
      case 'restore-backup':
        openRestore(element?.dataset.backupId ?? '');
        break;
      case 'confirm-restore':
        restoreBackup(element?.dataset.backupId ?? '');
        break;
      case 'conflict-reload-keep':
        state.conflict = null;
        void loadData({
          keepEditor: true,
          keepBindingDraft: true,
          syncSettingDrafts: false,
        }).then(() => {
          notify(t('toast.latestLoaded'), t('toast.draftKeptReview'));
        });
        break;
      case 'conflict-reload':
        state.conflict = null;
        state.editorDirty = false;
        state.bindingDraftDirty = false;
        if (state.editor && state.editor.type === 'style' && state.editor.id !== null) {
          state.editor = styleById(state.editor.id) === null ? editorFromCore(coreView()) : editorFromStyle(styleById(state.editor.id));
        }
        void loadData({ keepEditor: false, keepBindingDraft: false, syncSettingDrafts: true }).then(() => {
          notify(t('toast.latestLoaded'), t('toast.conflictDraftsDiscarded'));
        });
        break;
      case 'conflict-dismiss':
        state.conflict = null;
        render();
        break;
      case 'close-modal':
        closeModal();
        break;
      default:
        break;
    }
  }

  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-nav]');
    if (nav) {
      navigate(nav.dataset.nav);
      return;
    }
    const target = event.target.closest('[data-target-key]');
    if (target) {
      selectTarget(target.dataset.targetKey);
      return;
    }
    const card = event.target.closest('[data-select-card]');
    if (card) {
      selectCard(card.dataset.selectCard, card.dataset.cardId ?? null);
      return;
    }
    const filter = event.target.closest('[data-filter]');
    if (filter) {
      state.sceneFilter = filter.dataset.filter;
      render();
      return;
    }
    const diagnostic = event.target.closest('[data-diagnostic-index]');
    if (diagnostic) {
      state.diagnosticIndex = Number(diagnostic.dataset.diagnosticIndex) || 0;
      render();
      return;
    }
    const color = event.target.closest('[data-color]');
    if (color && state.editor) {
      state.editor.color = color.dataset.color;
      state.editorDirty = true;
      render();
      return;
    }
    const action = event.target.closest('[data-action]');
    if (action) {
      handleAction(action.dataset.action, action);
    }
  });

  document.addEventListener('input', event => {
    const element = event.target;
    if (element.id === 'scene-query') {
      state.sceneQuery = element.value;
      const list = document.getElementById('scene-list');
      if (list) list.innerHTML = renderTargetList();
      return;
    }
    if (element.id === 'backup-reason') {
      state.backupReason = element.value;
      return;
    }
    if (element.id === 'editor-color' && state.editor) {
      state.editor.color = element.value;
      state.editorDirty = true;
      updateColorSelection();
      updateEditorMetrics();
      return;
    }
    const field = element.dataset?.edit;
    if (field && state.editor) {
      state.editor[field] = element.value;
      state.editorDirty = true;
      updateEditorMetrics();
    }
  });

  document.addEventListener('change', event => {
    const element = event.target;
    if (element.id === 'language-select') {
      if (!LANGUAGES.includes(element.value)) return;
      state.language = element.value;
      saveLanguage(state.language);
      render();
      return;
    }
    if (element.id === 'workspace-select') {
      state.workspaceDraft = element.value;
      render();
      return;
    }
    if (element.id === 'default-style-select') {
      state.defaultStyleDraft = element.value;
      return;
    }
    if (element.id === 'binding-mode') {
      state.bindingDraft = {
        mode: element.value,
        styleId: element.value === 'style'
          ? (state.bindingDraft?.styleId ?? styles()[0]?.id ?? null)
          : null,
      };
      state.bindingDraftDirty = true;
      render();
      return;
    }
    if (element.id === 'binding-style') {
      state.bindingDraft = { ...(state.bindingDraft ?? { mode: 'style' }), styleId: element.value || null };
      state.bindingDraftDirty = true;
      render();
      return;
    }
    if (element.id === 'injection-toggle') {
      setInjection(element.checked === true);
    }
  });

  window.addEventListener('hashchange', () => {
    const page = pageFromHash();
    if (page !== state.page) {
      state.page = page;
      render();
      if (page === 'settings' && state.backups === null && !state.backupsLoading) void loadBackups();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
  });

  document.getElementById('modal')?.addEventListener('click', event => {
    if (event.target.id === 'modal') closeModal();
  });

  applyTheme(state.theme);
  render();
  void loadData({ syncSettingDrafts: true }).then(() => {
    if (state.page === 'settings') void loadBackups();
  });
})();
