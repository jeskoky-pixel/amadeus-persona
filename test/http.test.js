import assert from 'node:assert/strict';
import test from 'node:test';
import { createPersonaHandler, PREFIX } from '../src/http.js';
import { CONSOLE_CSS, CONSOLE_HTML, CONSOLE_JS } from '../src/console-assets.js';
import {
  fixedClock,
  makeRegistry,
  makeService,
  makeStore,
  makeTempDir,
  removeTempDir,
  seedState,
} from './helpers.js';

/**
 * @param {{
 *   method?: string,
 *   path?: string,
 *   headers?: Record<string, string>,
 *   body?: unknown,
 * }} options request options.
 * @returns {Record<string, any>} fake IncomingMessage.
 */
function makeRequest(options = {}) {
  const method = options.method ?? 'GET';
  const headers = {
    host: '127.0.0.1:3080',
    ...(options.body === undefined ? {} : { 'content-type': 'application/json' }),
    ...(options.headers ?? {}),
  };
  const chunks = options.body === undefined ? [] : [Buffer.from(JSON.stringify(options.body))];
  return {
    method,
    url: `${PREFIX}${options.path ?? '/overview'}`,
    headers,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    },
  };
}

/**
 * @returns {{res: Record<string, any>, state: Record<string, any>, json: () => Record<string, any>}} fake response.
 */
function makeResponse() {
  const state = { status: null, headers: null, body: '' };
  const res = {
    writeHead(status, headers) {
      state.status = status;
      state.headers = headers;
    },
    end(chunk) {
      state.body = chunk ?? '';
    },
  };
  return {
    res,
    state,
    json() {
      return JSON.parse(state.body);
    },
  };
}

const OWNER = Object.freeze({ admit: () => ({ peer: { principal: { kind: 'owner' } } }) });
const GUEST = Object.freeze({ admit: () => ({ peer: { principal: { kind: 'guest' } } }) });
const REJECTED = Object.freeze({ admit: () => ({ rejection: 401 }) });

/**
 * @param {Record<string, any>|undefined} connection Connection service.
 * @returns {Promise<{directory: string, store: Record<string, any>, service: Record<string, any>, handler: Function}>} fixture.
 */
async function setup(connection) {
  const directory = await makeTempDir();
  const registry = makeRegistry([{ id: 'ws-a', title: 'Workspace A', sessionIds: ['s-1'] }]);
  const store = makeStore(directory, { now: fixedClock() });
  const service = makeService({ store, registry });
  const handler = createPersonaHandler({ service, getConnection: () => connection });
  return { directory, store, service, handler };
}

/**
 * @param {Function} handler handler.
 * @param {Record<string, any>} request fake request.
 * @returns {Promise<{state: Record<string, any>, json: () => Record<string, any>}>} response.
 */
async function call(handler, request) {
  const response = makeResponse();
  await handler(request, response.res);
  return response;
}

test('every API request requires DSH Connection owner admission', async () => {
  const fixture = await setup(undefined);
  try {
    const unavailable = await call(fixture.handler, makeRequest());
    assert.equal(unavailable.state.status, 503);
    assert.equal(unavailable.json().code, 'PERSONA_MANAGEMENT_UNAVAILABLE');

    const guestFixture = await setup(GUEST);
    try {
      const guest = await call(guestFixture.handler, makeRequest());
      assert.equal(guest.state.status, 403);
      assert.equal(guest.json().code, 'PERSONA_AUTH_REQUIRED');
    } finally {
      await removeTempDir(guestFixture.directory);
    }

    const rejectedFixture = await setup(REJECTED);
    try {
      const rejected = await call(rejectedFixture.handler, makeRequest());
      assert.equal(rejected.state.status, 401);
      assert.equal(rejected.json().code, 'PERSONA_AUTH_REQUIRED');
    } finally {
      await removeTempDir(rejectedFixture.directory);
    }

    const ownerFixture = await setup(OWNER);
    try {
      const owner = await call(ownerFixture.handler, makeRequest());
      assert.equal(owner.state.status, 200);
      assert.equal(owner.json().ok, true);
    } finally {
      await removeTempDir(ownerFixture.directory);
    }
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('same-origin and POST marker are required before owner routing', async () => {
  const fixture = await setup(OWNER);
  try {
    const crossSite = await call(fixture.handler, makeRequest({
      headers: { origin: 'http://evil.example' },
    }));
    assert.equal(crossSite.state.status, 403);
    assert.match(crossSite.json().error, /same-origin/);

    const crossSiteFetch = await call(fixture.handler, makeRequest({
      path: '/overview',
      headers: { 'sec-fetch-site': 'cross-site' },
    }));
    assert.equal(crossSiteFetch.state.status, 403);

    const missingMarker = await call(fixture.handler, makeRequest({
      method: 'POST',
      path: '/workspace',
      body: { expectedRevision: 0, workspaceId: 'ws-a' },
    }));
    assert.equal(missingMarker.state.status, 403);
    assert.match(missingMarker.json().error, /marker/);

    const withMarker = await call(fixture.handler, makeRequest({
      method: 'POST',
      path: '/workspace',
      headers: { 'x-amadeus-persona': '1' },
      body: { expectedRevision: 0, workspaceId: 'ws-a' },
    }));
    assert.equal(withMarker.state.status, 200);
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('owner console HTML, CSS and JavaScript assets are gated and carry strict CSP', async () => {
  const fixture = await setup(OWNER);
  try {
    const html = await call(fixture.handler, makeRequest({ path: '/console' }));
    assert.equal(html.state.status, 200);
    assert.match(html.state.headers['content-type'], /text\/html/);
    assert.match(html.state.headers['content-security-policy'], /script-src 'self'/);
    assert.match(html.state.headers['content-security-policy'], /style-src 'self'/);
    assert.match(html.state.headers['content-security-policy'], /connect-src 'self'/);
    assert.match(html.state.headers['content-security-policy'], /frame-ancestors 'none'/);
    assert.doesNotMatch(html.state.headers['content-security-policy'], /unsafe-inline|unsafe-eval/);
    assert.equal(html.state.headers['cache-control'], 'no-store');
    assert.equal(html.state.headers['x-frame-options'], 'DENY');
    assert.match(html.state.body, /Amadeus Persona/);
    assert.match(html.state.body, /href="\/api\/amadeus-persona\/console\/console.css"/);
    assert.match(html.state.body, /src="\/api\/amadeus-persona\/console\/console.js" defer/);
    assert.doesNotMatch(html.state.body, /\sstyle=/);
    assert.doesNotMatch(html.state.body, /<script(?![^>]*\bsrc=)/);

    const trailing = await call(fixture.handler, makeRequest({ path: '/console/' }));
    assert.equal(trailing.state.status, 200);
    assert.match(trailing.state.body, /Amadeus Persona/);

    const css = await call(fixture.handler, makeRequest({ path: '/console/console.css' }));
    assert.equal(css.state.status, 200);
    assert.match(css.state.headers['content-type'], /text\/css/);
    assert.match(css.state.headers['content-security-policy'], /default-src 'none'/);
    assert.equal(css.state.body, CONSOLE_CSS);
    assert.match(css.state.body, /\.sidebar/);

    const js = await call(fixture.handler, makeRequest({ path: '/console/console.js' }));
    assert.equal(js.state.status, 200);
    assert.match(js.state.headers['content-type'], /javascript/);
    assert.match(js.state.headers['content-security-policy'], /script-src 'self'/);
    assert.equal(js.state.body, CONSOLE_JS);
    assert.match(js.state.body, /x-amadeus-persona/);
    assert.match(js.state.body, /conflict-reload-keep/);

    const unknown = await call(fixture.handler, makeRequest({ path: '/console/missing.js' }));
    assert.equal(unknown.state.status, 404);
    assert.equal(unknown.json().code, 'PERSONA_ENDPOINT_UNKNOWN');
  } finally {
    await removeTempDir(fixture.directory);
  }

  const guestFixture = await setup(GUEST);
  try {
    for (const path of ['/console', '/console/console.css', '/console/console.js']) {
      const guest = await call(guestFixture.handler, makeRequest({ path }));
      assert.equal(guest.state.status, 403);
      assert.match(guest.state.headers['content-type'], /application\/json/);
      assert.equal(guest.json().code, 'PERSONA_AUTH_REQUIRED');
    }
  } finally {
    await removeTempDir(guestFixture.directory);
  }

  const crossSiteFixture = await setup(OWNER);
  try {
    const crossSite = await call(crossSiteFixture.handler, makeRequest({
      path: '/console',
      headers: { origin: 'http://evil.example' },
    }));
    assert.equal(crossSite.state.status, 403);
  } finally {
    await removeTempDir(crossSiteFixture.directory);
  }
});

test('console assets contain no demo identities, external assets or non-theme browser state', () => {
  const combined = `${CONSOLE_HTML}\n${CONSOLE_CSS}\n${CONSOLE_JS}`;
  assert.doesNotMatch(combined, /123456789|987654321|amadeus\.persona\.prototype/);
  assert.doesNotMatch(combined, /https?:\/\//);
  assert.doesNotMatch(CONSOLE_HTML, /\sstyle=/);
  assert.doesNotMatch(CONSOLE_JS, /\sstyle=/);
  assert.doesNotMatch(CONSOLE_JS, /<script(?![^>]*\bsrc=)/);

  const storageUses = CONSOLE_JS.match(/localStorage/g) ?? [];
  assert.equal(storageUses.length, 2);
  assert.match(CONSOLE_JS, /const THEME_KEY = 'amadeus\.persona\.theme'/);
  for (const marker of ['localStorage.getItem(THEME_KEY)', 'localStorage.setItem(THEME_KEY']) {
    assert.ok(CONSOLE_JS.includes(marker), `missing ${marker}`);
  }
  assert.match(CONSOLE_JS, /credentials: 'same-origin'/);
  assert.match(CONSOLE_JS, /headers: \{[\s\S]*x-amadeus-persona/);
  assert.match(CONSOLE_JS, /status === 409|Number\(error\?\.status\) === 409/);
  assert.match(CONSOLE_JS, /navButton\('overview'/);
  assert.match(CONSOLE_JS, /navButton\('library'/);
  assert.match(CONSOLE_JS, /navButton\('bindings'/);
  assert.match(CONSOLE_JS, /navButton\('diagnostics'/);
  assert.match(CONSOLE_JS, /navButton\('settings'/);
  assert.match(CONSOLE_JS, /history\/rollback/);
  assert.match(CONSOLE_JS, /There is no free-form QQ id field/);
  assert.match(CONSOLE_JS, /finalVisibility/);
});

test('owner workspace, card, default style, binding, history and copy flow', async () => {
  const fixture = await setup(OWNER);
  const headers = { 'x-amadeus-persona': '1' };
  try {
    const workspace = await call(fixture.handler, makeRequest({
      method: 'POST',
      path: '/workspace',
      headers,
      body: { expectedRevision: 0, workspaceId: 'ws-a' },
    }));
    assert.equal(workspace.state.status, 200);
    assert.equal(workspace.json().data.revision, 1);

    const core = await call(fixture.handler, makeRequest({
      method: 'POST',
      path: '/cards/core',
      headers,
      body: { expectedRevision: 1, body: 'CORE' },
    }));
    assert.equal(core.state.status, 200);
    assert.equal(core.json().data.core.body, 'CORE');

    const created = await call(fixture.handler, makeRequest({
      method: 'POST',
      path: '/cards/styles',
      headers,
      body: { expectedRevision: 2, name: 'Gentle', description: 'calm', body: 'STYLE', color: '#123456' },
    }));
    assert.equal(created.state.status, 200);
    const styleId = created.json().data.style.id;
    assert.match(styleId, /^style-/);

    const defaultStyle = await call(fixture.handler, makeRequest({
      method: 'POST',
      path: '/default-style',
      headers,
      body: { expectedRevision: 3, styleId },
    }));
    assert.equal(defaultStyle.state.status, 200);

    const binding = await call(fixture.handler, makeRequest({
      method: 'POST',
      path: '/bindings',
      headers,
      body: { expectedRevision: 4, kind: 'session', sessionId: 's-1', mode: 'style', styleId },
    }));
    assert.equal(binding.state.status, 200);
    assert.equal(binding.json().data.binding.status.valid, true);

    const cards = await call(fixture.handler, makeRequest({ path: '/cards' }));
    assert.equal(cards.state.status, 200);
    assert.equal(cards.json().data.core.body, 'CORE');
    assert.equal(cards.json().data.styles[0].body, 'STYLE');
    assert.equal(cards.json().data.limits.coreMaxChars, 20000);

    const bindings = await call(fixture.handler, makeRequest({ path: '/bindings' }));
    assert.equal(bindings.json().data.bindings.length, 1);
    assert.equal(bindings.json().data.bindings[0].status.valid, true);

    const updated = await call(fixture.handler, makeRequest({
      method: 'POST',
      path: `/cards/styles/${styleId}`,
      headers,
      body: { expectedRevision: 5, body: 'STYLE TWO' },
    }));
    assert.equal(updated.state.status, 200);
    assert.equal(updated.json().data.style.body, 'STYLE TWO');

    const history = await call(fixture.handler, makeRequest({
      path: `/history?cardType=style&cardId=${styleId}`,
    }));
    assert.equal(history.state.status, 200);
    assert.ok(history.json().data.history.some(entry => entry.snapshot.body === 'STYLE'));

    const copy = await call(fixture.handler, makeRequest({
      method: 'POST',
      path: `/cards/styles/${styleId}/copy`,
      headers,
      body: { expectedRevision: 6 },
    }));
    assert.equal(copy.state.status, 200);
    assert.notEqual(copy.json().data.style.id, styleId);

    const removed = await call(fixture.handler, makeRequest({
      method: 'POST',
      path: `/cards/styles/${styleId}/delete`,
      headers,
      body: { expectedRevision: 7 },
    }));
    assert.equal(removed.state.status, 200);
    assert.equal(removed.json().data.affectedCount, 1);
    assert.equal(removed.json().data.revision, 8);

    const afterDelete = await call(fixture.handler, makeRequest({ path: '/bindings' }));
    assert.equal(afterDelete.json().data.bindings[0].mode, 'inherit');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('stale revisions return 409 with the current revision', async () => {
  const fixture = await setup(OWNER);
  const headers = { 'x-amadeus-persona': '1' };
  try {
    await call(fixture.handler, makeRequest({
      method: 'POST', path: '/cards/core', headers, body: { expectedRevision: 0, body: 'one' },
    }));
    const conflict = await call(fixture.handler, makeRequest({
      method: 'POST', path: '/cards/core', headers, body: { expectedRevision: 0, body: 'two' },
    }));
    assert.equal(conflict.state.status, 409);
    const payload = conflict.json();
    assert.equal(payload.code, 'PERSONA_CONFLICT');
    assert.equal(payload.currentRevision, 1);
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('diagnostics contains no storage path, prompt text, or secret-bearing fields', async () => {
  const fixture = await setup(OWNER);
  try {
    const current = fixture.store.requireState().revision;
    await fixture.service.updateCore(current, 'SECRET PROMPT BODY');
    const response = await call(fixture.handler, makeRequest({ path: '/diagnostics' }));
    assert.equal(response.state.status, 200);
    const serialized = response.state.body;
    assert.equal(serialized.includes(fixture.directory), false);
    assert.equal(serialized.includes('SECRET PROMPT BODY'), false);
    assert.equal(serialized.includes('accessToken'), false);
    assert.equal(serialized.includes('dataDirectory'), false);
    const payload = JSON.parse(serialized);
    assert.equal(payload.data.sections.overridden, 'unverified');
    assert.equal(payload.data.sections.finalVisibility, 'unverified');
    assert.equal(payload.data.versionImpact, 'next_model_assembly');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('backup and restore work through the owner API', async () => {
  const fixture = await setup(OWNER);
  const headers = { 'x-amadeus-persona': '1' };
  try {
    await call(fixture.handler, makeRequest({
      method: 'POST', path: '/cards/core', headers, body: { expectedRevision: 0, body: 'A' },
    }));
    const backup = await call(fixture.handler, makeRequest({
      method: 'POST', path: '/backup', headers, body: { expectedRevision: 1, reason: 'before' },
    }));
    assert.equal(backup.state.status, 200);
    const backupId = backup.json().data.id;

    await call(fixture.handler, makeRequest({
      method: 'POST', path: '/cards/core', headers, body: { expectedRevision: 1, body: 'B' },
    }));
    const restored = await call(fixture.handler, makeRequest({
      method: 'POST',
      path: '/restore',
      headers,
      body: { expectedRevision: 2, backupId, confirm: 'RESTORE' },
    }));
    assert.equal(restored.state.status, 200);
    assert.equal(restored.json().data.revision, 3);

    const cards = await call(fixture.handler, makeRequest({ path: '/cards' }));
    assert.equal(cards.json().data.core.body, 'A');
    const backups = await call(fixture.handler, makeRequest({ path: '/backups' }));
    assert.ok(backups.json().data.backups.some(entry => entry.id === backupId));
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('unknown endpoints and methods return truthful fixed failures', async () => {
  const fixture = await setup(OWNER);
  try {
    const unknown = await call(fixture.handler, makeRequest({ path: '/nope' }));
    assert.equal(unknown.state.status, 404);
    assert.equal(unknown.json().code, 'PERSONA_ENDPOINT_UNKNOWN');

    const put = await call(fixture.handler, makeRequest({ method: 'PUT', path: '/overview' }));
    assert.equal(put.state.status, 405);
    assert.equal(put.json().code, 'PERSONA_METHOD_NOT_ALLOWED');
  } finally {
    await removeTempDir(fixture.directory);
  }
});
