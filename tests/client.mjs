// Client-plugin regression test: node tests/dsh/client.mjs
//
// The DSH client module must register 画板 after 对话/轨迹 only for Design mode
// sessions, keep one right-sidebar tab type, and open that tab when a new
// artifact appears.
import assert from 'node:assert/strict';

const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: 'Fragment',
  useReducer: (init) => [init(undefined), () => {}],
  useEffect: () => {},
  useState: (initial) => [initial, () => {}],
  useRef: (initial) => ({ current: initial }),
  useCallback: (fn) => fn,
};

const views = [];
const tabTypes = [];
const opened = [];
const events = { list: new Set(), current: new Set() };

const slots = {
  inject(_name, callback) {
    const dispose = callback();
    return () => {
      if (typeof dispose === 'function') dispose();
    };
  },
  register(options) {
    const entry = {
      id: options.id,
      name: options.name,
      order: options.order,
      label: options.label,
    };
    if (options.name === 'conversation.view') views.push(entry);
    return () => {
      const index = views.indexOf(entry);
      if (index >= 0) views.splice(index, 1);
    };
  },
};

let rows = {};
const sessions = {
  list: {
    getSnapshot: () => ({ byId: rows, ids: Object.keys(rows) }),
    subscribe: (listener) => {
      events.list.add(listener);
      return () => events.list.delete(listener);
    },
  },
  refreshProjections: async () => {},
};

const state = { current: undefined };
const uiSession = {
  adapter: {
    current: {
      getSnapshot: () => ({ key: state.current }),
      subscribe: (listener) => {
        events.current.add(listener);
        return () => events.current.delete(listener);
      },
    },
  },
};

const uiConversation = { binding: () => ({ activate: () => {} }) };

const cleanups = [];
const services = {
  sidebarRight: { openTab: (kind, options) => opened.push({ kind, options }) },
  sidebarRightTabs: {
    register: (definition) => {
      tabTypes.push(definition);
      return () => {
        const index = tabTypes.indexOf(definition);
        if (index >= 0) tabTypes.splice(index, 1);
      };
    },
  },
};
const ctx = {
  slots,
  sessions,
  uiSession,
  uiConversation,
  locale: { getSnapshot: () => ({ locale: 'zh' }), subscribe: () => () => {} },
  get: (name) => {
    if (services[name]) return services[name];
    if (name === 'locale') return ctx.locale;
    return undefined;
  },
  inject: (names, callback) => {
    const child = {
      sidebarRight: services.sidebarRight,
      sidebarRightTabs: services.sidebarRightTabs,
      effect: (fn) => {
        const dispose = fn();
        cleanups.push(dispose);
        return dispose;
      },
    };
    if (names.every((name) => Boolean(child[name]))) callback(child);
  },
  effect: (fn) => {
    const dispose = fn();
    cleanups.push(dispose);
    return dispose;
  },
};

let active = null;
globalThis.window = {
  __ModuleLoader__: {
    load: (definition) => {
      globalThis.__ryugiPlugin = definition;
    },
  },
};
globalThis.document = { documentElement: { lang: 'zh' } };
globalThis.fetch = async () => ({
  ok: true,
  json: async () => ({
    server: { running: true, url: 'http://127.0.0.1:27319' },
    active,
    artifacts: active ? [active] : [],
  }),
});

// The poller is throttled by wall-clock time; step a fake clock instead of sleeping.
let clock = 1_000_000;
const realNow = Date.now;
Date.now = () => clock;

await import('../client.js?v=' + Date.now());
const definition = globalThis.__ryugiPlugin;
assert.equal(definition.id, 'dsh-ryugi');
const plugin = definition.factory((name) => {
  if (name === 'react') return React;
  throw new Error('unexpected require ' + name);
});
assert.deepEqual(plugin.inject, ['slots', 'sessions', 'uiSession', 'uiConversation']);

const fire = () => {
  for (const listener of events.list) listener();
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

plugin.apply(ctx);
assert.equal(tabTypes.length, 1, 'the right-sidebar tab type is registered once');
assert.equal(tabTypes[0].kind, 'ryugi-artboard');
assert.equal(tabTypes[0].title(), '画板');

// A non-Ryugi session shows no 画板 view.
state.current = 's1';
rows = { s1: { cwd: '/p', projectionValues: { agentPreset: 'standard' } } };
fire();
await settle();
assert.equal(views.length, 0, 'other presets hide the 画板 view');

// A Design mode session shows it after 对话 (0) and 轨迹 (10).
rows = { s1: { cwd: '/p', projectionValues: { agentPreset: 'design' } } };
fire();
await settle();
assert.equal(views.length, 1, 'Design mode registers the 画板 view');
assert.equal(views[0].id, 'ryugi');
assert.equal(views[0].order, 20, '画板 follows 对话 and 轨迹');
assert.equal(views[0].label(), '画板');
assert.equal(opened.length, 0, 'the first observation does not steal focus');

// A new artifact opens the artboard in the right sidebar.
clock += 2000;
active = {
  project: '/p',
  type: 'artboard',
  id: 'demo',
  title: 'Demo',
  url: 'http://127.0.0.1:27319/artboard/demo',
};
fire();
await settle();
assert.equal(opened.length, 1, 'a new artifact opens the sidebar tab');
assert.equal(opened[0].kind, 'ryugi-artboard');

// The same artifact does not reopen it.
clock += 2000;
fire();
await settle();
assert.equal(opened.length, 1, 'an unchanged artifact does not reopen the tab');

// A second artifact does.
clock += 2000;
active = {
  project: '/p',
  type: 'document',
  id: 'spec',
  title: 'Spec',
  url: 'http://127.0.0.1:27319/document/spec',
};
fire();
await settle();
assert.equal(opened.length, 2, 'the next artifact opens the sidebar again');

// Switching back to another preset removes the view again.
state.current = 's2';
rows = {
  s1: { cwd: '/p', projectionValues: { agentPreset: 'design' } },
  s2: { cwd: '/q', projectionValues: { agentPreset: 'minimal' } },
};
fire();
await settle();
assert.equal(views.length, 0, 'leaving Design mode removes the view');

for (const dispose of cleanups) if (typeof dispose === 'function') dispose();
assert.equal(views.length, 0, 'teardown unregisters the view');
assert.equal(tabTypes.length, 0, 'teardown unregisters the tab type');

Date.now = realNow;
delete globalThis.window;
delete globalThis.document;
delete globalThis.fetch;
console.info('dsh client ok');
