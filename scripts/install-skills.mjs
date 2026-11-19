#!/usr/bin/env node
// Install Ryugi's skills into a skills root that harnesses already scan.
//
// DSH (and Codex, Copilot CLI, Gemini CLI) read ~/.agents/skills as a shared
// user-level skill root, so copying the skills there registers them without
// any harness-specific plugin work. The payload comes from a pinned Ryugi
// release tarball; no checkout is needed.
//
// Usage: dsh-ryugi-install-skills [--dir <path>] [--ref <tag|main>] [--force] [--dry-run]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REPO = 'Innei/ryugi';
const MARKER = '.ryugi-skills.json';
const DEFAULT_DIR = path.join(os.homedir(), '.agents', 'skills');

function usage() {
  console.log(`Usage: dsh-ryugi-install-skills [options]

Install the Ryugi skills into a directory the harness scans, so they appear in
its skill catalog without a Ryugi checkout.

Options:
  --dir <path>   destination skills root (default: ~/.agents/skills)
  --ref <ref>    Ryugi tag or branch (default: the latest GitHub release)
  --from <path>  local archive (.tar.gz) or a directory containing skills/
  --force        replace skills that this script did not install
  --dry-run      print the plan without downloading or writing
  --help         show this help

Examples:
  dsh-ryugi-install-skills
  dsh-ryugi-install-skills --dir ~/.agents/skills --ref v1.90.1
  dsh-ryugi-install-skills --dry-run`);
}

function parseArgs(argv) {
  const options = { dir: DEFAULT_DIR, ref: null, from: null, force: false, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--force') {
      options.force = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--dir' || arg === '--ref' || arg === '--from') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`${arg} needs a value`);
      options[arg === '--dir' ? 'dir' : arg === '--ref' ? 'ref' : 'from'] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

async function latestTag() {
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'dsh-ryugi' },
    });
    if (!response.ok) return null;
    const body = await response.json();
    return typeof body.tag_name === 'string' && body.tag_name ? body.tag_name : null;
  } catch {
    return null;
  }
}

function tarballUrl(ref) {
  // The API endpoint serves tags and branches and redirects to codeload; it
  // also works where github.com itself is slow or blocked.
  return `https://api.github.com/repos/${REPO}/tarball/${encodeURIComponent(ref)}`;
}

async function download(url, file) {
  const response = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'dsh-ryugi' } });
  if (!response.ok) throw new Error(`download failed: HTTP ${response.status} for ${url}`);
  const body = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(file, body);
  return body.length;
}

function extract(file, dir) {
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('tar', ['-xzf', file, '-C', dir], { stdio: 'pipe' });
  // A plain `tar -C repo skills` archive has skills/ at the top; GitHub
  // archives wrap everything in one <repo>-<ref>/ directory.
  if (fs.existsSync(path.join(dir, 'skills'))) return path.join(dir, 'skills');
  const roots = fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const root of roots) {
    const skills = path.join(dir, root.name, 'skills');
    if (fs.existsSync(skills)) return skills;
  }
  throw new Error('the archive does not contain a skills/ directory');
}

function skillDirs(skillsRoot) {
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(skillsRoot, name, 'SKILL.md')))
    .sort();
}

function readMarker(dir) {
  try {
    const marker = JSON.parse(fs.readFileSync(path.join(dir, MARKER), 'utf8'));
    return Array.isArray(marker.skills) ? marker : null;
  } catch {
    return null;
  }
}

function plan(skillsRoot, destination, previous, force) {
  const names = skillDirs(skillsRoot);
  const owned = new Set(previous?.skills ?? []);
  const conflicts = [];
  const install = [];
  for (const name of names) {
    const target = path.join(destination, name);
    if (fs.existsSync(target) && !owned.has(name) && !force) {
      conflicts.push(name);
    } else {
      install.push({ name, target, replace: fs.existsSync(target) });
    }
  }
  return { names, install, conflicts };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  const destination = path.resolve(options.dir);
  const localSource = options.from ? path.resolve(options.from) : null;
  const ref = localSource ? null : options.ref || (await latestTag()) || 'main';
  const url = localSource ? null : tarballUrl(ref);
  console.log(`Ryugi skills → ${destination}`);
  console.log(`source: ${localSource ?? url}`);

  if (options.dryRun) {
    console.log('dry run: nothing downloaded or written');
    return;
  }

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-ryugi-skills-'));
  try {
    let skillsRoot;
    if (localSource) {
      if (fs.statSync(localSource).isDirectory()) {
        skillsRoot = fs.existsSync(path.join(localSource, 'skills'))
          ? path.join(localSource, 'skills')
          : localSource;
      } else {
        skillsRoot = extract(localSource, path.join(temp, 'src'));
      }
    } else {
      const archive = path.join(temp, 'ryugi.tar.gz');
      const size = await download(url, archive);
      console.log(`downloaded ${(size / 1024).toFixed(0)} KiB`);
      skillsRoot = extract(archive, path.join(temp, 'src'));
    }
    if (!fs.existsSync(path.join(skillsRoot, 'using-ryugi', 'SKILL.md'))) {
      throw new Error(`${skillsRoot} is not a Ryugi skills root (missing using-ryugi/SKILL.md)`);
    }
    const previous = readMarker(destination);
    const { names, install, conflicts } = plan(skillsRoot, destination, previous, options.force);
    if (conflicts.length) {
      throw new Error(
        `these skills already exist and were not installed by this script: ${conflicts.join(', ')}. Re-run with --force to replace them.`,
      );
    }
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of install) {
      if (entry.replace) fs.rmSync(entry.target, { recursive: true, force: true });
      fs.cpSync(path.join(skillsRoot, entry.name), entry.target, { recursive: true });
    }
    const marker = {
      source: localSource ? `local:${localSource}` : `github:${REPO}`,
      ref,
      installedAt: new Date().toISOString(),
      skills: names,
    };
    fs.writeFileSync(path.join(destination, MARKER), JSON.stringify(marker, null, 2) + '\n');
    console.log(
      `installed ${install.length} skills: ${install.map((entry) => entry.name).join(', ')}`,
    );
    console.log('start a new session (or restart the harness) so the skill catalog refreshes');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('dsh-ryugi-install-skills: ' + error.message);
  process.exitCode = 1;
});
