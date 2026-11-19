// Checkout resolution: bun run tests/resolve.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  agentsSkillsRoot,
  buildBootstrap,
  candidateSkillsRoots,
  isSkillsRoot,
  resolveSkillsRoot,
  shouldRegisterSkills,
} from '../index.js';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-ryugi-resolve-'));
try {
  const skills = path.join(root, 'skills');
  const marker = path.join(skills, 'using-ryugi', 'SKILL.md');
  fs.mkdirSync(path.dirname(marker), { recursive: true });
  fs.writeFileSync(marker, '---\nname: using-ryugi\ndescription: d\n---\nbody\n');
  const other = path.join(root, 'not-a-skills-root');
  fs.mkdirSync(other, { recursive: true });

  assert.equal(isSkillsRoot(skills), true, 'a root with using-ryugi is usable');
  assert.equal(isSkillsRoot(other), false, 'a directory without the skill is not a root');
  assert.equal(isSkillsRoot(''), false);
  assert.equal(isSkillsRoot(undefined), false);

  // DSH's own skills root is ~/.agents/skills (DSH_AGENTS_HOME overrides it).
  assert.equal(agentsSkillsRoot({ HOME: root }), path.join(root, '.agents', 'skills'));
  assert.equal(
    agentsSkillsRoot({ HOME: root, DSH_AGENTS_HOME: path.join(root, 'agents') }),
    path.join(root, 'agents', 'skills'),
  );

  // The plugin registers for a checkout, but DSH itself registers its root.
  assert.equal(shouldRegisterSkills(skills), true);
  assert.equal(shouldRegisterSkills(path.join(root, '.agents', 'skills'), { HOME: root }), false);
  assert.equal(shouldRegisterSkills(undefined), false);

  // config wins, then the environment, then candidates.
  assert.equal(
    resolveSkillsRoot({ config: { skillsRoot: skills }, candidates: [other] }).root,
    skills,
  );
  assert.equal(
    resolveSkillsRoot({ env: { DSH_RYUGI_SKILLS: skills }, candidates: [] }).root,
    skills,
  );
  const fromTilde = resolveSkillsRoot({
    env: { HOME: root, DSH_RYUGI_SKILLS: '~/skills' },
    candidates: [],
  });
  assert.equal(fromTilde.root, skills, '~/ expands against the given HOME');

  const ordered = resolveSkillsRoot({ candidates: [other, skills, other] });
  assert.equal(ordered.root, skills);
  assert.deepEqual(ordered.searched, [other, skills], 'deduplicated, in order');
  assert.equal(resolveSkillsRoot({ candidates: [other] }).root, undefined);

  // The default list starts with DSH's root, then common checkouts.
  const defaults = candidateSkillsRoots({}, { HOME: root });
  assert.equal(defaults[0], path.join(root, '.agents', 'skills'));
  assert.ok(defaults.includes(path.join(root, 'i', 'ryugi', 'skills')), 'common checkout location');

  // The bundled mapping is the fallback; without a root there is no bootstrap.
  assert.equal(buildBootstrap({}), '');
  const bootstrap = buildBootstrap({ skillsRoot: skills });
  assert.match(bootstrap, /body/, 'uses the skills-root body');
  assert.match(bootstrap, /DeepSeek Harness Tool Mapping/, 'falls back to the bundled mapping');
  const custom = buildBootstrap({ skillsRoot: skills, mapping: 'CUSTOM MAPPING' });
  assert.match(custom, /CUSTOM MAPPING/, 'an explicit mapping wins');

  console.info('dsh-ryugi resolve ok');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
