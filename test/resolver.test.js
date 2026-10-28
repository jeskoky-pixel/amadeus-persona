import assert from 'node:assert/strict';
import test from 'node:test';
import { PersonaService } from '../src/service.js';
import { formatPersonaSection } from '../src/section-text.js';
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
  seedState,
} from './helpers.js';

const SESSIONS = [
  's-main',
  's-other',
  's-qq-group',
  's-qq-private',
  's-qq-other',
  's-fork',
  's-sub',
  's-core-only',
  's-disabled',
  's-inherit',
  's-revoked',
  's-unverified',
];

const QQ_MAPPING = {
  's-qq-group': qqScene('group', 'bot-a', 'peer-1'),
  's-qq-private': qqScene('private', 'bot-a', 'peer-2'),
  's-qq-other': qqScene('group', 'bot-b', 'peer-1'),
  's-revoked': qqScene('group', 'bot-a', 'peer-9'),
  's-unverified': { ...qqScene('group', 'bot-a', 'peer-8'), verified: false },
};

const HEADERS = {
  's-qq-group': { agentPreset: 'amadeus-qq' },
  's-qq-private': { agentPreset: 'amadeus-qq-owner' },
  's-qq-other': { agentPreset: 'amadeus-qq' },
  's-revoked': { agentPreset: 'amadeus-qq' },
  's-unverified': { agentPreset: 'amadeus-qq' },
  's-main': { agentPreset: 'coding' },
};

/**
 * @param {{deny?: Set<string>, qq?: boolean, workspaceId?: string}} [options] setup options.
 * @returns {Promise<Record<string, any>>} fixture.
 */
async function setup(options = {}) {
  const directory = await makeTempDir();
  const registry = makeRegistry([
    { id: 'ws-a', title: 'Workspace A', sessionIds: SESSIONS },
    { id: 'ws-b', title: 'Workspace B', sessionIds: ['s-ws-b'] },
  ]);
  const qq = options.qq === false
    ? undefined
    : makeQq(QQ_MAPPING, { deny: options.deny });
  const store = makeStore(directory, { now: fixedClock() });
  const seeded = await seedState(store, {
    workspaceId: options.workspaceId ?? 'ws-a',
    core: 'CORE',
    styles: {
      gentle: { name: 'Gentle', description: 'calm', body: 'GENTLE' },
      harsh: { name: 'Harsh', description: 'direct', body: 'HARSH' },
    },
    defaultStyle: 'gentle',
    bindings: [
      { kind: 'qq', scene: { kind: 'group', botId: 'bot-a', peerId: 'peer-1' }, mode: 'style', style: 'harsh' },
      { kind: 'qq', scene: { kind: 'private', botId: 'bot-a', peerId: 'peer-2' }, mode: 'style', style: 'gentle' },
      { kind: 'session', sessionId: 's-qq-group', mode: 'style', style: 'gentle' },
      { kind: 'session', sessionId: 's-core-only', mode: 'core-only' },
      { kind: 'session', sessionId: 's-disabled', mode: 'disabled' },
      { kind: 'session', sessionId: 's-inherit', mode: 'inherit' },
      { kind: 'session', sessionId: 's-other', mode: 'style', style: 'harsh' },
    ],
  });
  const service = makeService({ store, registry, qq, headers: HEADERS });
  return { directory, registry, qq, store, seeded, service };
}

/**
 * @param {string} id Session id.
 * @returns {Record<string, any>} Agent with the matching test header.
 */
function agent(id) {
  if (id === 's-qq-group' || id === 's-qq-other' || id === 's-revoked' || id === 's-unverified') {
    return makeAgent(id, { agentPreset: 'amadeus-qq' });
  }
  if (id === 's-qq-private') return makeAgent(id, { agentPreset: 'amadeus-qq-owner' });
  if (id === 's-main') return makeAgent(id, { agentPreset: 'coding' });
  if (id === 's-fork') return makeAgent(id, { parentSession: 's-main' });
  if (id === 's-sub') return makeAgent(id, { origin: 'subagent', parentSession: 's-main' });
  return makeAgent(id);
}

test('explicit final Host probe distinguishes retained sections from complete-preset override', async () => {
  const fixture = await setup({ qq: false });
  try {
    const live = agent('s-main');
    const options = {
      store: fixture.store,
      getWorkspaceRegistry: () => fixture.registry,
      getAgent: id => id === live.id ? live : undefined,
    };
    const visible = new PersonaService({
      ...options,
      assemblePrompt: async () => ({ sections: [
        { name: 'amadeus:core-persona', text: formatPersonaSection('core', 'CORE') },
        { name: 'amadeus:scene-persona', text: formatPersonaSection('scene', 'GENTLE') },
      ] }),
    });
    assert.equal((await visible.probeFinalVisibility('s-main')).status, 'visible');
    const changedText = new PersonaService({
      ...options,
      assemblePrompt: async () => ({ sections: [
        { name: 'amadeus:core-persona', text: 'CORE' },
        { name: 'amadeus:scene-persona', text: 'GENTLE' },
      ] }),
    });
    assert.equal((await changedText.probeFinalVisibility('s-main')).status, 'overridden');
    const overridden = new PersonaService({
      ...options,
      assemblePrompt: async () => ({ sections: [{ name: 'preset:complete', text: 'private preset text' }] }),
    });
    const result = await overridden.probeFinalVisibility('s-main');
    assert.equal(result.status, 'overridden');
    assert.equal(result.coreVisible, false);
    assert.equal(JSON.stringify(result).includes('private preset text'), false);
    await assert.rejects(() => overridden.probeFinalVisibility('s-ws-b'), /Workspace/);
    assert.equal((await overridden.probeFinalVisibility('s-other')).status, 'unavailable');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('verified QQ Sessions cannot inherit a stale Session-specific style after Scene changes', async () => {
  const fixture = await setup();
  try {
    await assert.rejects(() => fixture.service.upsertBinding(fixture.store.requireState().revision, {
      kind: 'session', sessionId: 's-qq-group', mode: 'style', styleId: fixture.seeded.styleIds.gentle,
    }), /QQ Scene binding/);
    const qqKey = fixture.seeded.bindingKeys.find(key => key.includes('group') && key.includes('peer-1'));
    await fixture.service.deleteBinding(fixture.store.requireState().revision, qqKey);
    await fixture.service.setDefaultStyle(fixture.store.requireState().revision, fixture.seeded.styleIds.harsh);
    const resolved = fixture.service.resolveForAssembly(agent('s-qq-group'));
    assert.equal(resolved.source, 'workspace-default');
    assert.equal(resolved.styleText, 'HARSH');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('installed Memory raises an honest persona-card status warning without changing Memory', async () => {
  const fixture = await setup({ qq: false });
  try {
    const memory = Object.freeze({ sceneAclRead() { return null; } });
    const service = new PersonaService({
      store: fixture.store,
      getWorkspaceRegistry: () => fixture.registry,
      getMemory: () => memory,
    });
    assert.ok(service.overview().warnings.includes('PERSONA_MEMORY_CARD_STATUS_UNVERIFIED'));
    assert.ok(service.diagnostics().warnings.includes('PERSONA_MEMORY_CARD_STATUS_UNVERIFIED'));
    assert.equal(Object.hasOwn(memory, 'personaEnabled'), false);
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('ordinary Sessions and ordinary forks receive the bound Workspace default', async () => {
  const fixture = await setup();
  try {
    const main = fixture.service.resolveForAssembly(agent('s-main'));
    assert.equal(main.coreText, 'CORE');
    assert.equal(main.styleText, 'GENTLE');
    assert.equal(main.coreInjected, true);
    assert.equal(main.styleInjected, true);
    assert.equal(main.source, 'workspace-default');

    const fork = fixture.service.resolveForAssembly(agent('s-fork'));
    assert.equal(fork.coreText, 'CORE');
    assert.equal(fork.styleText, 'GENTLE');
    assert.equal(fork.reason, 'ok');

    const explicit = fixture.service.resolveForAssembly(agent('s-other'));
    assert.equal(explicit.styleText, 'HARSH');
    assert.equal(explicit.source, 'session-binding');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('subagent origin is excluded; parentSession alone is not', async () => {
  const fixture = await setup();
  try {
    const fork = fixture.service.resolveForAssembly(agent('s-fork'));
    assert.equal(fork.coreInjected, true);
    const subagent = fixture.service.resolveForAssembly(agent('s-sub'));
    assert.equal(subagent.coreText, '');
    assert.equal(subagent.styleText, '');
    assert.equal(subagent.reason, 'subagent');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('workspace isolation uses the stable Workspace id, not title or Session name', async () => {
  const fixture = await setup();
  try {
    const outside = fixture.service.resolveForAssembly(agent('s-ws-b'));
    assert.equal(outside.coreText, '');
    assert.equal(outside.reason, 'not_workspace_member');

    const current = fixture.store.requireState().revision;
    await fixture.service.bindWorkspace(current, 'ws-b');
    const oldWorkspace = fixture.service.resolveForAssembly(agent('s-main'));
    assert.equal(oldWorkspace.coreText, '');
    assert.equal(oldWorkspace.reason, 'not_workspace_member');
    const newWorkspace = fixture.service.resolveForAssembly(agent('s-ws-b'));
    assert.equal(newWorkspace.coreText, 'CORE');
    assert.equal(newWorkspace.styleText, 'GENTLE');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('two QQ Scenes resolve different styles and the key includes the bot', async () => {
  const fixture = await setup();
  try {
    const group = fixture.service.resolveForAssembly(agent('s-qq-group'));
    assert.equal(group.styleText, 'HARSH');
    assert.equal(group.source, 'qq-binding');
    assert.equal(group.qqState, 'verified');

    const privateScene = fixture.service.resolveForAssembly(agent('s-qq-private'));
    assert.equal(privateScene.styleText, 'GENTLE');
    assert.equal(privateScene.source, 'qq-binding');

    // Same peer id under bot-b has no binding, so it must not inherit bot-a's
    // group style.
    const otherBot = fixture.service.resolveForAssembly(agent('s-qq-other'));
    assert.equal(otherBot.styleText, 'GENTLE');
    assert.equal(otherBot.source, 'workspace-default');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('authorized QQ Scene can be bound before its first Session, then revocation stops injection', async () => {
  const fixture = await setup({ qq: false });
  try {
    const authorized = [{ platform: 'qq', kind: 'group', id: 'bot-a:peer-1', workspaceId: 'ws-a', authorized: true }];
    const qq = makeQq(QQ_MAPPING, { authorized });
    const service = makeService({ store: fixture.store, registry: fixture.registry, qq, headers: HEADERS });
    const discovered = service.listWorkspaces().qq.scenes.find(scene => scene.peerId === 'peer-1');
    assert.equal(discovered.status, 'session_linked');
    const preScene = { kind: 'group', botId: 'bot-a', peerId: 'peer-new' };
    authorized.push({ platform: 'qq', kind: 'group', id: 'bot-a:peer-new', workspaceId: 'ws-a', authorized: true });
    const pending = service.listWorkspaces().qq.scenes.find(scene => scene.peerId === 'peer-new');
    assert.equal(pending.sessionId, null);
    assert.equal(pending.status, 'awaiting_first_session');
    const created = await service.upsertBinding(fixture.store.requireState().revision, {
      kind: 'qq', scene: preScene, mode: 'style', styleId: fixture.seeded.styleIds.harsh,
    });
    assert.equal(created.binding.status.reason, 'awaiting_first_session');
    fixture.registry.update('ws-a', { sessionIds: [...SESSIONS, 's-new'] });
    QQ_MAPPING['s-new'] = qqScene('group', 'bot-a', 'peer-new');
    const active = service.resolveForAssembly(makeAgent('s-new', { agentPreset: 'amadeus-qq' }));
    assert.equal(active.styleText, 'HARSH');
    authorized.pop();
    assert.equal(service.resolveForAssembly(makeAgent('s-new', { agentPreset: 'amadeus-qq' })).reason, 'qq_scene_revoked');
    assert.equal(service.getBindings().bindings.find(binding => binding.key === created.binding.key).status.reason, 'qq_revoked');
  } finally {
    delete QQ_MAPPING['s-new'];
    await removeTempDir(fixture.directory);
  }
});

test('Workspace switch archives bindings, leaves core active, and restores prior owner on rollback', async () => {
  const fixture = await setup();
  try {
    const count = Object.keys(fixture.store.requireState().bindings).length;
    const switched = await fixture.service.bindWorkspace(fixture.store.requireState().revision, 'ws-b');
    assert.equal(switched.archivedBindingCount, count);
    assert.match(switched.backupId, /^backup-/);
    assert.equal(fixture.service.getBindings().bindings.length, 0);
    assert.equal(fixture.store.requireState().bindingWorkspaceId, 'ws-b');
    assert.equal(fixture.service.resolveForAssembly(agent('s-ws-b')).coreText, 'CORE');
    await fixture.service.restore(fixture.store.requireState().revision, switched.backupId, 'RESTORE');
    assert.equal(fixture.store.requireState().bindingWorkspaceId, 'ws-a');
    assert.equal(fixture.service.getBindings().bindings.length, count);
    assert.equal(fixture.service.resolveForAssembly(agent('s-qq-group')).styleText, 'HARSH');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('revoked or unverified QQ mapping fails closed even for a known QQ preset with a Session binding', async () => {
  const fixture = await setup({ deny: new Set(['s-qq-group', 's-revoked']) });
  try {
    const revoked = fixture.service.resolveForAssembly(agent('s-qq-group'));
    assert.equal(revoked.coreText, '');
    assert.equal(revoked.styleText, '');
    assert.equal(revoked.reason, 'qq_mapping_untrusted');
    assert.equal(revoked.qqState, 'invalid');

    const unverified = fixture.service.resolveForAssembly(agent('s-unverified'));
    assert.equal(unverified.coreText, '');
    assert.equal(unverified.reason, 'qq_mapping_untrusted');
    assert.equal(unverified.qqState, 'invalid');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('unavailable QQ does not block ordinary Sessions but fails closed for a known QQ preset', async () => {
  const fixture = await setup({ qq: false });
  try {
    const ordinary = fixture.service.resolveForAssembly(agent('s-main'));
    assert.equal(ordinary.coreText, 'CORE');
    assert.equal(ordinary.styleText, 'GENTLE');
    assert.equal(ordinary.qqState, 'unavailable');

    const qqPreset = fixture.service.resolveForAssembly(agent('s-qq-group'));
    assert.equal(qqPreset.coreText, '');
    assert.equal(qqPreset.reason, 'qq_mapping_untrusted');
    assert.equal(qqPreset.qqState, 'unavailable');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('inherit, core-only, style and disabled binding modes are distinct', async () => {
  const fixture = await setup();
  try {
    const inherit = fixture.service.resolveForAssembly(agent('s-inherit'));
    assert.equal(inherit.coreText, 'CORE');
    assert.equal(inherit.styleText, 'GENTLE');
    assert.equal(inherit.mode, 'style');

    const coreOnly = fixture.service.resolveForAssembly(agent('s-core-only'));
    assert.equal(coreOnly.coreText, 'CORE');
    assert.equal(coreOnly.styleText, '');
    assert.equal(coreOnly.mode, 'core-only');

    const disabled = fixture.service.resolveForAssembly(agent('s-disabled'));
    assert.equal(disabled.coreText, '');
    assert.equal(disabled.styleText, '');
    assert.equal(disabled.reason, 'binding_disabled');
    assert.equal(disabled.mode, 'disabled');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('Workspace membership is rechecked at every assembly', async () => {
  const fixture = await setup();
  try {
    assert.equal(fixture.service.resolveForAssembly(agent('s-main')).coreText, 'CORE');
    fixture.registry.removeSession('ws-a', 's-main');
    const after = fixture.service.resolveForAssembly(agent('s-main'));
    assert.equal(after.coreText, '');
    assert.equal(after.reason, 'not_workspace_member');
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('diagnostics distinguishes configured and assembled sections without prompt text or paths', async () => {
  const fixture = await setup();
  try {
    const resolution = fixture.service.resolveForAssembly(agent('s-main'));
    fixture.service.markSectionInvoked(resolution, 'core');
    fixture.service.markSectionInvoked(resolution, 'scene');
    const diagnostics = fixture.service.diagnostics();
    assert.equal(diagnostics.sections.configured.length, 2);
    assert.deepEqual(
      diagnostics.sections.configured.map(section => [section.name, section.order, section.interpolate, section.complete]),
      [
        ['amadeus:core-persona', 10, false, false],
        ['amadeus:scene-persona', 10190, false, false],
      ],
    );
    assert.equal(diagnostics.sections.overridden, 'unverified');
    assert.equal(diagnostics.sections.assembled.length, 1);
    assert.equal(diagnostics.sections.assembled[0].coreCallback, true);
    assert.equal(diagnostics.sections.assembled[0].sceneCallback, true);
    assert.equal(diagnostics.sections.assembled[0].coreInjected, true);
    const serialized = JSON.stringify(diagnostics);
    assert.equal(serialized.includes(fixture.directory), false);
    assert.equal(serialized.includes('CORE'), false);
    assert.equal(serialized.includes('GENTLE'), false);
  } finally {
    await removeTempDir(fixture.directory);
  }
});

test('binding status becomes stale when Workspace membership is removed', async () => {
  const fixture = await setup();
  try {
    const before = fixture.service.getBindings().bindings;
    const session = before.find(binding => binding.kind === 'session' && binding.sessionId === 's-other');
    assert.equal(session.status.valid, true);
    fixture.registry.removeSession('ws-a', 's-other');
    const after = fixture.service.getBindings().bindings
      .find(binding => binding.kind === 'session' && binding.sessionId === 's-other');
    assert.equal(after.status.valid, false);
    assert.equal(after.status.reason, 'not_workspace_member');
  } finally {
    await removeTempDir(fixture.directory);
  }
});
