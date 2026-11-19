// Checkout resolution: bun run tests/resolve.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildBootstrap, candidateRoots, isCheckout, resolveRyugiRoot } from '../index.js';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-ryugi-resolve-'));
try {
  const checkout = path.join(root, 'checkout');
  const marker = path.join(checkout, 'skills', 'using-ryugi', 'SKILL.md');
  fs.mkdirSync(path.dirname(marker), { recursive: true });
  fs.writeFileSync(marker, '---\nname: using-ryugi\ndescription: d\n---\nbody\n');
  const other = path.join(root, 'not-a-checkout');
  fs.mkdirSync(other, { recursive: true });

  assert.equal(isCheckout(checkout), true, 'a checkout has the using-ryugi skill');
  assert.equal(isCheckout(other), false, 'a directory without the skill is not a checkout');
  assert.equal(isCheckout(''), false);
  assert.equal(isCheckout(undefined), false);

  // config wins, then the environment, then the built-in candidates.
  assert.equal(
    resolveRyugiRoot({ config: { ryugiRoot: checkout }, candidates: [other] }).root,
    checkout,
  );
  const fromEnv = resolveRyugiRoot({ env: { DSH_RYUGI_ROOT: checkout }, candidates: [] });
  assert.equal(fromEnv.root, checkout);
  const fromTilde = resolveRyugiRoot({
    env: { HOME: root, DSH_RYUGI_ROOT: '~/checkout' },
    candidates: [],
  });
  assert.equal(fromTilde.root, checkout, '~/ expands against the given HOME');

  // Candidate order: the first real checkout wins, missing entries are skipped.
  const ordered = resolveRyugiRoot({ candidates: [other, checkout, other] });
  assert.equal(ordered.root, checkout);
  assert.deepEqual(ordered.searched, [other, checkout], 'deduplicated, in order');

  const missing = resolveRyugiRoot({ candidates: [other] });
  assert.equal(missing.root, undefined);
  assert.deepEqual(missing.searched, [other]);

  // Default candidates: explicit config, environment, then the built-in list.
  const defaults = candidateRoots(
    { ryugiRoot: checkout },
    { DSH_RYUGI_ROOT: '/env/ryugi', HOME: root },
  );
  assert.equal(defaults[0], checkout);
  assert.equal(defaults[1], '/env/ryugi');
  assert.ok(defaults.includes(path.join(os.homedir(), 'i', 'ryugi')), 'common checkout location');

  // The bundled mapping is the fallback; without a root there is no bootstrap.
  assert.equal(buildBootstrap({}), '');
  const bootstrap = buildBootstrap({ root: checkout });
  assert.match(bootstrap, /body/, 'uses the checkout skill body');
  assert.match(bootstrap, /DeepSeek Harness Tool Mapping/, 'falls back to the bundled mapping');

  const custom = buildBootstrap({ root: checkout, mapping: 'CUSTOM MAPPING' });
  assert.match(custom, /CUSTOM MAPPING/, 'an explicit mapping wins');

  console.info('dsh-ryugi resolve ok');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
