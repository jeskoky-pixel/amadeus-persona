import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { homedir } from 'node:os';
import {
  apply,
  defaultDataDirectory,
  inject,
  name,
  normalizeConfig,
} from '../src/index.js';
import {
  fixedClock,
  makeAgent,
  makeRegistry,
  makeStore,
  makeTempDir,
  removeTempDir,
  seedState,
} from './helpers.js';

/**
 * @param {Record<string, any>} registry fake WorkspaceRegistry.
 * @returns {{ctx: Record<string, any>, sections: Map<string, Record<string, any>>}} fake Host.
 */
function makeCtx(registry) {
  /** @type {Map<string, Record<string, any>>} */
  const sections = new Map();
  const ctx = {
    logger: { info() {}, warn() {}, error() {} },
    workspaceRegistry: registry,
    systemPrompt: {
      section(section) {
        if (sections.has(section.name)) throw new Error('duplicate section');
        sections.set(section.name, section);
        return () => sections.delete(section.name);
      },
    },
    effect(callback) {
      return callback();
    },
    inject() {
      // The HTTP surface is optional and covered by the HTTP tests directly.
    },
    get() {
      return undefined;
    },
  };
  return { ctx, sections };
}

/**
 * @param {Map<string, Record<string, any>>} sections registered sections.
 * @param {Record<string, any>} agent assembly context agent.
 * @param {Record<string, any>[]} tools tool schemas.
 * @returns {{sections: Record<string, any>[], tools: Record<string, any>[]}} assembled shape.
 */
function assemble(sections, agent, tools) {
  const context = { agent, scope: agent };
  return {
    sections: [...sections.values()]
      .sort((left, right) => left.order - right.order)
      .map(section => ({
        name: section.name,
        text: section.text(context),
        interpolate: section.interpolate,
        complete: section.complete,
      })),
    tools: structuredClone(tools),
  };
}

test('plugin registers exactly the two required host-global sections', async () => {
  const directory = await makeTempDir();
  try {
    const { ctx, sections } = makeCtx(makeRegistry([]));
    apply(ctx, { dataDirectory: directory });
    assert.deepEqual([...sections.keys()].sort(), ['amadeus:core-persona', 'amadeus:scene-persona']);
    const core = sections.get('amadeus:core-persona');
    const scene = sections.get('amadeus:scene-persona');
    assert.equal(core.order, 10);
    assert.equal(scene.order, 20);
    assert.equal(core.interpolate, false);
    assert.equal(scene.interpolate, false);
    assert.equal(core.complete, false);
    assert.equal(scene.complete, false);
    assert.equal(typeof core.text, 'function');
    assert.equal(typeof scene.text, 'function');
  } finally {
    await removeTempDir(directory);
  }
});

test('empty install writes no data file and injects nothing', async () => {
  const directory = await makeTempDir();
  try {
    const { ctx, sections } = makeCtx(makeRegistry([]));
    apply(ctx, { dataDirectory: directory });
    assert.equal(existsSync(join(directory, 'persona.json')), false);
    const assembled = assemble(sections, makeAgent('s-empty'), []);
    assert.deepEqual(assembled.sections.map(section => section.text), ['', '']);
  } finally {
    await removeTempDir(directory);
  }
});

test('assembly injects verified Workspace content and leaves the tool set invariant', async () => {
  const directory = await makeTempDir();
  try {
    const store = makeStore(directory, { now: fixedClock() });
    await seedState(store, {
      workspaceId: 'ws-a',
      core: 'CORE PERSONA',
      styles: { gentle: { name: 'Gentle', body: 'GENTLE STYLE' } },
      defaultStyle: 'gentle',
    });
    const registry = makeRegistry([{ id: 'ws-a', sessionIds: ['s-main', 's-outside'] }]);
    const { ctx, sections } = makeCtx(registry);
    apply(ctx, { dataDirectory: directory });

    const tools = [{
      name: 'read',
      description: 'Read a file',
      parameters: { type: 'object', properties: { file: { type: 'string' } }, required: ['file'] },
    }];
    const toolsBefore = structuredClone(tools);
    const assembled = assemble(sections, makeAgent('s-main', { agentPreset: 'coding' }), tools);
    assert.deepEqual(assembled.sections.map(section => [section.name, section.text]), [
      ['amadeus:core-persona', 'CORE PERSONA'],
      ['amadeus:scene-persona', 'GENTLE STYLE'],
    ]);
    assert.deepEqual(assembled.tools, toolsBefore);
    assert.deepEqual(tools, toolsBefore);
    assert.equal(assembled.sections.some(section => section.complete === true), false);

    const outside = assemble(sections, makeAgent('s-outside-workspace'), tools);
    assert.deepEqual(outside.sections.map(section => section.text), ['', '']);
    assert.deepEqual(outside.tools, toolsBefore);
  } finally {
    await removeTempDir(directory);
  }
});

test('plugin exports the expected Cordis contract and absolute storage default', () => {
  assert.equal(name, 'amadeus-persona');
  assert.deepEqual(inject, ['systemPrompt', 'workspaceRegistry']);
  const withHome = defaultDataDirectory({ DSH_HOME: 'C:\\dsh-home' });
  assert.equal(withHome, join('C:\\dsh-home', 'amadeus-persona'));
  assert.equal(defaultDataDirectory({}), join(homedir(), '.dsh', 'amadeus-persona'));
  assert.throws(() => normalizeConfig({ dataDirectory: 'relative' }), /absolute/);
  assert.throws(() => normalizeConfig({ maxHistory: 5 }), /maxHistory/);
  assert.deepEqual(normalizeConfig({}), { dataDirectory: undefined, maxHistory: 50 });
});
