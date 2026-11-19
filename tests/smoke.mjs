// Host plugin smoke test: bun run tests/smoke.mjs
//
// Runs the host half against a temporary Ryugi checkout fixture and a fake
// Cordis context. Covers checkout-relative bootstrap and skills, the bundled
// tool mapping, preset registration, Team mode, the artifact routes and
// ARTIFACTS_OPEN.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apply, buildBootstrap } from '../index.js';
import { designPreset } from '../preset.cjs';
import presetText from '../preset-text.cjs';

const SKILLS = [
  'using-ryugi',
  'brainstorming',
  'artifacts',
  'executing-specs',
  'test-driven-development',
];

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-ryugi-smoke-'));
const checkout = path.join(root, 'checkout');
const project = path.join(root, 'project');
const serverDir = path.join(root, 'server');
try {
  fs.mkdirSync(project, { recursive: true });
  fs.mkdirSync(serverDir, { recursive: true });
  fs.writeFileSync(
    path.join(serverDir, 'projects.json'),
    JSON.stringify({ projects: [{ dir: project }] }),
  );

  // A minimal checkout: the using-ryugi skill and the skills scanned at start.
  for (const name of SKILLS) {
    const dir = path.join(checkout, 'skills', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'SKILL.md'),
      `---\nname: ${name}\ndescription: fixture ${name}\n---\nFIXTURE_BODY_${name}\n`,
    );
  }

  const dir = path.join(project, '.ryugi', 'artifacts', 'artboard', 'demo');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'comments.json'),
    JSON.stringify({ threads: [{ id: 1 }, { id: 2 }] }),
  );
  fs.writeFileSync(path.join(dir, 'canvas.json'), JSON.stringify({ title: 'Demo board' }));

  // Bootstrap: checkout skill body plus the mapping bundled with this package.
  const bootstrap = buildBootstrap({ skillsRoot: path.join(checkout, 'skills') });
  assert.match(bootstrap, /EXTREMELY_IMPORTANT/, 'bootstrap wrapper present');
  assert.match(bootstrap, /FIXTURE_BODY_using-ryugi/, 'checkout skill body used');
  assert.match(bootstrap, /DeepSeek Harness Tool Mapping/, 'bundled mapping used as fallback');
  assert.doesNotMatch(bootstrap, /^---/m, 'frontmatter stripped');

  // A checkout mapping wins over the bundled copy.
  const mappingDir = path.join(checkout, 'skills', 'using-ryugi', 'references');
  fs.mkdirSync(mappingDir, { recursive: true });
  fs.writeFileSync(path.join(mappingDir, 'dsh-tools.md'), 'CHECKOUT_MAPPING\n');
  const withMapping = buildBootstrap({ skillsRoot: path.join(checkout, 'skills') });
  assert.match(withMapping, /CHECKOUT_MAPPING/, 'checkout mapping wins');
  assert.doesNotMatch(withMapping, /DeepSeek Harness Tool Mapping/, 'bundled copy is not mixed in');

  // Preset text follows the UI language.
  assert.equal(presetText.preferenceIn('- id: locale\n  config:\n    preference: zh-CN'), 'zh-cn');
  assert.equal(presetText.textFor('zh-CN').name, '设计模式');
  assert.equal(presetText.textFor('en').name, 'Ryugi mode');
  const profile = path.join(root, 'profile');
  fs.mkdirSync(profile, { recursive: true });
  fs.writeFileSync(
    path.join(profile, 'cordis.patch.yml'),
    '- id: locale\n  name: "@deepseek-ai/dsh-client-locale"\n  config:\n    preference: zh\n',
  );
  assert.equal(
    presetText.localeOf({ DSH_HOME: path.join(root, 'home'), DSH_PROFILE_DIR: profile }),
    'zh',
  );
  assert.equal(designPreset('zh-CN').name, '设计模式');
  assert.ok(designPreset('zh-CN').description.length > 0);

  const listeners = {};
  const routes = {};
  const effects = [];
  const teamCalls = [];
  const registeredSkills = [];
  const registeredPresets = [];
  const presets = new Map();
  const live = new Map();
  const service = (name) => {
    if (name === 'webServer')
      return {
        register: (route) => {
          routes[route.path] = route;
          return () => {};
        },
      };
    if (name === 'agentTeams')
      return {
        isEnabled: () => false,
        setEnabled: (agent, enabled) => {
          teamCalls.push([agent.id, enabled]);
          return Promise.resolve();
        },
      };
    if (name === 'agentPresets')
      return { presetForSession: (session) => presets.get(session.id) ?? null };
    if (name === 'loader')
      return {
        entries: () => [
          {
            options: {
              id: 'locale',
              name: '@deepseek-ai/dsh-client-locale',
              config: { preference: 'en' },
            },
          },
        ],
      };
    if (name === 'agents') return { get: (id) => live.get(id) };
    throw new Error('no ' + name);
  };
  const childContext = (requests, callback) => {
    const child = {
      effect: (fn) => {
        const dispose = fn();
        effects.push(dispose);
        return dispose;
      },
      skills: {
        register: (skill) => {
          registeredSkills.push(skill);
          return () => {};
        },
      },
      agentPresets: {
        register: async (definition) => {
          registeredPresets.push(definition);
          return async () => {};
        },
      },
    };
    try {
      child.webServer = service('webServer');
    } catch {
      child.webServer = undefined;
    }
    if (requests.every((name) => Boolean(child[name]))) callback(child);
  };
  const ctx = {
    on: (name, fn) => {
      listeners[name] = fn;
    },
    effect: (fn) => effects.push(fn()),
    get: service,
    inject: (names, callback) => childContext(names, callback),
  };
  apply(ctx, { skillsRoot: path.join(checkout, 'skills'), pollMs: 50, serverDir });
  await new Promise((resolve) => setImmediate(resolve));

  const skillNames = registeredSkills.map((skill) => skill.name);
  for (const name of SKILLS) {
    assert.ok(skillNames.includes(name), 'skill registered: ' + name);
  }
  const brainstorming = registeredSkills.find((skill) => skill.name === 'brainstorming');
  assert.match(
    brainstorming?.description ?? '',
    /fixture brainstorming/,
    'description from frontmatter',
  );
  assert.match(brainstorming?.content ?? '', /FIXTURE_BODY_brainstorming/, 'body from the file');

  assert.equal(registeredPresets.length, 1, 'one preset registered');
  assert.equal(registeredPresets[0].id, 'design');
  assert.equal(registeredPresets[0].name, 'Ryugi mode');
  const hasRow = (rows, id) =>
    rows.some((row) => row.id === id || (Array.isArray(row.config) && hasRow(row.config, id)));
  assert.ok(hasRow(registeredPresets[0].plugins, 'tool-agent-team'), 'mounts the team task board');
  assert.ok(hasRow(registeredPresets[0].plugins, 'persona'), 'mounts the persona');

  assert.ok(routes['/ryugi/state'], 'state route registered');
  assert.ok(routes['/ryugi/artifacts'], 'artifacts route registered');
  assert.ok(routes['/ryugi/server'], 'server route registered');
  assert.equal(process.env.ARTIFACTS_OPEN, '0', 'browser opening suppressed');

  const makeAgent = (id, preset, extra = {}) => {
    const sections = [];
    const agent = {
      id,
      session: {
        id,
        header: { cwd: project, ...(preset ? { agentPreset: preset } : {}), ...extra },
      },
      injected: [],
      inject(message) {
        this.injected.push(message);
      },
      followup: () => {},
      ctx: {
        effect: (fn) => fn(),
        systemPrompt: {
          section: (definition) => {
            sections.push(definition);
            return () => {};
          },
        },
      },
      sections,
    };
    live.set(id, agent);
    return agent;
  };

  const agent = makeAgent('a1', 'design');
  listeners['agent/created']({ agent });
  assert.equal(agent.injected.length, 0, 'the bootstrap is not a chat message');
  assert.equal(agent.sections.length, 1, 'bootstrap registered as a prompt section');
  assert.match(agent.sections[0].text, /FIXTURE_BODY_using-ryugi/);
  assert.equal(agent.sections[0].interpolate, false);
  assert.deepEqual(teamCalls, [['a1', true]], 'Team mode enabled for the root session');

  listeners['agent-preset/selected']('a1', 'design');
  assert.equal(agent.sections.length, 1, 'selection does not duplicate the bootstrap');

  const selected = makeAgent('a2');
  listeners['agent/created']({ agent: selected });
  assert.equal(selected.sections.length, 0, 'no bootstrap before a preset is chosen');
  presets.set('a2', 'design');
  listeners['agent-preset/selected']('a2', 'design');
  assert.equal(selected.sections.length, 1, 'the selected preset registers once');
  assert.deepEqual(teamCalls.at(-1), ['a2', true]);

  const other = makeAgent('a3', 'standard');
  listeners['agent/created']({ agent: other });
  assert.equal(other.sections.length, 0, 'other presets are not injected');

  const sub = makeAgent('a4', 'design', { origin: 'subagent' });
  listeners['agent/created']({ agent: sub });
  assert.equal(sub.sections.length, 0, 'subagents skipped');
  assert.equal(teamCalls.length, 2, 'subagents never change Team mode');

  listeners['agent/created']({ agent });
  assert.equal(agent.sections.length, 1, 'restart keeps exactly one section');

  const fallback = makeAgent('a6', 'design');
  delete fallback.ctx.systemPrompt;
  listeners['agent/created']({ agent: fallback });
  assert.equal(fallback.injected.length, 1, 'fallback injects one user message');
  assert.match(fallback.injected[0].content[0].text, /FIXTURE_BODY_using-ryugi/);

  const call = (routePath, url) => {
    let body = '';
    const res = { setHeader() {}, end: (b) => (body = b), statusCode: 0 };
    routes[routePath].handler({ method: 'GET', url }, res);
    return JSON.parse(body);
  };

  const state = call('/ryugi/state', '/ryugi/state?cwd=' + encodeURIComponent(project));
  assert.equal(state.plugin.version, '0.1.0');
  assert.equal(state.artifacts[0].id, 'demo');
  assert.equal(state.artifacts[0].comments, 2);
  assert.equal(state.artifacts[0].title, 'Demo board');
  assert.equal(state.artifacts[0].url, null, 'no url while the server is down');
  assert.equal(state.server.running, false);
  assert.equal(state.active.id, 'demo', 'active artifact is the newest one');

  const artifacts = call('/ryugi/artifacts', '/ryugi/artifacts?cwd=' + encodeURIComponent(project));
  assert.equal(artifacts.artifacts.length, 1);

  const server = call('/ryugi/server', '/ryugi/server');
  assert.equal(typeof server.running, 'boolean', 'server route returns running flag');

  listeners['agent/disposed']({ agent });
  for (const dispose of effects) if (typeof dispose === 'function') dispose();
  console.info('dsh-ryugi smoke ok');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
