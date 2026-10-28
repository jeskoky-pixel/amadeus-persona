import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderCatalogLiteral, renderClient, renderConsoleI18n } from '../scripts/build-client.mjs';
import { CONSOLE_HTML, CONSOLE_I18N, CONSOLE_JS } from '../src/console-assets.js';
import {
  CATALOG,
  DEFAULT_LANGUAGE,
  LANGUAGES,
  message,
} from '../src/i18n/catalog.js';
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
  for (const included of ['src', 'scripts', 'test', 'cordis.patch.yml', 'README.md', 'docs/UI_REPORT.md', 'docs/I18N_IMPLEMENTATION.md']) {
    assert.ok(manifest.files.includes(included), `files must include ${included}`);
  }
  assert.equal(manifest.engines.dsh, '>=0.2.1-rc.3 <0.3.0');
});

test('native DSH settings bundle matches its source, shared dictionary and health-only scope', async () => {
  const source = await readFile(join(ROOT, 'src', 'client-panel.js'), 'utf8');
  const built = await readFile(join(ROOT, 'src', 'client.js'), 'utf8');
  assert.equal(built, renderClient(source));
  assert.match(built, /window\.__ModuleLoader__\.load\(\{id:'@amadeus\/persona'/);
  assert.match(built, /factory:\(require\)=>/);
  assert.match(built, /require\('react'\)/);
  assert.match(built, /ctx\.slots\.inject\('settings\.section'/);
  assert.match(built, /id: 'amadeus-persona'/);
  assert.match(built, /label: \(\) => t\(readLanguage\(\), 'panel\.sectionLabel'\)/);
  assert.match(built, /const LANGUAGE_KEY = 'amadeus\.persona\.language'/);
  assert.match(built, /localStorage\.getItem\(LANGUAGE_KEY\)/);
  assert.match(built, /localStorage\.setItem\(LANGUAGE_KEY/);
  assert.equal((built.match(/localStorage/g) ?? []).length, 2);
  assert.match(built, /return DEFAULT_LANGUAGE/);
  assert.match(built, /Open Persona console/);
  assert.match(built, /打开 Persona 控制台/);
  assert.match(built, /panel\.storageHealthy/);
  assert.match(built, /panel\.storageInvalid/);
  assert.match(built, /'\/api\/amadeus-persona'/);
  assert.match(built, /const CONSOLE_URL = API_ROOT \+ '\/console'/);
  assert.match(built, /credentials: 'same-origin'/);
  assert.match(built, /\/overview/);
  assert.match(built, /Storage health/);
  assert.match(built, /Bound Workspace/);
  assert.match(built, /存储健康/);
  assert.match(built, /已绑定 Workspace/);
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
  assert.match(CONSOLE_I18N, /Unverified/);
  assert.match(CONSOLE_I18N, /No free-form QQ id field|no free-form QQ id/);
  assert.match(CONSOLE_JS, /const LANGUAGE_KEY = 'amadeus\.persona\.language'/);
  assert.match(CONSOLE_JS, /localStorage\.getItem\(LANGUAGE_KEY\)/);
  assert.match(CONSOLE_JS, /localStorage\.setItem\(LANGUAGE_KEY/);
  assert.match(CONSOLE_JS, /return DEFAULT_LANGUAGE/);
  assert.doesNotMatch(CONSOLE_JS, /navigator\.language/);
  assert.match(CONSOLE_JS, /id === 'language-select'/);
  assert.match(CONSOLE_JS, /document\.documentElement\.lang/);
  assert.match(CONSOLE_HTML, /<html lang="zh-CN"/);
  assert.match(CONSOLE_HTML, /<link rel="stylesheet" href="\/api\/amadeus-persona\/console\/console.css">/);
  assert.ok(
    CONSOLE_HTML.indexOf('/console/i18n.js') < CONSOLE_HTML.indexOf('/console/console.js'),
    'the shared dictionary must load before the console script',
  );
  assert.match(CONSOLE_HTML, /<script src="\/api\/amadeus-persona\/console\/i18n.js" defer><\/script>/);
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

test('one shared dictionary keeps zh-CN/en-US key and placeholder parity', () => {
  assert.equal(DEFAULT_LANGUAGE, 'zh-CN');
  assert.deepEqual([...LANGUAGES], ['zh-CN', 'en-US']);
  const zhKeys = Object.keys(CATALOG['zh-CN']).sort();
  const enKeys = Object.keys(CATALOG['en-US']).sort();
  assert.deepEqual(zhKeys, enKeys, 'both languages must expose exactly the same keys');
  assert.ok(zhKeys.length > 300, 'the full console and native panel must be covered');
  for (const key of zhKeys) {
    const zh = CATALOG['zh-CN'][key];
    const en = CATALOG['en-US'][key];
    assert.equal(typeof zh, 'string', `${key} zh-CN value`);
    assert.equal(typeof en, 'string', `${key} en-US value`);
    assert.ok(zh.length > 0, `${key} must not be empty in zh-CN`);
    assert.ok(en.length > 0, `${key} must not be empty in en-US`);
    const zhPlaceholders = [...zh.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    const enPlaceholders = [...en.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
    assert.deepEqual(zhPlaceholders, enPlaceholders, `${key} placeholder parity`);
  }
});

test('browser dictionary and native bundle embed the same shared catalog', async () => {
  assert.equal(CONSOLE_I18N, renderConsoleI18n());
  const source = await readFile(join(ROOT, 'src', 'client-panel.js'), 'utf8');
  const built = await readFile(join(ROOT, 'src', 'client.js'), 'utf8');
  assert.equal(built, renderClient(source));
  assert.match(CONSOLE_I18N, /window\.__AmadeusPersonaI18n/);
  assert.match(CONSOLE_I18N, /defaultLanguage: "zh-CN"/);
  assert.match(CONSOLE_I18N, /languages: Object\.freeze\(\["zh-CN","en-US"\]\)/);
  const literal = renderCatalogLiteral();
  assert.ok(CONSOLE_I18N.includes(literal), 'browser asset must embed the full shared catalog');
  assert.ok(built.includes(literal), 'native bundle must embed the full shared catalog');

  for (const key of [
    'page.overview.title',
    'page.bindings.title',
    'error.auth',
    'validate.color',
    'panel.sectionLabel',
    'settings.securityItem.qq',
  ]) {
    assert.ok(CONSOLE_I18N.includes(JSON.stringify(CATALOG['zh-CN'][key])), `browser zh-CN ${key}`);
    assert.ok(CONSOLE_I18N.includes(JSON.stringify(CATALOG['en-US'][key])), `browser en-US ${key}`);
  }
  for (const key of ['panel.storageHealthy', 'panel.error.auth', 'panel.openConsole']) {
    assert.ok(built.includes(JSON.stringify(CATALOG['en-US'][key])), `native en-US ${key}`);
  }
  assert.ok(built.includes(JSON.stringify(CATALOG['zh-CN']['panel.openConsole'])));
  assert.ok(built.includes(JSON.stringify(CATALOG['en-US']['panel.openConsole'])));
});

test('console keeps one HTML shell while all five pages share the generated dictionary', async () => {
  const files = await readdir(join(ROOT, 'src', 'console'));
  assert.deepEqual(files.filter(name => name.endsWith('.html')), ['index.html']);
  for (const asset of ['index.html', 'console.css', 'console.js', 'i18n.js']) {
    assert.ok(files.includes(asset), `src/console/${asset} must exist`);
  }
  for (const page of ['overview', 'library', 'bindings', 'diagnostics', 'settings']) {
    assert.ok(CONSOLE_JS.includes(`${page}: 'page.${page}.title'`), `${page} page title key`);
    assert.ok(CATALOG['zh-CN'][`page.${page}.title`], `${page} zh title`);
    assert.ok(CATALOG['en-US'][`page.${page}.title`], `${page} en title`);
  }
  assert.match(CONSOLE_JS, /renderOverview/);
  assert.match(CONSOLE_JS, /renderLibrary/);
  assert.match(CONSOLE_JS, /renderBindings/);
  assert.match(CONSOLE_JS, /renderDiagnostics/);
  assert.match(CONSOLE_JS, /renderSettings/);
});

test('representative zh-CN/en-US copy covers states, validation and conflict text', () => {
  const pairs = [
    ['page.overview.title', '总览', 'Overview'],
    ['page.bindings.title', '场景绑定', 'Scene Bindings'],
    ['overview.noWorkspaceBound', '尚未绑定 Workspace。', 'No Workspace is bound.'],
    ['bindings.noMatches', '没有符合筛选条件的受信任目标。', 'No trusted targets match this filter.'],
    ['bindings.selectTargetHint', '此处只显示当前受信任 Workspace 中发现的目标。没有可自由输入的 QQ ID 字段。', 'Only targets discovered from the current trusted Workspace appear here. There is no free-form QQ id field.'],
    ['diagnostics.emptyObservations', '自插件挂载以来尚未观测到模型组装。这不能证明注入成功或失败。', 'No model assembly has been observed since the plugin mounted. This is not evidence that injection works or fails.'],
    ['validate.styleNameRequired', '风格名称为必填项。', 'Style name is required.'],
    ['validate.color', '颜色必须是 #rrggbb 格式。', 'Color must be a #rrggbb value.'],
    ['toast.personaSaved', 'Persona 已保存', 'Persona saved'],
    ['error.conflict', '另一个已认证窗口更改了 Persona。请先重新加载最新修订版本再重试。', 'Another authenticated window changed Persona. Reload the latest revision before retrying.'],
    ['panel.sectionLabel', 'Amadeus 人设', 'Amadeus Persona'],
  ];
  for (const [key, zh, en] of pairs) {
    assert.equal(message('zh-CN', key), zh, `${key} zh-CN`);
    assert.equal(message('en-US', key), en, `${key} en-US`);
  }
  assert.equal(message('zh-CN', 'editor.charCount', { count: 12, max: 100 }), '12 / 100 字符');
  assert.equal(message('en-US', 'editor.charCount', { count: 12, max: 100 }), '12 / 100 characters');
  assert.equal(message('en-US', 'toast.backupCreatedDetail', { id: 'backup-x', revision: 3 }), 'Backup backup-x captured revision 3.');
  assert.match(message('zh-CN', 'modal.deleteStyleAffected.other', { count: 2 }), /2 个显式绑定/);
  assert.match(message('zh-CN', 'diagnostics.finalCheck', {
    status: '未验证（unverified）',
    reason: '正常解析',
    core: '可见',
    style: '缺失',
  }), /未验证/);
});

test('backend error codes translate to fixed safe copy in both languages', () => {
  const codes = [
    'PERSONA_AUTH_REQUIRED',
    'PERSONA_MANAGEMENT_UNAVAILABLE',
    'PERSONA_CONFLICT',
    'PERSONA_NOT_FOUND',
    'PERSONA_INVALID',
    'PERSONA_STORAGE_UNAVAILABLE',
    'PERSONA_INTERNAL',
    'PERSONA_ENDPOINT_UNKNOWN',
    'PERSONA_METHOD_NOT_ALLOWED',
    'PERSONA_WORKSPACE_UNAVAILABLE',
    'PERSONA_QQ_UNAVAILABLE',
  ];
  for (const code of codes) {
    for (const language of LANGUAGES) {
      const key = `error.code.${code}`;
      const text = message(language, key);
      assert.notEqual(text, key, `${language} must translate ${code}`);
      assert.doesNotMatch(text, /[A-Za-z]:\\|\/home\/|\/etc\/|persona\.json|storage path|secret/i, `${code} leaks internal detail`);
    }
  }
  for (const key of ['error.auth', 'error.unavailable', 'error.conflict', 'error.network', 'error.invalid']) {
    assert.notEqual(message('zh-CN', key), key);
    assert.notEqual(message('en-US', key), key);
  }
});

test('only UI language and theme preferences are persisted in browser storage', async () => {
  const storageKeys = [...CONSOLE_JS.matchAll(/localStorage\.(?:getItem|setItem)\(([A-Z_]+)/g)]
    .map(match => match[1]);
  assert.deepEqual([...new Set(storageKeys)].sort(), ['LANGUAGE_KEY', 'THEME_KEY']);
  for (const marker of [
    "const LANGUAGE_KEY = 'amadeus.persona.language'",
    'localStorage.getItem(LANGUAGE_KEY)',
    'localStorage.setItem(LANGUAGE_KEY',
  ]) {
    assert.ok(CONSOLE_JS.includes(marker), `missing ${marker}`);
  }
  assert.doesNotMatch(CONSOLE_JS, /localStorage\.(?:getItem|setItem)\(['"]amadeus\.persona\.(?:cards|bindings|workspace|config)/);
  const source = await readFile(join(ROOT, 'src', 'client-panel.js'), 'utf8');
  const built = renderClient(source);
  assert.equal((built.match(/localStorage/g) ?? []).length, 2);
});
