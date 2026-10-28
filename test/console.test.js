import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderClient } from '../scripts/build-client.mjs';
import { CONSOLE_HTML, CONSOLE_JS } from '../src/console-assets.js';
import {
  fixedClock,
  makeAgent,
  makeQq,
  makeRegistry,
  makeService,
  makeStore,
  makeTempDir,
  qqScene,
  removeTempDir,
} from './helpers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('package manifest declares host, client bundle, console files and build script', async () => {
  const manifest = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(manifest.name, '@amadeus/persona');
  assert.equal(manifest.main, 'src/index.js');
  assert.equal(manifest.exports['.'], './src/index.js');
  assert.equal(manifest.exports['./client'], './src/client.js');
  assert.equal(manifest.dsh.manifestVersion, 1);
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(manifest.dsh.client.platform, 'web');
  assert.deepEqual(manifest.dsh.client.inject, ['@deepseek-ai/dsh-client-ui-settings']);
  assert.equal(manifest.scripts['build:client'], 'node scripts/build-client.mjs');
  for (const included of ['src', 'scripts', 'test', 'cordis.patch.yml', 'README.md', 'docs/UI_REPORT.md']) {
    assert.ok(manifest.files.includes(included), `files must include ${included}`);
  }
  assert.equal(manifest.engines.dsh, '>=0.2.1-rc.3 <0.3.0');
});

test('native DSH settings bundle matches its source and stays health/Workspace-only', async () => {
  const source = await readFile(join(ROOT, 'src', 'client-panel.js'), 'utf8');
  const built = await readFile(join(ROOT, 'src', 'client.js'), 'utf8');
  assert.equal(built, renderClient(source));
  assert.match(built, /window\.__ModuleLoader__\.load\(\{id:'@amadeus\/persona'/);
  assert.match(built, /factory:\(require\)=>/);
  assert.match(built, /require\('react'\)/);
  assert.match(built, /ctx\.slots\.inject\('settings\.section'/);
  assert.match(built, /id: 'amadeus-persona'/);
  assert.match(built, /label: \(\) => 'Amadeus Persona'/);
  assert.match(built, /Open Persona console/);
  assert.match(built, /'\/api\/amadeus-persona'/);
  assert.match(built, /const CONSOLE_URL = API_ROOT \+ '\/console'/);
  assert.match(built, /credentials: 'same-origin'/);
  assert.match(built, /\/overview/);
  assert.match(built, /Storage health/);
  assert.match(built, /Bound Workspace/);
  assert.doesNotMatch(built, /localStorage/);
  for (const endpoint of ['/cards', '/bindings', '/diagnostics', '/backups', '/history', '/restore', '/workspace', '/default-style']) {
    assert.equal(built.includes(endpoint), false, `settings panel must not call ${endpoint}`);
  }
  assert.equal((built.match(/fetch\(/g) ?? []).length, 1);
});

test('five-page console references the real API and no browser-authoritative state', () => {
  for (const route of [
    '/overview',
    '/workspaces',
    '/cards',
    '/bindings',
    '/diagnostics',
    '/backups',
    '/history',
    '/history/rollback',
    '/cards/core',
    '/cards/styles',
    '/default-style',
    '/workspace',
    '/settings',
    '/backup',
    '/restore',
    '/bindings/delete',
  ]) {
    assert.ok(CONSOLE_JS.includes(route), `console must use ${route}`);
  }
  assert.match(CONSOLE_JS, /data-action="save-binding"/);
  assert.match(CONSOLE_JS, /data-action="delete-binding"/);
  assert.match(CONSOLE_JS, /data-action="reset-binding"/);
  assert.match(CONSOLE_JS, /data-action="save-editor"/);
  assert.match(CONSOLE_JS, /data-action="copy-style"/);
  assert.match(CONSOLE_JS, /data-action="delete-style"/);
  assert.match(CONSOLE_JS, /data-action="open-history"/);
  assert.match(CONSOLE_JS, /data-action="restore-backup"/);
  assert.match(CONSOLE_JS, /conflict-reload-keep/);
  assert.match(CONSOLE_JS, /x-amadeus-persona/);
  assert.match(CONSOLE_JS, /finalVisibility/);
  assert.match(CONSOLE_JS, /Unverified/);
  assert.match(CONSOLE_JS, /No free-form QQ id field|no free-form QQ id/);
  assert.match(CONSOLE_HTML, /<link rel="stylesheet" href="\/api\/amadeus-persona\/console\/console.css">/);
  assert.match(CONSOLE_HTML, /<script src="\/api\/amadeus-persona\/console\/console.js" defer><\/script>/);
});

test('all console data shapes and mutation paths are available through the existing service API', async () => {
  const directory = await makeTempDir();
  try {
    const registry = makeRegistry([{ id: 'ws-a', title: 'Workspace A', sessionIds: ['s-main', 's-qq'] }]);
    const store = makeStore(directory, { now: fixedClock() });
    const service = makeService({
      store,
      registry,
      qq: makeQq({ 's-qq': qqScene('group', 'bot-a', 'peer-1') }),
      headers: { 's-qq': { agentPreset: 'amadeus-qq' } },
    });

    const empty = service.overview();
    assert.equal(empty.workspaceId, null);
    assert.equal(empty.storage.status, 'ok');
    assert.equal(empty.warnings.length, 0);
    assert.equal(empty.limits.coreMaxChars, 20000);

    await service.bindWorkspace(0, 'ws-a');
    await service.updateCore(1, 'CORE');
    const created = await service.createStyle(2, {
      name: 'Calm', description: 'quiet', body: 'STYLE', color: '#123456',
    });
    const styleId = created.style.id;
    await service.setDefaultStyle(3, styleId);
    await service.upsertBinding(4, { kind: 'session', sessionId: 's-main', mode: 'style', styleId });
    await service.upsertBinding(5, {
      kind: 'qq',
      scene: { kind: 'group', botId: 'bot-a', peerId: 'peer-1' },
      mode: 'core-only',
    });
    await service.setInjectionEnabled(6, true);
    await service.updateStyle(7, styleId, { body: 'STYLE UPDATED' });

    const overview = service.overview();
    for (const key of ['revision', 'injectionEnabled', 'workspace', 'counts', 'storage', 'warnings', 'limits']) {
      assert.ok(Object.hasOwn(overview, key), `overview.${key}`);
    }
    assert.equal(overview.counts.styles, 1);
    assert.equal(overview.counts.bindings, 2);

    const workspaceData = service.listWorkspaces();
    assert.equal(workspaceData.boundWorkspaceId, 'ws-a');
    assert.equal(workspaceData.workspaces[0].sessions.length, 2);
    assert.equal(workspaceData.qq.available, true);
    assert.equal(workspaceData.qq.scenes.length, 1);
    assert.equal(workspaceData.qq.scenes[0].key, 'qq:group:bot-a:peer-1');

    const cards = service.getCards();
    assert.equal(cards.core.body, 'CORE');
    assert.equal(cards.core.token.characters, 4);
    assert.equal(cards.styles[0].token.estimatedTokens, 4);
    assert.equal(cards.limits.styleBodyMaxChars, 12000);

    const bindingsData = service.getBindings();
    assert.equal(bindingsData.bindings.length, 2);
    assert.equal(bindingsData.bindings.every(binding => binding.status.valid), true);

    const resolution = service.resolveForAssembly(makeAgent('s-main'));
    service.markSectionInvoked(resolution, 'core');
    service.markSectionInvoked(resolution, 'scene');
    const diagnostics = service.diagnostics();
    assert.equal(diagnostics.sections.configured.length, 2);
    assert.equal(diagnostics.sections.finalVisibility, 'unverified');
    assert.equal(diagnostics.sections.overridden, 'unverified');
    assert.equal(diagnostics.sections.assembled[0].coreCallback, true);
    assert.equal(diagnostics.sections.assembled[0].sceneCallback, true);
    assert.ok(Array.isArray(diagnostics.limitations));

    const history = service.getHistory('style', styleId);
    assert.ok(history.history.some(entry => entry.snapshot.body === 'STYLE'));
    const backup = await service.backup(8, 'before UI test');
    assert.match(backup.id, /^backup-/);
    const backups = await service.getBackups();
    assert.ok(backups.backups.some(entry => entry.id === backup.id));
    const restored = await service.restore(8, backup.id, 'RESTORE');
    assert.equal(restored.revision, 9);
    assert.equal(service.getCards().core.body, 'CORE');
  } finally {
    await removeTempDir(directory);
  }
});
