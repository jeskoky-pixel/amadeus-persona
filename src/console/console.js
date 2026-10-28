(() => {
  'use strict';

  const API = '/api/amadeus-persona';
  const THEME_KEY = 'amadeus.persona.theme';
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

  const PAGE_TITLES = {
    overview: 'Overview',
    library: 'Persona Library',
    bindings: 'Scene Bindings',
    diagnostics: 'Injection Diagnostics',
    settings: 'Settings',
  };

  const PAGE_SUBTITLES = {
    overview: 'A single core identity and scene-specific expression, driven by real Host data.',
    library: 'Maintain one core persona and any number of reusable style cards.',
    bindings: 'Choose an explicit mode for trusted Workspace Sessions and verified QQ Scenes.',
    diagnostics: 'Configuration and callback evidence are shown separately from final prompt visibility.',
    settings: 'Bind one Workspace, choose defaults, control injection, and manage backups.',
  };

  const REASON_LABELS = {
    ok: 'Resolved normally',
    no_session: 'No live Session',
    subagent: 'Subagent Session excluded',
    storage_unavailable: 'Storage unavailable',
    injection_disabled: 'Injection disabled',
    workspace_unbound: 'Workspace not bound',
    workspace_missing: 'Bound Workspace no longer exists',
    not_workspace_member: 'Session is not a Workspace member',
    session_invalid: 'Session identity invalid',
    qq_mapping_untrusted: 'QQ Scene mapping unavailable or untrusted',
    binding_disabled: 'Explicitly disabled for this target',
    core_empty: 'Core persona is empty',
    style_missing: 'Selected style no longer exists',
  };

  const STATUS_REASON_LABELS = {
    workspace_member: 'Current Workspace member',
    verified_qq_scene: 'Verified QQ Scene mapping',
    style_missing: 'Selected style no longer exists',
    workspace_unbound: 'No Workspace is bound',
    workspace_missing: 'Bound Workspace no longer exists',
    not_workspace_member: 'Session left the Workspace',
    qq_unavailable: 'QQ Host mapping is unavailable',
    qq_mapping_invalid: 'QQ mapping is no longer trusted',
    qq_scene_unmapped: 'QQ Scene is not mapped to a current Session',
  };

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
    if (typeof value !== 'string') return '—';
    const time = Date.parse(value);
    return Number.isFinite(time) ? new Date(time).toLocaleString() : esc(value);
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
    return status === 'ok' ? 'Storage OK' : status === 'invalid' ? 'Storage invalid' : 'Storage unavailable';
  }

  const state = {
    page: pageFromHash(),
    theme: readTheme(),
    loading: true,
    error: '',
    accessDenied: false,
    overview: null,
    workspaces: null,
    cards: null,
    bindings: null,
    diagnostics: null,
    backups: null,
    backupsLoading: false,
    backupsError: '',
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
    if (state.cards?.defaultStyleId == null) return 'Core only';
    return styleById(state.cards.defaultStyleId)?.name ?? 'Missing style';
  }

  function modeLabel(binding) {
    if (!binding) return 'No explicit binding';
    if (binding.mode === 'inherit') return `Inherit default · ${defaultStyleName()}`;
    if (binding.mode === 'core-only') return 'Core only';
    if (binding.mode === 'style') return `Style · ${binding.styleName ?? 'missing'}`;
    if (binding.mode === 'disabled') return 'Injection disabled';
    return esc(binding.mode);
  }

  function statusTone(status) {
    return status?.valid === true ? 'green' : 'amber';
  }

  function statusLabel(status) {
    if (!status) return 'Unknown';
    return status.valid === true ? 'Trusted' : 'Not trusted';
  }

  function statusReason(status) {
    if (!status) return '';
    return STATUS_REASON_LABELS[status.reason] ?? String(status.reason ?? '');
  }

  function reasonLabel(reason) {
    return REASON_LABELS[reason] ?? String(reason ?? 'Unknown');
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

  function errorMessage(error) {
    const status = Number(error?.status);
    if (status === 401 || status === 403) {
      return 'Owner authentication was not accepted. Open this console from an authenticated DSH settings page.';
    }
    if (status === 503) {
      return 'Persona management is unavailable. Check the DSH Connection service and storage health.';
    }
    if (status === 409) {
      return 'Another authenticated window changed Persona. Reload the latest revision before retrying.';
    }
    if (status === 404) return error?.message || 'The requested Persona item was not found.';
    if (error?.network === true) return 'The console could not reach the DSH Host API.';
    return error?.message || 'The Persona request failed.';
  }

  function handleFailure(error, scope) {
    if (Number(error?.status) === 409) {
      state.conflict = {
        scope,
        currentRevision: error.currentRevision,
        message: errorMessage(error),
        at: new Date().toISOString(),
      };
      return;
    }
    if (Number(error?.status) === 401 || Number(error?.status) === 403) {
      state.accessDenied = true;
    }
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
      name: 'Core persona',
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
        subtitle: session.agentPreset ? `Workspace session · preset ${session.agentPreset}` : 'Workspace session',
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
        title: `${scene.kind === 'private' ? 'Private' : 'Group'} · ${scene.peerId}`,
        subtitle: `QQ Scene · bot ${scene.botId}${scene.sessionId ? ` · session ${shortId(scene.sessionId, 18)}` : ''}`,
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
          subtitle: 'Stored binding · target is no longer listed by the Host',
          subagent: false,
          stale: true,
        });
      } else {
        result.push({
          key: binding.key,
          kind: 'qq',
          scene: binding.scene,
          title: `${binding.scene?.kind === 'private' ? 'Private' : 'Group'} · ${binding.scene?.peerId ?? 'unknown'}`,
          subtitle: 'Stored binding · target is no longer listed by the Host',
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
    if (label) label.textContent = state.editorDirty ? 'Unsaved changes' : 'Saved · next model assembly';
    if (!editor) return;
    const limits = state.cards?.limits ?? {};
    const max = editor.type === 'core' ? (limits.coreMaxChars ?? 0) : (limits.styleBodyMaxChars ?? 0);
    const warn = editor.type === 'core' ? (limits.coreWarnTokens ?? 0) : (limits.styleWarnTokens ?? 0);
    const count = charCount(editor.body);
    const tokens = estimateTokens(editor.body);
    const charNode = document.getElementById('editor-char-count');
    const tokenNode = document.getElementById('editor-token-estimate');
    const warningNode = document.getElementById('editor-token-warning');
    if (charNode) charNode.textContent = `${count} / ${max} characters`;
    if (tokenNode) tokenNode.textContent = `~${tokens} estimated tokens · warning at ${warn || '—'}`;
    state.editorTokenWarning = warn > 0 && tokens > warn;
    if (warningNode) {
      warningNode.hidden = !state.editorTokenWarning;
      warningNode.textContent = state.editorTokenWarning
        ? `Token estimate is above the ${warn}-token warning threshold. This is a heuristic, not tokenizer-exact.`
        : '';
    }
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
    if (renderNow && state.page === 'settings') render();
    try {
      state.backups = await request('/backups');
    } catch (error) {
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
      if (!window.confirm('The persona editor has unsaved changes. Leave and keep the draft in this tab?')) return false;
    }
    if (state.page === 'bindings' && state.bindingDraftDirty && state.target !== null) {
      if (!window.confirm('The binding has unsaved changes. Leave and keep the draft in this tab?')) return false;
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
        <button type="button" class="button ghost sm" data-action="close-modal" aria-label="Close">${icon('close', 'sm')}</button>
      </div>
      <p>${body}</p>
      ${extra}
      <div class="modal-actions">
        <button type="button" class="button" data-action="close-modal">Cancel</button>
        <button type="button" class="button ${danger ? 'danger' : 'primary'}" data-action="${esc(confirmAction)}">${esc(confirmLabel)}</button>
      </div>
    `);
  }

  function selectCard(type, id = null) {
    if (state.editorDirty) {
      const current = state.editor;
      const same = current && current.type === type && (type === 'core' || current.id === id);
      if (!same && !window.confirm('Discard the unsaved persona draft?')) return;
    }
    if (type === 'core') {
      state.editor = editorFromCore(coreView());
    } else {
      const style = styleById(id);
      if (style === null) {
        notify('Style not found', 'Reload the library and try again.');
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
    if (state.editorDirty && !window.confirm('Discard the current unsaved persona draft and create a new style?')) return;
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
        ? '<div class="empty">No prior versions are stored for this card yet.</div>'
        : `<div class="stack">${entries.map(entry => `
            <div class="detail-row">
              <div class="label">
                <strong>${esc(entry.action)} · r${esc(entry.revision)}</strong>
                <small>${esc(formatDate(entry.at))} · card revision ${esc(entry.cardRevision)}</small>
                <small class="body-preview">${plain(entry.snapshot?.body ?? '', 130)}</small>
              </div>
              <button type="button" class="button sm" data-action="rollback" data-history-id="${esc(entry.historyId)}">${icon('history', 'sm')} Roll back</button>
            </div>
          `).join('')}</div>`;
      showModal(`
        <div class="modal-head">
          <h2 id="modal-title">Version history</h2>
          <button type="button" class="button ghost sm" data-action="close-modal" aria-label="Close">${icon('close', 'sm')}</button>
        </div>
        <p>Rolling back creates a new revision. The current version is retained in history, so the action is reversible.</p>
        ${rows}
        <div class="modal-actions"><button type="button" class="button" data-action="close-modal">Close</button></div>
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
    confirmDialog({
      title: `Delete “${style.name}”?`,
      body: `This permanently removes the style card. ${affected.length === 0 ? 'No explicit style binding currently references it.' : `${affected.length} explicit binding${affected.length === 1 ? '' : 's'} will fall back to inherit.`}${isDefault ? ' It is also the Workspace default, so the default resets to core-only.' : ''} Existing Sessions, Agent presets, tools, and permissions are not changed.`,
      confirmLabel: 'Delete style',
      confirmAction: 'confirm-delete-style',
      danger: true,
    });
  }

  function openDeleteBinding() {
    if (!state.target) return;
    const existing = bindingByKey(state.target.key);
    if (!existing) return;
    confirmDialog({
      title: 'Remove this explicit binding?',
      body: `The target will fall back to the Workspace default (${esc(defaultStyleName())}) instead of its explicit “${esc(existing.mode)}” setting. Sessions, QQ authentication, tools, and permissions are untouched.`,
      confirmLabel: 'Remove binding',
      confirmAction: 'confirm-delete-binding',
      danger: true,
    });
  }

  function openRestore(backupId) {
    const backup = Array.isArray(state.backups?.backups)
      ? state.backups.backups.find(entry => entry.id === backupId)
      : null;
    if (!backup) {
      notify('Backup not found', 'Refresh the backup list and try again.');
      return;
    }
    showModal(`
      <div class="modal-head">
        <h2 id="modal-title">Restore backup</h2>
        <button type="button" class="button ghost sm" data-action="close-modal" aria-label="Close">${icon('close', 'sm')}</button>
      </div>
      <p>Restore the configuration captured at revision ${esc(backup.revision)} (${esc(formatDate(backup.createdAt))})? Current configuration is replaced, but a pre-restore safety backup is written first. No DSH Session, Agent preset, tool, or permission is changed.</p>
      <div class="field">
        <label for="restore-confirm">Type RESTORE to confirm</label>
        <input id="restore-confirm" autocomplete="off" spellcheck="false" placeholder="RESTORE">
      </div>
      <div class="modal-actions">
        <button type="button" class="button" data-action="close-modal">Cancel</button>
        <button type="button" class="button danger" data-action="confirm-restore" data-backup-id="${esc(backup.id)}">Restore backup</button>
      </div>
    `);
    document.getElementById('restore-confirm')?.focus();
  }

  function showConflictBanner() {
    const conflict = state.conflict;
    if (!conflict) return '';
    const keep = conflict.scope === 'editor' || conflict.scope === 'binding';
    return `
      <div class="banner conflict" role="alert">
        <div class="banner-icon">${icon('alert', 'lg')}</div>
        <div class="grow">
          <strong>Host revision changed (409).</strong>
          <p>${esc(conflict.message)}${Number.isSafeInteger(conflict.currentRevision) ? ` Current Host revision: <span class="mono">r${esc(conflict.currentRevision)}</span>.` : ''} ${keep ? 'Your draft remains in this tab.' : ''}</p>
          <div class="banner-actions">
            ${keep ? `<button type="button" class="button sm primary" data-action="conflict-reload-keep">${icon('refresh', 'sm')} Reload latest, keep draft</button>` : ''}
            <button type="button" class="button sm" data-action="conflict-reload">${icon('refresh', 'sm')} Reload latest${keep ? ' & discard draft' : ''}</button>
            <button type="button" class="button sm ghost" data-action="conflict-dismiss">Dismiss</button>
          </div>
        </div>
      </div>
    `;
  }

  function banners() {
    let html = '';
    if (state.accessDenied) {
      html += `<div class="banner bad" role="alert">${icon('lock', 'lg')}<div><strong>Owner access is required.</strong><p>The console did not pass DSH Owner admission. Read-only data may be stale; writes are disabled until you open the console from an authenticated DSH page.</p></div></div>`;
    }
    if (state.error) {
      html += `<div class="banner bad" role="alert">${icon('alert', 'lg')}<div class="grow"><strong>Host request failed.</strong><p>${esc(state.error)}</p><div class="banner-actions"><button type="button" class="button sm" data-action="refresh">${icon('refresh', 'sm')} Reload Host data</button><button type="button" class="button sm ghost" data-action="dismiss-error">Dismiss</button></div></div></div>`;
    }
    html += showConflictBanner();
    return html ? `<div class="banner-stack">${html}</div>` : '';
  }

  function navButton(page, iconName, label, count) {
    return `<button type="button" data-nav="${page}" class="${state.page === page ? 'active' : ''}">${icon(iconName)}${label}${count !== undefined && count !== null ? `<span class="nav-meta">${esc(count)}</span>` : ''}</button>`;
  }

  function topbar() {
    const storage = state.overview?.storage;
    const workspace = boundWorkspace();
    const revision = state.revision ?? state.overview?.revision;
    return `
      <header class="topbar">
        <div>
          <div class="eyebrow">AMADEUS · OWNER CONSOLE</div>
          <h1>${esc(PAGE_TITLES[state.page] ?? PAGE_TITLES.overview)}</h1>
          <div class="subline">${esc(PAGE_SUBTITLES[state.page] ?? PAGE_SUBTITLES.overview)}</div>
        </div>
        <div class="top-tools">
          <span class="pill ${workspace ? 'green' : 'amber'}">${icon('folder', 'sm')} ${esc(workspace?.title ?? 'No Workspace bound')}</span>
          <span class="pill ${storage?.status === 'ok' ? 'green' : 'amber'}">${icon('database', 'sm')} ${esc(storageLabel(storage?.status ?? 'unavailable'))}</span>
          <span class="pill">${icon('branch', 'sm')} ${revision === undefined || revision === null ? 'Revision —' : `Revision r${esc(revision)}`}</span>
          <button type="button" class="button" data-action="theme">${icon(state.theme === 'dark' ? 'sun' : 'moon', 'sm')} ${state.theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
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
          <div class="brand-text"><strong>Amadeus <span class="tiny-tag">Persona</span></strong><small>Same core · many expressions</small></div>
        </div>
        <div>
          <div class="nav-cap">PERSONA · OWNER CONSOLE</div>
          <nav class="nav" aria-label="Main navigation">
            ${navButton('overview', 'home', 'Overview')}
            ${navButton('library', 'layers', 'Library', overview?.counts?.styles)}
            ${navButton('bindings', 'users', 'Bindings', overview?.counts?.bindings)}
            <div class="nav-divider"></div>
            ${navButton('diagnostics', 'activity', 'Diagnostics')}
            ${navButton('settings', 'sliders', 'Settings')}
          </nav>
        </div>
        <div class="sidebar-bottom">
          <div class="status-box">
            <div class="title">HOST STATUS</div>
            <div class="value ${storage?.status === 'ok' ? '' : 'bad'}"><span class="dot ${storage?.status === 'ok' ? 'ok' : 'bad'}"></span>${esc(storageLabel(storage?.status ?? 'unavailable'))}</div>
            <p>${overview?.workspace ? 'Core and style changes apply at the next model assembly.' : 'No Workspace is bound, so Persona injects nothing.'}</p>
            <div class="slot"><span>Workspace</span><strong>${esc(workspace?.title ?? 'Not bound')}</strong></div>
            <div class="slot"><span>Injection</span><strong>${overview?.injectionEnabled === true ? 'Enabled' : 'Disabled'}</strong></div>
            <div class="slot"><span>Revision</span><strong>${revision === undefined || revision === null ? '—' : `r${esc(revision)}`}</strong></div>
          </div>
          <div class="side-foot">Owner-authenticated · no browser-side Persona state</div>
        </div>
      </aside>
      <main class="main">
        <div class="wrap">
          ${topbar()}
          ${banners()}
          ${content}
          <footer class="footer">Amadeus Persona v0.1 · Host JSON API only · Final prompt visibility is unverified</footer>
        </div>
      </main>
    `;
  }

  function loadingContent() {
    return `
      <div class="card pad-lg loading-card">
        <div class="eyebrow">AUTHENTICATED OWNER SURFACE</div>
        <h2>Loading Persona state…</h2>
        <p>Reading the Workspace registry, cards, bindings, diagnostics, and backup metadata from the Host. Nothing is stored in this browser.</p>
        <div class="skeleton-lines"><span></span><span></span><span></span></div>
      </div>
    `;
  }

  function unavailableContent() {
    return `
      <div class="card pad-lg">
        <h2>Persona data is unavailable</h2>
        <p>The console could not load the Host API. Check DSH Owner admission and storage health, then retry.</p>
        <div class="form-actions mt-16"><button type="button" class="button primary" data-action="refresh">${icon('refresh', 'sm')} Retry</button></div>
      </div>
    `;
  }

  function overviewWarnings() {
    const warnings = [];
    const overview = state.overview;
    if (!overview) return warnings;
    if (overview.storage?.status !== 'ok') {
      warnings.push({ tone: 'bad', title: 'Persona storage is not healthy', text: 'Injection fails closed and writes are unavailable. Inspect the Host storage state before continuing.' });
    }
    if (overview.workspaceId === null) {
      warnings.push({ tone: 'amber', title: 'No Workspace is bound', text: 'Persona does not inject into any Session. Select one Workspace in Settings.' });
    } else if (overview.workspace === null) {
      warnings.push({ tone: 'bad', title: 'The bound Workspace is missing', text: 'The stored Workspace id no longer resolves in the DSH registry. Rebind a current Workspace.' });
    }
    if (overview.injectionEnabled !== true) {
      warnings.push({ tone: 'amber', title: 'Injection is disabled', text: 'Configured cards are retained, but no Persona sections are provided at model assembly.' });
    }
    if (coreView()?.token?.tokenWarning) {
      warnings.push({ tone: 'amber', title: 'Core persona exceeds the token warning threshold', text: 'Review length. Token counts are heuristic estimates, not tokenizer-exact.' });
    }
    if (Array.isArray(overview.warnings) && overview.warnings.includes('PERSONA_TOKEN_WARNING')) {
      warnings.push({ tone: 'amber', title: 'One or more cards exceed the token warning threshold', text: 'Short, stable persona text is easier to review and costs fewer prompt tokens.' });
    }
    if (overview.warnings?.includes('PERSONA_MEMORY_CARD_STATUS_UNVERIFIED')) {
      warnings.push({ tone: 'amber', title: 'Memory persona card status needs review', text: 'Memory is installed, but its current public Host contract does not expose the effective persona-card switch. Confirm that Memory personaEnabled remains off to avoid duplicate identity instructions.' });
    }
    if (overview.warnings?.includes('PERSONA_MARKDOWN_PROJECTION_UNAVAILABLE')) {
      warnings.push({ tone: 'amber', title: 'Markdown projection is unavailable', text: 'The validated JSON revision remains active. Check the plugin data directory and save again to regenerate SOUL.md and style files.' });
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
      ? `<div class="info-note">${icon('circlecheck')}<span><strong>No configuration warnings reported by the Host.</strong> This does not prove final prompt visibility; use Diagnostics for callback evidence.</span></div>`
      : `<div class="stack">${warnings.map(warning => `<div class="banner ${warning.tone === 'bad' ? 'bad' : 'warning'}">${icon('alert')}<div><strong>${esc(warning.title)}</strong><p>${esc(warning.text)}</p></div></div>`).join('')}</div>`;
    const bindingRows = configuredBindings.length === 0
      ? `<div class="empty">No explicit bindings. Sessions and verified Scenes use the Workspace default, if any.</div>`
      : `<div class="table-wrap"><table class="test-table">
          <thead><tr><th>Target</th><th>Mode</th><th>Status</th><th></th></tr></thead>
          <tbody>${configuredBindings.map(binding => {
            const label = binding.kind === 'qq'
              ? `${binding.scene?.kind === 'private' ? 'Private' : 'Group'} · ${binding.scene?.peerId ?? 'unknown'}`
              : binding.sessionId ?? binding.key;
            return `<tr>
              <td><strong>${esc(label)}</strong><div class="fine muted">${binding.kind === 'qq' ? 'Verified QQ Scene' : 'Workspace Session'}</div></td>
              <td>${esc(modeLabel(binding))}</td>
              <td><span class="pill ${statusTone(binding.status)}">${esc(statusLabel(binding.status))}</span><div class="fine muted">${esc(statusReason(binding.status))}</div></td>
              <td><button type="button" class="button sm" data-action="open-binding" data-binding-key="${esc(binding.key)}">Inspect</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>`;
    return `
      <section class="hero card">
        <div>
          <div class="kicker">${icon('sparkles', 'sm')} ONE IDENTITY · MANY EXPRESSIONS</div>
          <h2>${workspace ? `Persona is scoped to “${esc(workspace.title)}”.` : 'Start by binding one DSH Workspace.'}</h2>
          <p>Persona adds two independent System Prompt sections for the bound Workspace. It does not select a preset, change tool schemas, or grant permissions. All values below come from the authenticated Host API.</p>
          <div class="button-row">
            <button type="button" class="button primary" data-nav="${workspace ? 'bindings' : 'settings'}">${icon(workspace ? 'users' : 'folder', 'sm')} ${workspace ? 'Manage bindings' : 'Choose Workspace'} ${icon('arrow', 'sm')}</button>
            <button type="button" class="button soft" data-nav="library">${icon('layers', 'sm')} Edit core persona</button>
          </div>
        </div>
        <div class="flow-diagram">
          <div class="flow-center"><div class="flow-icon">${icon('heart', 'lg')}</div><div><strong>${coreText.trim().length > 0 ? 'Core persona configured' : 'Core persona is empty'}</strong><small>One shared SOUL per bound Workspace</small></div></div>
          <div class="flow-line"></div>
          <div class="flow-branches">
            <div class="flow-chip"><strong>${esc(styleCards.length)}</strong><small>Style cards</small></div>
            <div class="flow-chip"><strong>${esc(configuredBindings.length)}</strong><small>Explicit bindings</small></div>
            <div class="flow-chip"><strong>${esc(defaultName)}</strong><small>Workspace default</small></div>
          </div>
        </div>
      </section>
      <div class="section-header"><h2>Persona overview</h2><span class="micro">Revision r${esc(overview.revision)} · next model assembly</span></div>
      <div class="stats">
        <div class="card stat"><div class="top">Core persona<span class="stat-ico">${icon('heart')}</span></div><div class="number text-stat">${coreText.trim().length > 0 ? 'Present' : 'Empty'}</div><div class="hint">${esc(core?.token?.characters ?? 0)} characters · ${esc(core?.token?.estimatedTokens ?? 0)} est. tokens</div></div>
        <div class="card stat"><div class="top">Style cards<span class="stat-ico purple">${icon('layers')}</span></div><div class="number">${esc(overview.counts?.styles ?? 0)}</div><div class="hint">Reusable across trusted targets</div></div>
        <div class="card stat"><div class="top">Explicit bindings<span class="stat-ico blue">${icon('branch')}</span></div><div class="number">${esc(overview.counts?.bindings ?? 0)}</div><div class="hint">${esc(sessionCount)} Workspace Sessions · ${esc(sceneCount)} verified QQ Scenes</div></div>
        <div class="card stat"><div class="top">Injection<span class="stat-ico amber">${icon('shield')}</span></div><div class="number text-stat">${overview.injectionEnabled === true ? 'Enabled' : 'Disabled'}</div><div class="hint">${workspace ? 'Bound to one Workspace' : 'No Workspace bound'}</div></div>
      </div>
      <div class="section-header"><h2>Warnings and boundaries</h2><button class="button sm" data-action="refresh">${icon('refresh', 'sm')} Refresh</button></div>
      ${warningMarkup}
      <div class="overview-grid">
        <div class="card pad">
          <div class="section-header compact"><h2>Bound Workspace</h2><button class="button sm" data-nav="settings">${icon('sliders', 'sm')} Settings</button></div>
          ${workspace ? `<div class="binding-grid">
            <div class="soft-box"><div class="field-label">Workspace</div><strong>${esc(workspace.title)}</strong><div class="micro muted">${esc(workspace.id)}</div></div>
            <div class="soft-box"><div class="field-label">Trusted membership</div><strong>${esc(workspace.sessionCount ?? sessionCount)} Sessions</strong><div class="micro muted">Subagents are excluded by trusted origin</div></div>
            <div class="soft-box"><div class="field-label">Default style</div><strong>${esc(defaultName)}</strong><div class="micro muted">Used when a target has no explicit binding</div></div>
            <div class="soft-box"><div class="field-label">Effective timing</div><strong>Next model assembly</strong><div class="micro muted">No Session is recreated</div></div>
          </div>` : `<div class="empty">No Workspace is bound. <button type="button" class="button sm ml-8" data-nav="settings">Choose one</button></div>`}
        </div>
        <div class="card pad">
          <div class="section-header compact"><h2>How it resolves</h2><span class="micro">Fail closed</span></div>
          <div class="pipeline vertical">
            <div class="pipe-item"><span class="num">01 · IDENTITY</span><strong>Load the core card</strong><small>Only for the bound Workspace</small></div>
            <div class="pipe-item"><span class="num">02 · TRUST</span><strong>Recheck Session membership</strong><small>QQ Scenes require a verified Host mapping</small></div>
            <div class="pipe-item"><span class="num">03 · OVERRIDE</span><strong>Apply explicit mode</strong><small>Inherit › core-only › style › disabled</small></div>
            <div class="pipe-item"><span class="num">04 · ASSEMBLY</span><strong>Read again per model step</strong><small>No preset, tools, or permissions changed</small></div>
          </div>
        </div>
      </div>
      <div class="section-header"><h2>Configured bindings</h2><button class="button sm" data-nav="bindings">Open bindings ${icon('arrow', 'sm')}</button></div>
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
      ? `<div class="empty card pad">No style cards yet. <button type="button" class="button sm ml-8" data-action="new-style">${icon('plus', 'sm')} Create the first style</button></div>`
      : `<div class="library-grid">${styleCards.map(style => {
        const token = tokenSummary(style, 'style');
        return `<button type="button" class="profile-card ${activeStyle === style.id ? 'active' : ''}" data-select-card="style" data-card-id="${esc(style.id)}">
          <div class="profile-emblem ${colorTone(style.color)}">${icon('edit')}</div>
          <div class="title"><strong>${esc(style.name)}</strong><span class="pill outline fine">r${esc(style.revision)}</span></div>
          <p>${plain(style.description || style.body, 82)}</p>
          <div class="foot"><span>${esc(token.estimated)} est. tokens${token.warning ? ' · warning' : ''}</span><span>${icon('chevron', 'sm')} Edit</span></div>
        </button>`;
      }).join('')}</div>`;
    return `
      <div class="section-header no-top"><h2>Persona definitions</h2><button type="button" class="button primary" data-action="new-style">${icon('plus', 'sm')} New style</button></div>
      <div class="library-layout">
        <div>
          <div class="core-card card">
            <div class="headl">
              <div class="head-with-icon"><div class="profile-emblem green">${icon('heart')}</div><div><h3>Core persona</h3><div class="micro muted">One shared identity · SOUL</div></div></div>
              <span class="pill ${core?.body?.trim() ? 'green' : 'amber'}">${core?.body?.trim() ? 'Configured' : 'Empty'}</span>
            </div>
            <p>${core?.body?.trim() ? plain(core.body, 190) : 'The core persona is empty. No core text is injected until the owner writes and saves one.'}</p>
            <div class="card-meta">
              <span class="pill outline">r${esc(core?.revision ?? 0)}</span>
              <span class="micro muted">${esc(coreToken.characters)} chars · ~${esc(coreToken.estimated)} tokens${coreToken.warning ? ' · token warning' : ''}</span>
              <span class="grow"></span>
              <button type="button" class="button sm" data-select-card="core">${icon('edit', 'sm')} Edit core</button>
              <button type="button" class="button sm" data-action="core-history">${icon('history', 'sm')} History</button>
            </div>
          </div>
          <div class="section-header"><h2>Style library</h2><span class="micro">Reusable across trusted targets</span></div>
          ${styleGrid}
          <div class="info-note">${icon('info')}<span><strong>Expression, not a second identity.</strong> Style cards layer on the core persona. They never replace DSH presets, grant tools, or change QQ, Life, Memory, or State permissions.</span></div>
        </div>
        <div class="card editor-card" id="editor">${renderEditor()}</div>
      </div>
    `;
  }

  function renderEditor() {
    const editor = state.editor;
    if (!editor) return '<div class="empty">Select a card to edit.</div>';
    const core = editor.type === 'core';
    const limits = state.cards?.limits ?? {};
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
        <label for="editor-name">Style name</label>
        <input id="editor-name" data-edit="name" maxlength="${esc(limits.styleNameMaxChars ?? 80)}" value="${esc(editor.name)}" autocomplete="off">
      </div>
      <div class="field">
        <label for="editor-description">One-line description</label>
        <input id="editor-description" data-edit="description" maxlength="${esc(limits.styleDescriptionMaxChars ?? 500)}" value="${esc(editor.description)}" autocomplete="off">
      </div>
      <div class="field">
        <label>Color label</label>
        <div class="swatches" role="group" aria-label="Style color">
          ${COLOR_PRESETS.map(color => `<button type="button" class="swatch c-${color.name} ${editor.color === color.value ? 'active' : ''}" data-color="${esc(color.value)}" aria-label="${esc(color.name)}" title="${esc(color.name)}"></button>`).join('')}
          <input class="color-input" id="editor-color" type="color" value="${esc(editor.color)}" aria-label="Custom color">
        </div>
      </div>
    `;
    return `
      <div class="ed-head">
        <div class="profile-emblem ${core ? 'green' : 'violet'}">${icon(core ? 'heart' : 'edit', 'lg')}</div>
        <div class="grow"><strong>${editor.isNew ? 'New style' : core ? 'Edit core persona' : 'Edit style'}</strong><span>${core ? 'Shared by every trusted target in the bound Workspace' : 'Used only by targets that explicitly select this style'}</span></div>
        <span class="pill ${core ? 'green' : 'purple'}">${core ? 'Core' : 'Style'}</span>
      </div>
      ${editor.isNew && !core ? `<div class="info-note compact-note">${icon('plus')}<span>A new style is written to the Host only when you save. No sample persona text is pre-filled.</span></div>` : ''}
      <div class="ed-grid">${styleFields}</div>
      <div class="field">
        <label for="editor-body">${core ? 'Core persona body · SOUL' : 'Style body · STYLE'}</label>
        <textarea id="editor-body" data-edit="body" rows="12" maxlength="${esc(core ? limits.coreMaxChars ?? 20000 : limits.styleBodyMaxChars ?? 12000)}" spellcheck="false" placeholder="${core ? 'Write the shared identity, values, and expression principles…' : 'Write the scene-specific expression and behaviour guidance…'}">${esc(editor.body)}</textarea>
        <div class="editor-meta">
          <small id="editor-char-count">${token.characters} / ${core ? limits.coreMaxChars ?? 20000 : limits.styleBodyMaxChars ?? 12000} characters</small>
          <small id="editor-token-estimate">~${token.estimated} estimated tokens · warning at ${token.warningAt || '—'}</small>
        </div>
        <div id="editor-token-warning" class="token-warning" ${token.warning ? '' : 'hidden'}>${token.warning ? `Token estimate is above the ${token.warningAt}-token warning threshold. This is a heuristic, not tokenizer-exact.` : ''}</div>
      </div>
      <div class="form-actions editor-actions">
        <span class="save-hint" id="editor-dirty-label">${state.editorDirty ? 'Unsaved changes' : 'Saved · next model assembly'}</span>
        ${editor.isNew ? '' : `<button type="button" class="button sm" data-action="open-history" ${disabled ? 'disabled' : ''}>${icon('history', 'sm')} History</button>`}
        ${core ? '' : `<button type="button" class="button sm" data-action="copy-style" ${editor.isNew || disabled ? 'disabled' : ''}>${icon('copy', 'sm')} Copy</button>`}
        ${core ? '' : `<button type="button" class="button sm danger" data-action="delete-style" ${editor.isNew || disabled ? 'disabled' : ''}>${icon('trash', 'sm')} Delete</button>`}
        <button type="button" class="button sm" data-action="discard-editor" ${!state.editorDirty || disabled ? 'disabled' : ''}>Discard</button>
        <button type="button" class="button primary" id="save-editor" data-action="save-editor" ${saveDisabled ? 'disabled' : ''}>${icon('check', 'sm')} ${editor.isNew ? 'Create style' : 'Save changes'}</button>
      </div>
      <p class="fine muted editor-footnote">Changes take effect at the next model assembly. Existing Sessions keep their Agent preset, tools, permissions, and history.</p>
    `;
  }

  function renderTargetList() {
    const targets = filteredTargets();
    if (targets.length === 0) return '<div class="empty">No trusted targets match this filter.</div>';
    return targets.map(target => {
      const binding = bindingByKey(target.key);
      const active = state.target?.key === target.key;
      return `<button type="button" class="scene-choice ${active ? 'active' : ''}" data-target-key="${esc(target.key)}">
        <div class="scene-avatar ${target.kind === 'qq' ? 'qq' : 'dsh'}">${icon(target.kind === 'qq' ? (target.scene?.kind === 'private' ? 'message' : 'users') : 'message', 'sm')}</div>
        <div class="body"><strong>${esc(target.title)}</strong><small>${esc(target.subtitle)}</small></div>
        ${target.subagent ? '<span class="pill amber fine">Subagent</span>' : binding ? `<span class="tone-dot ${statusTone(binding.status)}"></span>` : ''}
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
      ? `<div class="empty detail-empty">Select a Workspace Session or verified QQ Scene from the list.<div class="fine muted">Only targets discovered from the current trusted Workspace appear here. There is no free-form QQ id field.</div></div>`
      : `<div class="detail-header">
          <div class="scene-avatar ${selected.kind === 'qq' ? 'qq' : 'dsh'}">${icon(selected.kind === 'qq' ? (selected.scene?.kind === 'private' ? 'message' : 'users') : 'message')}</div>
          <div class="grow"><h2>${esc(selected.title)}</h2><p>${esc(selected.subtitle)}</p></div>
          ${existing ? `<span class="pill ${statusTone(existing.status)}">${esc(statusLabel(existing.status))}</span>` : '<span class="pill">No explicit binding</span>'}
        </div>
        <div class="binding-grid">
          <div class="soft-box"><div class="field-label">Target source</div><strong>${selected.kind === 'qq' ? 'Verified QQ Host mapping' : 'Current Workspace membership'}</strong><div class="micro muted">${selected.stale ? 'Stored target no longer appears in the live registry.' : 'Revalidated by the Host on every write and assembly.'}</div></div>
          <div class="soft-box"><div class="field-label">Stable key</div><strong class="mono break">${esc(selected.key)}</strong><div class="micro muted">${selected.subagent ? 'Subagent Sessions are excluded; this binding cannot be saved.' : existing ? `Binding revision ${esc(existing.revision)} · ${esc(formatDate(existing.updatedAt))}` : 'Inherits the Workspace default until saved.'}</div></div>
        </div>
        ${selected.subagent ? `<div class="banner warning">${icon('alert')}<div><strong>Subagent Session.</strong><p>The resolver excludes Sessions whose trusted header origin is <span class="mono">subagent</span>. No binding can be saved for this target.</p></div></div>` : ''}
        ${existing && existing.status?.valid !== true ? `<div class="banner warning">${icon('alert')}<div><strong>Stored binding is not currently trusted.</strong><p>${esc(statusReason(existing.status))}. It is preserved for review, but it will not inject until the target becomes trusted again.</p></div></div>` : ''}
        <div class="field">
          <label for="binding-mode">Explicit mode</label>
          <select id="binding-mode" class="select-control" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>
            ${BINDING_MODES.map(mode => `<option value="${mode}" ${draft.mode === mode ? 'selected' : ''}>${mode === 'inherit' ? `Inherit Workspace default · ${esc(defaultStyleName())}` : mode === 'core-only' ? 'Core only · no style' : mode === 'style' ? 'Specified style' : 'Disabled · no Persona sections'}</option>`).join('')}
          </select>
          <small>Explicit binding wins over the Workspace default. Disabled stops both core and style injection for this target.</small>
        </div>
        ${draft.mode === 'style' ? `<div class="field">
          <label for="binding-style">Style card</label>
          <select id="binding-style" class="select-control" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>
            <option value="">Select a style…</option>
            ${styleList.map(style => `<option value="${esc(style.id)}" ${draft.styleId === style.id ? 'selected' : ''}>${esc(style.name)} · r${esc(style.revision)}</option>`).join('')}
          </select>
          ${styleList.length === 0 ? '<small class="warn-text">No styles exist. Create one in Library before saving a style binding.</small>' : ''}
        </div>` : ''}
        <div class="form-actions">
          <button type="button" class="button sm" data-action="reset-binding" ${!existing || state.pending !== '' || state.accessDenied ? 'disabled' : ''}>Reset to inherit</button>
          <button type="button" class="button sm danger" data-action="delete-binding" ${!existing || state.pending !== '' || state.accessDenied ? 'disabled' : ''}>Remove binding</button>
          <span class="grow"></span>
          <button type="button" class="button primary" data-action="save-binding" ${canSave ? '' : 'disabled'}>${icon('check', 'sm')} Save binding</button>
        </div>
        <div class="section-header"><h2>Configured preview</h2><span class="micro">Not evidence of final prompt visibility</span></div>
        ${renderBindingPreview(draft, selectedStyle)}
        <div class="info-note">${icon('info')}<span><strong>Deletion impact:</strong> removing a binding changes only this target's Persona selection. It does not delete Sessions, QQ access, Agent presets, tools, or permissions. Resetting to inherit follows the current Workspace default.</span></div>
      `;
    return `
      ${boundWorkspaceId() === null ? `<div class="banner warning">${icon('folder')}<div><strong>No Workspace bound.</strong><p>Bind a Workspace in Settings before creating or editing explicit bindings.</p><div class="banner-actions"><button type="button" class="button sm" data-nav="settings">Open Settings</button></div></div></div>` : ''}
      <div class="scene-layout">
        <aside class="card scene-aside">
          <div class="search">${icon('search', 'sm')}<input id="scene-query" aria-label="Search trusted targets" placeholder="Search Session or Scene" value="${esc(state.sceneQuery)}"></div>
          <div class="filter-pills" role="group" aria-label="Target filter">
            <button type="button" class="${state.sceneFilter === 'all' ? 'active' : ''}" data-filter="all">All ${esc(allTargets.length)}</button>
            <button type="button" class="${state.sceneFilter === 'session' ? 'active' : ''}" data-filter="session">Sessions ${esc(sessionCount)}</button>
            <button type="button" class="${state.sceneFilter === 'qq' ? 'active' : ''}" data-filter="qq">QQ ${esc(qqCount)}</button>
            <button type="button" class="${state.sceneFilter === 'subagent' ? 'active' : ''}" data-filter="subagent">Subagents</button>
          </div>
          <div class="scene-list" id="scene-list">${renderTargetList()}</div>
          <div class="aside-foot">Targets are discovered from <span class="mono">Workspace.sessionIds</span> and the optional trusted QQ Host service. No QQ id can be typed into a trusted binding.</div>
        </aside>
        <div class="card scene-detail">${detail}</div>
      </div>
    `;
  }

  function renderBindingPreview(draft, selectedStyle) {
    if (draft.mode === 'disabled') {
      return `<div class="prompt-piece gray"><div class="p-title"><strong>${icon('pause', 'sm')} No Persona sections</strong><span class="pill">Disabled</span></div><p>Both Persona sections resolve to empty text for this target. Other System Prompt content is untouched.</p></div>`;
    }
    const core = coreView();
    const effectiveStyle = draft.mode === 'style'
      ? selectedStyle
      : (state.cards?.defaultStyleId === null ? null : styleById(state.cards?.defaultStyleId));
    return `<div class="preview-stack">
      <div class="prompt-piece"><div class="p-title"><strong>${icon('heart', 'sm')} Core persona</strong><span class="pill green">SOUL</span></div><p>${core?.body?.trim() ? plain(core.body, 260) : 'Core persona is empty; no core text would be provided.'}</p></div>
      ${effectiveStyle ? `<div class="prompt-piece violet"><div class="p-title"><strong>${icon('sparkles', 'sm')} ${esc(effectiveStyle.name)}</strong><span class="pill purple">STYLE</span></div><p>${plain(effectiveStyle.body, 240)}</p></div>` : `<div class="prompt-piece gray"><div class="p-title"><strong>${icon('layers', 'sm')} No style layer</strong><span class="pill">Core only</span></div><p>This target uses no style text under the current draft.</p></div>`}
      <div class="prompt-piece blue"><div class="p-title"><strong>${icon('shield', 'sm')} Preserved capability surface</strong><span class="pill blue">DSH</span></div><p>Agent preset, tools, permissions, runtime context, QQ authorization, Memory, State, and Life are not modified by Persona.</p></div>
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
      ? '<div class="empty">No configured sections reported.</div>'
      : `<div class="table-wrap"><table class="test-table"><thead><tr><th>Section</th><th>Order</th><th>Interpolate</th><th>Complete</th><th>Registered</th></tr></thead><tbody>${configured.map(section => `<tr><td><span class="mono">${esc(section.name)}</span></td><td>${esc(section.order)}</td><td>${section.interpolate === false ? 'No' : 'Yes'}</td><td>${section.complete === true ? 'Yes' : 'No'}</td><td>${section.registered === true ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table></div>`;
    const observationRows = observations.length === 0
      ? '<div class="empty">No model assembly has been observed since the plugin mounted. This is not evidence that injection works or fails.</div>'
      : `<div class="table-wrap"><table class="test-table"><thead><tr><th>Observed at</th><th>Session</th><th>Source · mode</th><th>Core callback</th><th>Scene callback</th><th>Reason</th></tr></thead><tbody>${observations.map((entry, index) => `<tr data-diagnostic-index="${index}" class="${selectedIndex === index ? 'selected-row' : ''}"><td>${esc(formatDate(entry.at))}</td><td><span class="mono">${esc(shortId(entry.sessionId ?? 'unknown', 24))}</span><div class="fine muted">${esc(entry.agentPreset ?? 'no preset')}</div></td><td>${esc(entry.source ?? '—')}<div class="fine muted">${esc(entry.mode ?? '—')}</div></td><td>${entry.coreCallback ? '<span class="pill green">Invoked</span>' : '<span class="pill">Not observed</span>'}</td><td>${entry.sceneCallback ? '<span class="pill green">Invoked</span>' : '<span class="pill">Not observed</span>'}</td><td>${esc(reasonLabel(entry.reason))}</td></tr>`).join('')}</tbody></table></div>`;
    const detail = selected === null ? '' : `
      <div class="card pad observation-detail">
        <div class="section-header compact"><h2>Selected observation</h2><span class="pill ${selected.coreCallback || selected.sceneCallback ? 'green' : 'amber'}">${selected.coreCallback || selected.sceneCallback ? 'Callback observed' : 'No callback observed'}</span></div>
        <div class="definition-grid">
          <div><span>Observed at</span><strong>${esc(formatDate(selected.at))}</strong></div>
          <div><span>Session</span><strong class="mono break">${esc(selected.sessionId ?? 'unknown')}</strong></div>
          <div><span>Agent preset</span><strong>${esc(selected.agentPreset ?? '—')}</strong></div>
          <div><span>Workspace</span><strong class="mono break">${esc(selected.workspaceId ?? '—')}</strong></div>
          <div><span>QQ mapping</span><strong>${esc(selected.qqState ?? '—')}</strong></div>
          <div><span>Source</span><strong>${esc(selected.source ?? '—')}</strong></div>
          <div><span>Binding key</span><strong class="mono break">${esc(selected.bindingKey ?? '—')}</strong></div>
          <div><span>Mode · style</span><strong>${esc(selected.mode ?? '—')}${selected.styleId ? ` · ${esc(shortId(selected.styleId, 22))}` : ''}</strong></div>
          <div><span>Core callback</span><strong>${selected.coreCallback ? 'Yes' : 'No'}</strong></div>
          <div><span>Scene callback</span><strong>${selected.sceneCallback ? 'Yes' : 'No'}</strong></div>
          <div><span>Configured core injected</span><strong>${selected.coreInjected ? 'Yes' : 'No'}</strong></div>
          <div><span>Configured style injected</span><strong>${selected.styleInjected ? 'Yes' : 'No'}</strong></div>
          <div><span>Resolution reason</span><strong>${esc(reasonLabel(selected.reason))}</strong></div>
          <div><span>State revision</span><strong>${selected.revision === null || selected.revision === undefined ? '—' : `r${esc(selected.revision)}`}</strong></div>
        </div>
        <div class="info-note">${icon('eye')}<span>These are resolver observations, not a dump of the final System Prompt. A callback invocation only proves the section text function ran; another preset's complete section can still override it later.</span></div>
        <button class="button sm" data-action="probe-final">Check final Host assembly for this live Session</button>
        ${probe ? `<div class="info-note"><span>Final check: <strong>${esc(probe.status)}</strong> · ${esc(probe.reason)} · core ${probe.coreVisible ? 'visible' : 'absent'} · style ${probe.sceneExpected ? (probe.sceneVisible ? 'visible' : 'absent') : 'not expected'}. No prompt text is returned.</span></div>` : ''}
      </div>`;
    const capabilities = data.capabilities && typeof data.capabilities === 'object' ? Object.entries(data.capabilities) : [];
    const limitations = Array.isArray(data.limitations) ? data.limitations : [];
    return `
      <div class="stats">
        <div class="card stat"><div class="top">Workspace<span class="stat-ico">${icon('folder')}</span></div><div class="number text-stat">${esc(boundWorkspace()?.title ?? 'Not bound')}</div><div class="hint">${esc(data.workspace?.sessionCount ?? 0)} trusted Sessions</div></div>
        <div class="card stat"><div class="top">Configured sections<span class="stat-ico purple">${icon('layers')}</span></div><div class="number">${esc(configured.length)}</div><div class="hint">Host-global registration</div></div>
        <div class="card stat"><div class="top">Callback evidence<span class="stat-ico blue">${icon('activity')}</span></div><div class="number">${esc(callbackCount)}</div><div class="hint">of ${esc(observations.length)} observed assemblies</div></div>
        <div class="card stat"><div class="top">Final visibility<span class="stat-ico amber">${icon('eye')}</span></div><div class="number text-stat">${esc(finalVisibility)}</div><div class="hint">${probe ? 'Explicit Host assembly check' : 'No final Host check yet'}</div></div>
      </div>
      <div class="section-header"><h2>Visibility model</h2><button class="button sm" data-action="refresh">${icon('refresh', 'sm')} Refresh diagnostics</button></div>
      <div class="diagnostic-layout">
        <div class="card pad">
          <div class="visibility-row"><span class="pill green">Configured</span><p>Exactly two host-global sections are registered with <span class="mono">interpolate: false</span> and <span class="mono">complete: false</span>.</p></div>
          <div class="visibility-row"><span class="pill ${callbackCount > 0 ? 'green' : 'amber'}">Callback</span><p>${callbackCount > 0 ? `${callbackCount} observed assembly${callbackCount === 1 ? '' : 'ies'} invoked at least one section callback.` : 'No section callback has been observed since the plugin mounted.'} A callback run is not proof that the final prompt retained the text.</p></div>
          <div class="visibility-row"><span class="pill ${visibilityTone}">Final prompt</span><p><strong>${probe ? `Host check: ${esc(probe.status)}.` : 'Unverified by the Host.'}</strong> Select an observed live Session and run an explicit final assembly check. DSH may restore or override sections after the assembly waterfall.</p></div>
        </div>
        <div class="card pad">
          <h3>Configured sections</h3>
          ${configuredRows}
          <div class="hr"></div>
          <h3>Stage note</h3>
          <p class="micro">${esc(sections.note ?? 'Final prompt visibility is not exposed by the current Host contract.')}</p>
        </div>
      </div>
      <div class="section-header"><h2>Observed assemblies</h2><span class="micro">Select a row for sanitized detail</span></div>
      <div class="card">${observationRows}</div>
      ${detail}
      <div class="overview-grid">
        <div class="card pad">
          <h3>Capability boundary reported by the service</h3>
          <div class="definition-grid compact-grid">${capabilities.map(([key, value]) => `<div><span>${esc(key.replace(/([A-Z])/g, ' $1').replace(/^./, character => character.toUpperCase()))}</span><strong>${value === true ? 'Yes' : 'No'}</strong></div>`).join('') || '<div><span>No capabilities reported</span><strong>—</strong></div>'}</div>
          <p class="micro muted">These flags describe what Persona registers. They do not verify the final tool list or model behavior.</p>
        </div>
        <div class="card pad">
          <h3>Known limitations</h3>
          <ul class="limitation-list">${limitations.map(item => `<li>${esc(item)}</li>`).join('') || '<li>No limitations reported by the service.</li>'}</ul>
          ${data.error ? `<div class="banner bad">${icon('alert')}<div><strong>Diagnostics error</strong><p>${esc(data.error)}</p></div></div>` : ''}
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
    const backupRows = state.backupsLoading
      ? '<div class="empty">Loading backups…</div>'
      : state.backupsError
        ? `<div class="banner bad">${icon('alert')}<div><strong>Backup list unavailable</strong><p>${esc(state.backupsError)}</p></div></div>`
        : backups.length === 0
          ? '<div class="empty">No valid backups yet. Create one before a large edit or upgrade.</div>'
          : `<div class="table-wrap"><table class="test-table"><thead><tr><th>Backup</th><th>Captured revision</th><th>Reason</th><th>Size</th><th></th></tr></thead><tbody>${backups.map(backup => `<tr>
              <td><span class="mono break">${esc(backup.id)}</span><div class="fine muted">${esc(formatDate(backup.createdAt))}</div></td>
              <td>r${esc(backup.revision)}</td>
              <td>${esc(backup.reason || 'manual')}</td>
              <td>${esc(backup.bytes)} B</td>
              <td><button type="button" class="button sm" data-action="restore-backup" data-backup-id="${esc(backup.id)}" ${state.accessDenied ? 'disabled' : ''}>${icon('database', 'sm')} Restore</button></td>
            </tr>`).join('')}</tbody></table></div>${invalidBackups > 0 ? `<p class="fine warn-text">${esc(invalidBackups)} invalid backup file${invalidBackups === 1 ? '' : 's'} ignored.</p>` : ''}`;
    return `
      <div class="setting-list">
        <div class="card setting-card">
          <div class="card-heading">${icon('folder', 'lg')}<h2>Bound Workspace</h2></div>
          <p>Persona trusts exactly one DSH Workspace by stable id. Changing the binding stops injection in the old Workspace and starts it in the new one. No Sessions are deleted or recreated.</p>
          <div class="field">
            <label for="workspace-select">Workspace</label>
            <select id="workspace-select" class="select-control w260" ${state.pending !== '' || state.accessDenied || workspaces.length === 0 ? 'disabled' : ''}>
              <option value="" ${workspaceDraft === '' ? 'selected' : ''}>No Workspace bound · injection disabled</option>
              ${workspaces.map(workspace => `<option value="${esc(workspace.id)}" ${workspaceDraft === workspace.id ? 'selected' : ''}>${esc(workspace.title)} · ${esc(workspace.sessionCount ?? workspace.sessions?.length ?? 0)} sessions</option>`).join('')}
            </select>
            <small>Current: ${currentWorkspace ? `${esc(currentWorkspace.title)} (${esc(currentWorkspace.id)})` : 'none'}${workspaces.length === 0 ? ' · Workspace registry unavailable or empty' : ''}.</small>
          </div>
          <div class="form-actions"><span class="save-hint">Bindings and cards are retained; their trust status may change.</span><button type="button" class="button primary" data-action="save-workspace" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>Apply Workspace</button></div>
        </div>
        <div class="card setting-card">
          <div class="card-heading">${icon('layers', 'lg')}<h2>Defaults and injection</h2></div>
          <p>The default style applies when a trusted target has no explicit binding. Explicit bindings always win.</p>
          <div class="field">
            <label for="default-style-select">Workspace default style</label>
            <select id="default-style-select" class="select-control w260" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>
              <option value="" ${defaultDraft === '' ? 'selected' : ''}>Core only · no default style</option>
              ${styleCards.map(style => `<option value="${esc(style.id)}" ${defaultDraft === style.id ? 'selected' : ''}>${esc(style.name)} · r${esc(style.revision)}</option>`).join('')}
            </select>
            <small>Deleting the current default style resets this setting to core-only.</small>
          </div>
          <div class="form-actions"><span class="save-hint">Existing targets with an explicit style are unaffected.</span><button type="button" class="button primary" data-action="save-default-style" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>Apply default</button></div>
          <div class="settings-row">
            <div><div class="name">Enable Persona injection</div><div class="help">When off, both Persona sections resolve to empty text at the next model assembly. Existing chat history and Sessions remain unchanged.</div></div>
            <label class="switch"><input id="injection-toggle" type="checkbox" ${overview.injectionEnabled === true ? 'checked' : ''} ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}><span class="track"></span></label>
          </div>
          <p class="micro muted">Timing: next model assembly. No Session recreation, no preset change. DSH may start a new request series when the System Prompt changes; no zero-cost claim is made.</p>
        </div>
        <div class="card setting-card">
          <div class="card-heading">${icon('database', 'lg')}<h2>Backups</h2><span class="grow"></span><button type="button" class="button sm" data-action="refresh-backups" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>${icon('refresh', 'sm')} Refresh</button></div>
          <p>Backups are complete validated state documents. Restoring writes a pre-restore safety backup first and keeps history.</p>
          <div class="field">
            <label for="backup-reason">Optional backup label</label>
            <input id="backup-reason" maxlength="80" value="${esc(state.backupReason)}" autocomplete="off" placeholder="before upgrade">
          </div>
          <div class="form-actions"><span class="save-hint">Backups do not change the Persona revision.</span><button type="button" class="button primary" data-action="create-backup" ${state.pending !== '' || state.accessDenied ? 'disabled' : ''}>${icon('plus', 'sm')} Create backup</button></div>
          <div class="hr"></div>
          <h3>Available backups</h3>
          ${backupRows}
        </div>
        <div class="card setting-card">
          <div class="card-heading">${icon('shield', 'lg')}<h2>Security and honest boundaries</h2></div>
          <ul class="limitation-list">
            <li>Every console request requires a same-origin request and DSH Owner admission through the Host Connection service. Loopback alone is not authorization.</li>
            <li>LocalStorage is used only for the light/dark theme preference. Persona configuration is never stored in the browser.</li>
            <li>Final System Prompt visibility is unverified unless a trusted Host check reports it. Callback invocation alone is not proof.</li>
            <li>Token counts are heuristic estimates, not tokenizer-exact. Character limits are enforced by the Host.</li>
            <li>QQ Scene identity is accepted only from the optional QQ Host mapping; this console has no free-form QQ id input.</li>
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
    let content;
    if (state.loading && state.overview === null) content = loadingContent();
    else if (state.overview === null) content = unavailableContent();
    else if (state.page === 'library') content = renderLibrary();
    else if (state.page === 'bindings') content = renderBindings();
    else if (state.page === 'diagnostics') content = renderDiagnostics();
    else if (state.page === 'settings') content = renderSettings();
    else content = renderOverview();
    app.innerHTML = layout(content);
    document.title = `${PAGE_TITLES[state.page] ?? PAGE_TITLES.overview} · Amadeus Persona`;
  }

  function validateEditor() {
    const editor = state.editor;
    if (!editor) return 'No card is selected.';
    const limits = state.cards?.limits ?? {};
    if (editor.type === 'style') {
      if (editor.name.trim().length === 0) return 'Style name is required.';
      if (charCount(editor.name) > (limits.styleNameMaxChars ?? 80)) return 'Style name is too long.';
      if (charCount(editor.description) > (limits.styleDescriptionMaxChars ?? 500)) return 'Style description is too long.';
      if (editor.body.trim().length === 0) return 'Style body is required.';
      if (charCount(editor.body) > (limits.styleBodyMaxChars ?? 12000)) return 'Style body exceeds the Host limit.';
      if (!/^#[0-9a-f]{6}$/i.test(editor.color)) return 'Color must be a #rrggbb value.';
    } else if (charCount(editor.body) > (limits.coreMaxChars ?? 20000)) {
      return 'Core body exceeds the Host limit.';
    }
    return '';
  }

  function saveEditor() {
    const editor = state.editor;
    const problem = validateEditor();
    if (problem) {
      notify('Cannot save', problem);
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
      notify('Persona saved', 'Changes take effect at the next model assembly; no Session is recreated.');
    });
  }

  function discardEditor() {
    if (!state.editorDirty || !state.editor) return;
    if (!window.confirm('Discard the unsaved draft and reload this card from the Host?')) return;
    if (state.editor.type === 'core') state.editor = editorFromCore(coreView());
    else if (state.editor.id === null) state.editor = emptyStyleEditor();
    else {
      const style = styleById(state.editor.id);
      state.editor = style === null ? editorFromCore(coreView()) : editorFromStyle(style);
    }
    state.editorDirty = false;
    render();
    notify('Draft discarded', 'The editor now shows the Host version.');
  }

  function copyStyle() {
    const editor = state.editor;
    if (!editor || editor.type !== 'style' || editor.id === null) return;
    const source = styleById(editor.id);
    if (!source) return;
    if (state.editorDirty && !window.confirm('The copy uses the last saved version, not unsaved edits. Continue?')) return;
    runWrite('copy', () => write(`/cards/styles/${encodeURIComponent(editor.id)}/copy`, { expectedRevision: state.revision }), async result => {
      await loadData({ renderNow: false, keepEditor: true, syncSettingDrafts: true });
      state.editor = editorFromStyle(styleById(result?.style?.id) ?? result?.style);
      state.editorDirty = false;
      state.conflict = null;
      notify('Style copied', 'The copy is a new stable card. Existing bindings still reference their original style.');
    });
  }

  function deleteStyle() {
    const editor = state.editor;
    if (!editor || editor.type !== 'style' || editor.id === null) return;
    const id = editor.id;
    if (state.editorDirty && !window.confirm('The saved style is deleted; unsaved draft text in this editor is not included. Continue?')) return;
    closeModal();
    runWrite('delete', () => write(`/cards/styles/${encodeURIComponent(id)}/delete`, { expectedRevision: state.revision }), async result => {
      await loadData({ renderNow: false, keepEditor: false, syncSettingDrafts: true });
      state.editorDirty = false;
      state.editor = editorFromCore(coreView());
      state.conflict = null;
      const affected = Number.isSafeInteger(result?.affectedCount) ? result.affectedCount : 0;
      notify('Style deleted', `${affected} binding${affected === 1 ? '' : 's'} fell back to inherit${result?.defaultStyleReset ? '; the default style was reset to core-only' : ''}.`);
    });
  }

  function rollback(historyId) {
    const editor = state.editor;
    if (!editor || editor.isNew) return;
    const cardType = editor.type === 'core' ? 'core' : 'style';
    const cardId = editor.type === 'style' ? editor.id : null;
    if (!window.confirm('Roll back this card to the selected history version? A new revision is created and the current version remains in history.')) return;
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
      notify('Rollback committed', 'The restored card is a new revision; prior history is retained.');
    });
  }

  function selectTarget(key) {
    const target = findTarget(key);
    if (!target) {
      notify('Target unavailable', 'Refresh the Host data and try again.');
      return;
    }
    if (state.bindingDraftDirty && state.target?.key !== key
      && !window.confirm('Discard the unsaved binding draft?')) return;
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
      notify('Cannot save binding', 'Subagent Sessions are excluded from Persona.');
      return;
    }
    if (boundWorkspaceId() === null) {
      notify('No Workspace bound', 'Bind a Workspace before saving a binding.');
      return;
    }
    if (draft.mode === 'style') {
      if (draft.styleId === null || styleById(draft.styleId) === null) {
        notify('Select a style', 'A style binding requires an existing style card.');
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
      notify('Binding saved', 'The Host revalidated the target against current membership and trust.');
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
      notify('Binding removed', 'This target now inherits the Workspace default.');
    });
  }

  function resetBinding() {
    if (!state.target) return;
    state.bindingDraft = { mode: 'inherit', styleId: null };
    state.bindingDraftDirty = true;
    render();
    notify('Reset draft', 'The draft now inherits the Workspace default. Save the binding to commit.');
  }

  function saveWorkspace() {
    const value = state.workspaceDraft === '' || state.workspaceDraft === null ? null : state.workspaceDraft;
    if (value !== null && !workspaceList().some(workspace => workspace.id === value)) {
      notify('Workspace unavailable', 'Refresh the Workspace list and choose a current Workspace.');
      return;
    }
    if (value === boundWorkspaceId()) {
      notify('No change', 'That Workspace is already bound.');
      return;
    }
    const label = value === null ? 'no Workspace' : (workspaceList().find(workspace => workspace.id === value)?.title ?? value);
    if (!window.confirm(`Bind Persona to ${label}? The old Workspace stops receiving Persona; the new one begins at the next model assembly. No Sessions are deleted.`)) return;
    runWrite('workspace', () => write('/workspace', { expectedRevision: state.revision, workspaceId: value }), async result => {
      await loadData({ renderNow: false, keepEditor: state.editorDirty, syncSettingDrafts: true });
      state.workspaceDraft = result?.workspaceId ?? '';
      state.conflict = null;
      notify('Workspace updated', 'Existing cards and bindings were retained; trust status is recomputed by the Host.');
    });
  }

  function saveDefaultStyle() {
    const value = state.defaultStyleDraft === '' || state.defaultStyleDraft === null ? null : state.defaultStyleDraft;
    if (value !== null && styleById(value) === null) {
      notify('Style unavailable', 'Choose an existing style.');
      return;
    }
    runWrite('default-style', () => write('/default-style', { expectedRevision: state.revision, styleId: value }), async result => {
      await loadData({ renderNow: false, keepEditor: state.editorDirty, syncSettingDrafts: true });
      state.defaultStyleDraft = result?.defaultStyleId ?? '';
      state.conflict = null;
      notify('Default style updated', 'Targets that explicitly select a style are unaffected.');
    });
  }

  function setInjection(enabled) {
    if (state.pending) return;
    runWrite('injection', () => write('/settings', { expectedRevision: state.revision, injectionEnabled: enabled }), async () => {
      await loadData({ renderNow: false, keepEditor: state.editorDirty, syncSettingDrafts: true });
      state.conflict = null;
      notify(enabled ? 'Injection enabled' : 'Injection disabled', 'Changes apply at the next model assembly; no Session is recreated.');
    });
  }

  function createBackup() {
    if (state.pending) return;
    const reason = state.backupReason.trim().slice(0, 80) || 'manual';
    runWrite('backup', () => write('/backup', { expectedRevision: state.revision, reason }), async result => {
      state.backupReason = '';
      await loadBackups({ renderNow: false });
      notify('Backup created', result?.id ? `Backup ${result.id} captured revision ${result.revision}.` : 'The Host wrote a validated backup.');
    });
  }

  function restoreBackup(backupId) {
    const input = document.getElementById('restore-confirm');
    if (!input || input.value !== 'RESTORE') {
      notify('Confirmation required', 'Type RESTORE exactly to restore a backup.');
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
      notify('Backup restored', 'A pre-restore safety backup was written first; history was retained.');
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
          notify('Host data refreshed', state.editorDirty || state.bindingDraftDirty ? 'Your unsaved draft was kept.' : '');
        });
        break;
      case 'probe-final': {
        const selected = state.diagnostics?.sections?.assembled?.[state.diagnosticIndex];
        if (!selected?.sessionId) return;
        void request('/diagnostics/final?sessionId=' + encodeURIComponent(selected.sessionId))
          .then(result => { state.finalProbe = { ...result, sessionId: selected.sessionId, revision: state.revision }; render(); })
          .catch(error => { notify('Final check unavailable', error instanceof Error ? error.message : 'Host check failed.'); });
        break;
      }
      case 'dismiss-error':
        state.error = '';
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
          notify('Latest Host data loaded', 'Your draft is preserved. Review it, then save again.');
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
          notify('Latest Host data loaded', 'Unsaved conflict drafts were discarded.');
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
