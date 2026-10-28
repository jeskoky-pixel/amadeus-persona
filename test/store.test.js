import assert from 'node:assert/strict';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import {
  fixedClock,
  makeRegistry,
  makeService,
  makeStore,
  makeTempDir,
  removeTempDir,
} from './helpers.js';
import { LIMITS } from '../src/validation.js';

test('persistence reloads the validated revisioned document', async () => {
  const directory = await makeTempDir();
  try {
    const store = makeStore(directory, { now: fixedClock() });
    const service = makeService({ store, registry: makeRegistry([]) });
    await service.updateCore(0, 'Core SOUL v1');
    await service.createStyle(1, { name: 'Gentle', description: 'calm', body: 'STYLE BODY' });
    await service.setDefaultStyle(2, service.getCards().styles[0].id);

    const reloaded = makeStore(directory);
    const state = reloaded.requireState();
    assert.equal(state.revision, 3);
    assert.equal(state.core.body, 'Core SOUL v1');
    assert.equal(Object.keys(state.styles).length, 1);
    assert.equal(state.defaultStyleId, Object.keys(state.styles)[0]);
    assert.equal(reloaded.health().status, 'ok');
    assert.equal(reloaded.health().filePresent, true);

    const raw = JSON.parse(await readFile(join(directory, 'persona.json'), 'utf8'));
    assert.equal(raw.revision, 3);
    assert.ok(Array.isArray(raw.history));
  } finally {
    await removeTempDir(directory);
  }
});

test('optimistic conflict rejects the stale writer and leaves one committed file', async () => {
  const directory = await makeTempDir();
  try {
    const store = makeStore(directory, { now: fixedClock() });
    const service = makeService({ store, registry: makeRegistry([]) });
    const first = await service.updateCore(0, 'one');
    assert.equal(first.revision, 1);

    const results = await Promise.allSettled([
      service.updateCore(1, 'two'),
      service.updateCore(1, 'three'),
    ]);
    const fulfilled = results.filter(result => result.status === 'fulfilled');
    const rejected = results.filter(result => result.status === 'rejected');
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(rejected[0].reason.code, 'PERSONA_CONFLICT');
    assert.equal(rejected[0].reason.currentRevision, 2);
    assert.equal(rejected[0].reason.status, 409);

    const committed = JSON.parse(await readFile(join(directory, 'persona.json'), 'utf8'));
    assert.equal(committed.revision, 2);
    assert.equal(committed.core.body, fulfilled[0].value.core.body);
    assert.equal(store.requireState().revision, 2);
  } finally {
    await removeTempDir(directory);
  }
});

test('history exposes prior card versions and rollback creates a new revision', async () => {
  const directory = await makeTempDir();
  try {
    const store = makeStore(directory, { now: fixedClock() });
    const service = makeService({ store, registry: makeRegistry([]) });
    await service.updateCore(0, 'one');
    await service.updateCore(1, 'two');

    const history = service.getHistory('core', null);
    assert.ok(history.history.length >= 2);
    const previous = history.history.find(entry => entry.snapshot.body === 'one');
    assert.ok(previous !== undefined);
    assert.equal(previous.action, 'core.update');

    const rolled = await service.rollback(2, {
      cardType: 'core',
      cardId: null,
      historyId: previous.historyId,
    });
    assert.equal(rolled.revision, 3);
    assert.equal(rolled.core.body, 'one');
    assert.equal(service.getCards().core.body, 'one');

    const after = service.getHistory('core', null);
    assert.equal(after.history[0].action, 'core.rollback');
    assert.equal(after.history[0].snapshot.body, 'two');
  } finally {
    await removeTempDir(directory);
  }
});

test('style copy, delete cascade, default reset, and retained history', async () => {
  const directory = await makeTempDir();
  try {
    const store = makeStore(directory, { now: fixedClock() });
    const registry = makeRegistry([{ id: 'ws-a', sessionIds: ['s-1'] }]);
    const service = makeService({ store, registry });
    await service.bindWorkspace(0, 'ws-a');
    const created = await service.createStyle(1, { name: 'Gentle', body: 'GENTLE BODY' });
    const styleId = created.style.id;
    await service.setDefaultStyle(2, styleId);
    await service.upsertBinding(3, { kind: 'session', sessionId: 's-1', mode: 'style', styleId });

    const copy = await service.copyStyle(4, styleId);
    assert.notEqual(copy.style.id, styleId);
    assert.equal(copy.style.name, 'Gentle (copy)');
    assert.equal(copy.style.body, 'GENTLE BODY');
    assert.equal(copy.style.revision, 1);

    const deleted = await service.deleteStyle(5, styleId);
    assert.equal(deleted.affectedCount, 1);
    assert.equal(deleted.defaultStyleReset, true);
    assert.equal(deleted.revision, 6);
    const cards = service.getCards();
    assert.equal(cards.styles.some(style => style.id === styleId), false);
    assert.equal(cards.defaultStyleId, null);
    const binding = service.getBindings().bindings[0];
    assert.equal(binding.mode, 'inherit');
    assert.equal(binding.styleId, null);
    const history = service.getHistory('style', styleId);
    assert.ok(history.history.some(entry => entry.snapshot.body === 'GENTLE BODY'));
    assert.deepEqual(await readdir(join(directory, 'styles')), [`${copy.style.id}.md`]);
  } finally {
    await removeTempDir(directory);
  }
});

test('bounded text, explicit errors, and token warning metadata', async () => {
  const directory = await makeTempDir();
  try {
    const store = makeStore(directory, { now: fixedClock() });
    const service = makeService({ store, registry: makeRegistry([]) });
    await assert.rejects(
      service.updateCore(0, 'x'.repeat(LIMITS.CORE_MAX_CHARS + 1)),
      error => error.code === 'PERSONA_INVALID' && /too large/.test(error.message),
    );
    assert.equal(store.requireState().revision, 0);

    await service.updateCore(0, 'core');
    await assert.rejects(
      service.createStyle(1, { name: 'Large', body: 'y'.repeat(LIMITS.STYLE_BODY_MAX_CHARS + 1) }),
      error => error.code === 'PERSONA_INVALID' && /too large/.test(error.message),
    );
    await assert.rejects(
      service.createStyle(1, { name: 'a'.repeat(LIMITS.STYLE_NAME_MAX_CHARS + 1), body: 'body' }),
      error => error.code === 'PERSONA_INVALID' && /too large/.test(error.message),
    );
    await assert.rejects(
      service.createStyle(1, { name: 'Bad color', body: 'body', color: 'red' }),
      error => error.code === 'PERSONA_INVALID' && /#rrggbb/.test(error.message),
    );

    const warned = await service.createStyle(1, {
      name: 'Long but valid',
      body: 'a'.repeat(9000),
    });
    assert.equal(warned.style.token.tokenWarning, true);
    assert.ok(warned.style.token.estimatedTokens > LIMITS.STYLE_WARN_TOKENS);
    assert.deepEqual(warned.style.warnings, ['PERSONA_TOKEN_WARNING']);
  } finally {
    await removeTempDir(directory);
  }
});

test('backup and restore keep a safety backup and prior history', async () => {
  const directory = await makeTempDir();
  try {
    const store = makeStore(directory, { now: fixedClock() });
    const registry = makeRegistry([{ id: 'ws-a', sessionIds: ['s-1'] }]);
    const service = makeService({ store, registry });
    await service.bindWorkspace(0, 'ws-a');
    await service.updateCore(1, 'A');
    const revision = store.requireState().revision;
    const backup = await service.backup(revision, 'before edit');
    assert.equal(backup.revision, revision);
    assert.match(backup.id, /^backup-/);

    await service.updateCore(revision, 'B');
    const restored = await service.restore(store.requireState().revision, backup.id, 'RESTORE');
    assert.equal(restored.core, undefined);
    assert.equal(restored.revision, revision + 2);
    assert.equal(store.requireState().core.body, 'A');
    assert.equal(store.requireState().revision, revision + 2);

    const backups = await service.getBackups();
    assert.ok(backups.backups.some(entry => entry.id === backup.id));
    const safety = backups.backups.find(entry => entry.id === restored.safetyBackupId);
    assert.ok(safety !== undefined);
    assert.equal(safety.reason, 'pre-restore');
    assert.ok(store.requireState().history.some(entry => entry.action === 'restore'));

    await assert.rejects(
      service.restore(store.requireState().revision, backup.id, 'yes'),
      error => error.code === 'PERSONA_INVALID',
    );
    await assert.rejects(
      service.restore(store.requireState().revision, 'backup-missing.json', 'RESTORE'),
      error => error.code === 'PERSONA_NOT_FOUND',
    );
  } finally {
    await removeTempDir(directory);
  }
});

test('invalid storage fails closed without overwriting the corrupt file', async () => {
  const directory = await makeTempDir();
  try {
    const target = join(directory, 'persona.json');
    const corrupt = '{ this is not valid json';
    await writeFile(target, corrupt, 'utf8');
    const store = makeStore(directory);
    assert.equal(store.health().status, 'invalid');
    assert.equal(store.health().code, 'PERSONA_STORAGE_INVALID');
    assert.throws(() => store.requireState(), error => error.code === 'PERSONA_STORAGE_UNAVAILABLE');
    const service = makeService({ store, registry: makeRegistry([]) });
    await assert.rejects(
      service.updateCore(0, 'must not overwrite'),
      error => error.code === 'PERSONA_STORAGE_UNAVAILABLE',
    );
    assert.equal(await readFile(target, 'utf8'), corrupt);
  } finally {
    await removeTempDir(directory);
  }
});

test('no atomic-write temp files survive committed mutations', async () => {
  const directory = await makeTempDir();
  try {
    const store = makeStore(directory, { now: fixedClock() });
    const service = makeService({ store, registry: makeRegistry([]) });
    await service.updateCore(0, 'one');
    await service.createStyle(1, { name: 'Style', body: 'body' });
    await service.backup(store.requireState().revision, 'check');
    const names = await readdir(directory);
    assert.equal(names.some(name => name.endsWith('.tmp')), false);
    assert.deepEqual(names.sort(), ['SOUL.md', 'backups', 'persona.json', 'styles']);
    assert.equal(await readFile(join(directory, 'SOUL.md'), 'utf8'), 'one');
    const styleFiles = await readdir(join(directory, 'styles'));
    assert.equal(styleFiles.length, 1);
    assert.match(styleFiles[0], /^style-[0-9a-f-]{36}\.md$/);
    assert.equal(await readFile(join(directory, 'styles', styleFiles[0]), 'utf8'), 'body');
  } finally {
    await removeTempDir(directory);
  }
});
