import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRESET = 'design';
const BUNDLED_TOOLS = path.join(HERE, 'assets', 'dsh-tools.md');
const SKILL_MARKER = path.join('using-ryugi', 'SKILL.md');
const MARKER = '<!-- ryugi-bootstrap -->';
const ARTIFACT_TYPES = ['artboard', 'document', 'whiteboard', 'slides', 'html', 'verify', 'report'];
const DEFAULT_SERVER_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.ryugi',
  'server',
);
const requireHere = createRequire(import.meta.url);
const { designPreset } = requireHere('./preset.cjs');
const presetTextModule = requireHere('./preset-text.cjs');

const VERSION = (() => {
  try {
    return JSON.parse(readText(path.join(HERE, 'package.json'))).version ?? null;
  } catch {
    return null;
  }
})();

// Ryugi's launcher opens a system browser by default. Inside DSH the artboard
// lives in the 画板 view and the right sidebar, so the CLI must never take over
// the desktop browser. ARTIFACTS_OPEN=0 is the CLI's own switch; it also covers
// commands the model writes without --no-open.
if (process.env.ARTIFACTS_OPEN === undefined) process.env.ARTIFACTS_OPEN = '0';

function userMessage(text) {
  return {
    id: randomUUID(),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  };
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function readJson(file) {
  try {
    return JSON.parse(readText(file));
  } catch {
    return null;
  }
}

/** Whether a directory is a skills root this plugin can read. */
export function isSkillsRoot(dir) {
  return typeof dir === 'string' && dir !== '' && fs.existsSync(path.join(dir, SKILL_MARKER));
}

function expandHome(entry, env) {
  return entry.replace(/^~(?=\/|$)/, env.HOME || os.homedir());
}

/** The skills root DSH itself scans for the current user. */
export function agentsSkillsRoot(env = process.env) {
  const home = env.HOME || os.homedir();
  const agents = env.DSH_AGENTS_HOME || path.join(home, '.agents');
  return path.join(path.resolve(expandHome(agents, env)), 'skills');
}

/**
 * Candidate skills directories, most specific first: the configured root, the
 * environment, then either explicit candidates or DSH's own root followed by
 * the checkout that contains this package (or one named by config/environment).
 * @param {object} [config] plugin config
 * @param {object} [env] environment to read
 * @param {string[]} [candidates] replacements for the built-in locations
 */
export function candidateSkillsRoots(config = {}, env = process.env, candidates) {
  const list = [];
  if (typeof config.skillsRoot === 'string' && config.skillsRoot) list.push(config.skillsRoot);
  if (typeof env.DSH_RYUGI_SKILLS === 'string' && env.DSH_RYUGI_SKILLS) {
    list.push(env.DSH_RYUGI_SKILLS);
  }
  if (Array.isArray(candidates)) {
    list.push(...candidates);
    return list;
  }
  list.push(agentsSkillsRoot(env));
  const checkouts = [];
  if (typeof config.ryugiRoot === 'string' && config.ryugiRoot) checkouts.push(config.ryugiRoot);
  for (const key of ['DSH_RYUGI_ROOT', 'RYUGI_ROOT']) {
    if (typeof env[key] === 'string' && env[key]) checkouts.push(env[key]);
  }
  // Installed inside a checkout, as <repo>/.dsh-plugin.
  checkouts.push(path.resolve(HERE, '..'));
  for (const root of checkouts) list.push(path.join(expandHome(root, env), 'skills'));
  return list;
}

/**
 * Find the skills root that supplies using-ryugi, the workflow skills and the
 * comment watch. Nothing is written; a missing root only disables the
 * bootstrap, skills and feedback, while the Artboard surfaces keep working.
 * @param {{config?: object, env?: object, candidates?: string[]}} [options]
 * @returns {{root: string|undefined, searched: string[]}}
 */
export function resolveSkillsRoot({ config = {}, env = process.env, candidates } = {}) {
  const searched = [];
  const seen = new Set();
  for (const entry of candidateSkillsRoots(config, env, candidates)) {
    if (typeof entry !== 'string' || entry === '') continue;
    const dir = path.resolve(expandHome(entry, env));
    if (seen.has(dir)) continue;
    seen.add(dir);
    searched.push(dir);
    if (isSkillsRoot(dir)) return { root: dir, searched };
  }
  return { root: undefined, searched };
}

/**
 * DSH registers the skills it finds under ~/.agents/skills itself, so the
 * plugin must not register them a second time. A checkout is not one of DSH's
 * roots, so there the plugin registers the skills itself.
 */
export function shouldRegisterSkills(skillsRoot, env = process.env) {
  if (!skillsRoot) return false;
  return path.resolve(skillsRoot) !== path.resolve(agentsSkillsRoot(env));
}

/**
 * The bootstrap for one Ryugi mode session: using-ryugi plus the DSH tool
 * mapping. The mapping comes from the skills root when it carries one and from
 * this package otherwise, so a standalone install still works.
 * @param {{skillsRoot?: string, mapping?: string}} [options]
 */
export function buildBootstrap({ skillsRoot, mapping } = {}) {
  if (!skillsRoot) return '';
  const skill = readText(path.join(skillsRoot, 'using-ryugi', 'SKILL.md'))
    .replace(/^---[\s\S]*?\n---\n?/, '')
    .trim();
  if (!skill) return '';
  const fromCheckout = readText(
    path.join(skillsRoot, 'using-ryugi', 'references', 'dsh-tools.md'),
  ).trim();
  const explicit = typeof mapping === 'string' && mapping.trim() !== '' ? mapping.trim() : '';
  const tools = explicit || fromCheckout || readText(BUNDLED_TOOLS).trim();
  const open = '<EXTREMELY_IMPORTANT>';
  const close = '</EXTREMELY_IMPORTANT>';
  return `${MARKER}
${open}
You have Ryugi.

**The using-ryugi skill content is included below. It is ALREADY LOADED - you are currently following it. Do NOT use the skill tool to load "using-ryugi" again - that would be redundant.**

${skill}
${tools ? `\n${tools}` : ''}
${close}`;
}

function projectOf(ctx, agent) {
  const header = agent.session?.header;
  if (header?.cwd) return header.cwd;
  try {
    return ctx.get('workingDirectory').get(agent.session);
  } catch {
    return '';
  }
}

function artifactTitle(dir, id) {
  const canvas = readJson(path.join(dir, 'canvas.json'));
  const title = canvas && typeof canvas.title === 'string' ? canvas.title.trim() : '';
  return title || id;
}

function commentCount(dir) {
  const raw = readJson(path.join(dir, 'comments.json'));
  const threads = Array.isArray(raw) ? raw : raw?.threads;
  return Array.isArray(threads) ? threads.length : 0;
}

export function listArtifacts(project) {
  const out = [];
  if (!project) return out;
  const base = path.join(project, '.ryugi', 'artifacts');
  for (const type of ARTIFACT_TYPES) {
    let ids;
    try {
      ids = fs.readdirSync(path.join(base, type));
    } catch {
      continue;
    }
    for (const id of ids) {
      const dir = path.join(base, type, id);
      let stat;
      try {
        stat = fs.statSync(dir);
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;
      out.push({
        project,
        type,
        id,
        title: artifactTitle(dir, id),
        mtime: stat.mtimeMs,
        comments: commentCount(dir),
      });
    }
  }
  return out;
}

/** Projects the machine's Ryugi server already registered, so the view works before an agent runs. */
export function registeredProjects(serverDir) {
  const data = readJson(path.join(serverDir, 'projects.json'));
  const rows = Array.isArray(data) ? data : data?.projects;
  if (!Array.isArray(rows)) return [];
  const out = [];
  for (const row of rows) {
    if (typeof row === 'string') {
      out.push({ dir: row, lastUsedAt: 0 });
      continue;
    }
    if (row && typeof row.dir === 'string' && row.dir.length > 0) {
      out.push({ dir: row.dir, lastUsedAt: Number(row.lastUsedAt) || 0 });
    }
  }
  return out;
}

/**
 * The single machine server serves one project root at a time: the one started
 * last. An artifact URL for any other project would 404 inside the webview, so
 * only the last-used project gets an embeddable URL.
 */
export function activeProject(known) {
  let best;
  for (const row of known) {
    if (best === undefined || row.lastUsedAt > best.lastUsedAt) best = row;
  }
  return best === undefined ? undefined : best.dir;
}

export function readServer(serverDir) {
  const info = readJson(path.join(serverDir, 'server-info'));
  if (!info || typeof info.url !== 'string' || !info.url) return { running: false };
  const key = readText(path.join(serverDir, 'key')).trim();
  let alive = true;
  if (info.pid) {
    try {
      process.kill(info.pid, 0);
    } catch {
      alive = false;
    }
  }
  return {
    running: alive,
    url: info.url.replace(/\/+$/, ''),
    port: info.port,
    version: info.version,
    key,
  };
}

export function artifactUrl(server, type, id) {
  if (!server.running || !server.url) return null;
  if (!type || !id) return server.url + '/';
  const suffix = server.key ? '?key=' + encodeURIComponent(server.key) : '';
  return server.url + '/' + encodeURIComponent(type) + '/' + encodeURIComponent(id) + suffix;
}

function belongsTo(item, cwd) {
  if (!cwd) return true;
  const a = item.project.replace(/\/+$/, '');
  const b = cwd.replace(/\/+$/, '');
  return a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep);
}

export function collectState({ serverDir, projects, cwd }) {
  const server = readServer(serverDir);
  const known = registeredProjects(serverDir);
  const serving = activeProject(known) || cwd;
  const dirs = new Set(projects);
  for (const row of known) dirs.add(row.dir);
  if (cwd) dirs.add(cwd);
  const seen = new Set();
  const items = [];
  for (const dir of dirs) {
    for (const item of listArtifacts(dir)) {
      const key = item.project + '::' + item.type + '::' + item.id;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }
  items.sort((a, b) => b.mtime - a.mtime);
  const scoped = cwd ? items.filter((item) => belongsTo(item, cwd)) : items;
  const rows = (scoped.length > 0 ? scoped : items).map((item) => ({
    ...item,
    url: !serving || item.project === serving ? artifactUrl(server, item.type, item.id) : null,
  }));
  return {
    plugin: { version: VERSION },
    server: { running: server.running, url: server.url ?? null, version: server.version ?? null },
    active: rows[0] ?? null,
    artifacts: rows,
  };
}

function sendJson(res, payload) {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function parseSkill(text, fallbackName) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { name: fallbackName, description: '', content: text };
  const fields = {};
  let last;
  for (const raw of match[1].split('\n')) {
    const line = raw.replace(/\r$/, '');
    const colon = line.indexOf(':');
    if (colon > 0 && !/^\s/.test(line)) {
      const key = line.slice(0, colon).trim();
      const value = line.slice(colon + 1).trim();
      fields[key] = /^(?:>[+-]?|\|[+-]?)$/.test(value) ? '' : value;
      last = key;
    } else if (last && line.trim() !== '') {
      fields[last] = `${fields[last]} ${line.trim()}`.trim();
    }
  }
  const unquote = (value) => String(value || '').replace(/^(["'])([\s\S]*)\1$/, '$2');
  return {
    name: unquote(fields.name) || fallbackName,
    description: unquote(fields.description),
    content: match[2].trim(),
  };
}

/**
 * Register a checkout's skills with the Host skill registry. A preset row
 * cannot resolve them with a filesystem provider, because its \`!!js\`
 * expressions evaluate against the profile rather than this package; the
 * registration happens here, against the configured skills root.
 */
export function registerSkills(ctx, skillsRoot) {
  if (!skillsRoot) return 0;
  const dir = skillsRoot;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const file = path.join(dir, entry.name, 'SKILL.md');
    const text = readText(file);
    if (!text) continue;
    const skill = parseSkill(text, entry.name);
    if (!skill.description) continue;
    try {
      ctx.skills.register({
        name: skill.name,
        description: skill.description,
        content: skill.content,
        source: file,
      });
      count += 1;
    } catch (error) {
      ctx.logger?.warn?.(
        'ryugi: cannot register skill ' + skill.name + ': ' + (error?.message ?? error),
      );
    }
  }
  return count;
}

export function apply(ctx, config = {}) {
  const pollMs = Number(config.pollMs) > 0 ? Number(config.pollMs) : 1000;
  const serverDir =
    typeof config.serverDir === 'string' && config.serverDir
      ? config.serverDir
      : DEFAULT_SERVER_DIR;
  const resolution = resolveSkillsRoot({ config });
  const skillsRoot = resolution.root;
  if (!skillsRoot) {
    ctx.logger?.warn?.(
      'ryugi: no Ryugi skills root found; set config.skillsRoot or DSH_RYUGI_SKILLS, or install the skills into ~/.agents/skills. Searched: ' +
        resolution.searched.join(', '),
    );
  }
  const watchFile = skillsRoot
    ? path.join(skillsRoot, 'artifacts', 'app', 'comment-watch.cjs')
    : undefined;
  const projects = new Set();
  const bootstrapped = new Set();
  const teamEnabled = new Set();
  const runners = new Map();

  // Register the Ryugi mode preset with the registry. A bundle-patch preset row
  // keeps its own config verbatim for the child rows it carries, so a '!!js'
  // display name never reaches the preset schema; registering the definition
  // here lets the name follow the UI language and refresh when it changes.
  try {
    ctx.inject(['agentPresets'], (child) => {
      let dispose;
      let registeredName;
      let running = false;
      let stopped = false;
      // The live locale row is the authority on a running profile: the desktop
      // app boots a profile directory without naming it in the environment, so
      // reading the Loader's locale row beats scanning patch files.
      const localeOf = () => {
        let fromLoader;
        try {
          const entries = ctx.get('loader')?.entries?.() ?? [];
          for (const entry of entries) {
            const options = entry?.options;
            if (!options || typeof options.name !== 'string') continue;
            if (!options.name.includes('dsh-client-locale')) continue;
            const preference = options.config?.preference;
            if (typeof preference === 'string' && preference.length > 0) fromLoader = preference;
          }
        } catch {
          // Fall through to the profile patch files.
        }
        return fromLoader ?? presetTextModule.localeOf();
      };
      const sync = async () => {
        if (running || stopped) return;
        running = true;
        try {
          const text = presetTextModule.textFor(localeOf());
          if (text.name === registeredName) return;
          const previous = dispose;
          dispose = undefined;
          registeredName = undefined;
          if (previous) await previous();
          const next = await child.agentPresets.register(designPreset(localeOf()));
          if (stopped) {
            await next();
            return;
          }
          dispose = next;
          registeredName = text.name;
        } catch (error) {
          child.logger?.warn?.('ryugi: preset registration failed: ' + (error?.message ?? error));
        } finally {
          running = false;
        }
      };
      // The locale preference is a profile file the client rewrites; polling it
      // turns a language switch into a renamed preset.
      const timer = setInterval(() => {
        void sync();
      }, 5000);
      timer.unref?.();
      void sync();
      child.effect(
        () => () => {
          stopped = true;
          clearInterval(timer);
          const previous = dispose;
          dispose = undefined;
          if (previous) Promise.resolve(previous()).catch(() => {});
        },
        'ryugi: design preset',
      );
    });
  } catch (error) {
    ctx.logger?.warn?.('ryugi: preset registry unavailable: ' + (error?.message ?? error));
  }

  // The skill registry is a Host service: register the checkout's skills as
  // soon as it is available and unregister them with this plugin.
  try {
    ctx.inject(['skills'], (child) => {
      child.effect(() => {
        if (shouldRegisterSkills(skillsRoot)) registerSkills(child, skillsRoot);
      }, 'ryugi: skill registration');
    });
  } catch (error) {
    ctx.logger?.warn?.('ryugi: skills unavailable: ' + (error?.message ?? error));
  }

  let watchApi = null;
  const loadWatch = () => {
    if (watchApi) return watchApi;
    if (!watchFile) {
      watchApi = { createCommentWatch: null, wakeMessage: null };
      return watchApi;
    }
    try {
      watchApi = createRequire(watchFile)(watchFile);
    } catch (error) {
      ctx.logger?.warn?.('ryugi: cannot load ' + watchFile + ': ' + (error?.message ?? error));
      watchApi = { createCommentWatch: null, wakeMessage: null };
    }
    return watchApi;
  };

  /**
   * The preset a session actually runs. The Session header only carries one the
   * caller named; the preset registry resolves the default too, and a selection
   * made after creation only reaches it.
   */
  function presetOf(agent) {
    try {
      const registry = ctx.get('agentPresets');
      if (registry && typeof registry.presetForSession === 'function') {
        const id = registry.presetForSession(agent.session);
        if (typeof id === 'string' && id.length > 0) return id;
      }
    } catch {
      // Compositions without the preset registry fall back to the Session header.
    }
    const header = agent.session?.header;
    return typeof header?.agentPreset === 'string' ? header.agentPreset : undefined;
  }

  function startPoller(agent) {
    if (runners.has(agent.id)) return;
    const state = { project: '', poll: null, busy: false };
    const sessionKey = 'dsh:' + agent.id;
    const tick = () => {
      if (state.busy) return;
      state.busy = true;
      try {
        const project = projectOf(ctx, agent);
        const api = loadWatch();
        if (!project || !api.createCommentWatch || !api.wakeMessage) return;
        projects.add(project);
        if (project !== state.project) {
          state.project = project;
          state.poll = api.createCommentWatch(project, sessionKey);
        }
        const previous = process.env.ELECTRON_RUN_AS_NODE;
        process.env.ELECTRON_RUN_AS_NODE = '1';
        let events = [];
        try {
          events = state.poll(undefined) || [];
        } finally {
          if (previous === undefined) delete process.env.ELECTRON_RUN_AS_NODE;
          else process.env.ELECTRON_RUN_AS_NODE = previous;
        }
        const lines = events.map((event) => api.wakeMessage(event, 500)).filter(Boolean);
        if (lines.length) agent.followup(userMessage(lines.join('\n\n')));
      } catch (error) {
        ctx.logger?.warn?.('ryugi: poll failed: ' + (error?.message ?? error));
      } finally {
        state.busy = false;
      }
    };
    const timer = setInterval(tick, pollMs);
    timer.unref?.();
    runners.set(agent.id, () => clearInterval(timer));
  }

  /**
   * Put the bootstrap in front of the model for one Ryugi mode session. It is
   * a system-prompt section scoped to that agent rather than a user message,
   * so it never appears in the transcript, never becomes the session title,
   * and survives compaction without being re-sent as chat history.
   */
  function registerBootstrap(agent) {
    if (bootstrapped.has(agent.id)) return;
    const text = buildBootstrap({ skillsRoot });
    if (!text) return;
    const prompt = agent.ctx?.systemPrompt;
    if (prompt && typeof prompt.section === 'function') {
      agent.ctx.effect(
        () => prompt.section({ name: 'ryugi:bootstrap', order: 60, text, interpolate: false }),
        'ryugi: bootstrap section',
      );
      bootstrapped.add(agent.id);
      return;
    }
    // Compositions without the system-prompt service fall back to a user
    // message, which the session log and title then show as usual.
    agent.inject(userMessage(text));
    bootstrapped.add(agent.id);
  }

  /**
   * Ryugi mode hands work to an agent team, so the root Session's Team
   * selection is switched on when the Session starts. A user's own choice
   * already saved on the Session wins: nothing is written when a selection
   * exists.
   */
  function enableTeam(agent) {
    if (teamEnabled.has(agent.id)) return;
    let teams;
    try {
      teams = ctx.get('agentTeams');
    } catch {
      return;
    }
    if (!teams || typeof teams.setEnabled !== 'function') return;
    let enabled;
    try {
      enabled = teams.isEnabled(agent);
    } catch {
      return;
    }
    teamEnabled.add(agent.id);
    if (enabled) return;
    Promise.resolve(teams.setEnabled(agent, true)).catch((error) => {
      ctx.logger?.warn?.('ryugi: cannot enable Team mode: ' + (error?.message ?? error));
    });
  }

  /**
   * Apply the Ryugi mode behavior to one agent. A session can be created
   * before its preset is selected, so creation and selection both land here;
   * the per-session sets keep either from repeating work.
   */
  function activate(agent) {
    const header = agent.session?.header;
    if (!header || header.origin === 'subagent') return false;
    if (presetOf(agent) !== PRESET) return false;
    registerBootstrap(agent);
    enableTeam(agent);
    startPoller(agent);
    const project = projectOf(ctx, agent);
    if (project) projects.add(project);
    return true;
  }

  ctx.on('agent/created', function (payload) {
    activate(payload.agent);
  });

  ctx.on('agent-preset/selected', function (sessionId, agentPreset) {
    if (agentPreset !== PRESET) return;
    let agent;
    try {
      agent = ctx.get('agents')?.get(sessionId);
    } catch {
      agent = undefined;
    }
    if (agent) activate(agent);
  });

  ctx.on('agent/disposed', function ({ agent }) {
    const stop = runners.get(agent.id);
    if (stop) stop();
    runners.delete(agent.id);
    bootstrapped.delete(agent.id);
    teamEnabled.delete(agent.id);
  });

  ctx.effect(() => () => {
    for (const stop of runners.values()) stop();
    runners.clear();
    bootstrapped.clear();
    teamEnabled.clear();
  });

  // The web server may not exist yet while this row activates, so the routes
  // wait for the service instead of probing for it once.
  try {
    ctx.inject(['webServer'], (child) => {
      const route = (routePath, handle) => {
        child.effect(
          () =>
            child.webServer.register({
              kind: 'exact',
              path: routePath,
              handler(req, res) {
                if (req.method !== 'GET') {
                  res.statusCode = 405;
                  res.end();
                  return;
                }
                let cwd = '';
                try {
                  cwd = new URL(req.url || '/', 'http://localhost').searchParams.get('cwd') || '';
                } catch {
                  // A malformed URL means no project hint; the state is answered for the whole machine.
                }
                handle(cwd, res);
              },
            }),
          'ryugi: ' + routePath,
        );
      };
      route('/ryugi/state', (cwd, res) =>
        sendJson(res, collectState({ serverDir, projects, cwd })),
      );
      route('/ryugi/artifacts', (cwd, res) => {
        const state = collectState({ serverDir, projects, cwd });
        sendJson(res, { artifacts: state.artifacts, active: state.active });
      });
      route('/ryugi/server', (_cwd, res) => {
        const server = readServer(serverDir);
        sendJson(res, {
          running: server.running,
          url: server.url ?? null,
          version: server.version ?? null,
          openUrl: server.running ? artifactUrl(server, '', '') : null,
        });
      });
    });
  } catch (error) {
    ctx.logger?.warn?.('ryugi: artifact route unavailable: ' + (error?.message ?? error));
  }
}
