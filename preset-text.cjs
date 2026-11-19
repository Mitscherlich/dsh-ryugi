'use strict';

// Display text for the Ryugi mode preset. DSH presets take one literal name,
// so the language is resolved when the bundle patch is composed: the client
// locale preference is persisted in the DSH profile's cordis.patch.yml (see
// @deepseek-ai/dsh-client-locale). Changing the language rewrites that file,
// which recomposes the profile and re-registers the preset with the new text.

const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const TEXT = {
  zh: {
    name: '设计模式',
    description: '先讨论需求、在画板上画方案，批准规格后交给智能体团队实现。',
  },
  en: {
    name: 'Ryugi mode',
    description:
      'Discuss the task, draw artboards, review them, write a spec, then hand it to an agent team.',
  },
};

/** Read the locale preference from one patch list, or null when it is absent. */
function preferenceIn(text) {
  const match = /- id: locale[ \t]*\r?\n[\s\S]*?preference:[ \t]*["']?([A-Za-z-]+)/.exec(
    text || '',
  );
  return match === null ? null : match[1].toLowerCase();
}

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/** The patch files that can carry the locale preference, most specific first. */
function patchFiles(env = process.env) {
  const home = env.DSH_HOME || path.join(env.HOME || os.homedir(), '.dsh');
  const files = [];
  if (env.DSH_PROFILE_DIR) files.push(path.join(env.DSH_PROFILE_DIR, 'cordis.patch.yml'));
  if (env.DSH_PROFILE) files.push(path.join(home, 'profiles', env.DSH_PROFILE, 'cordis.patch.yml'));
  files.push(path.join(home, 'cordis.patch.yml'));
  return files;
}

/** The active locale id, or en when no preference is recorded. */
function localeOf(env = process.env) {
  for (const file of patchFiles(env)) {
    const preference = preferenceIn(read(file));
    if (preference) return preference;
  }
  return 'en';
}

/** Preset name and description for one locale id. */
function textFor(locale) {
  return String(locale || '')
    .toLowerCase()
    .startsWith('zh')
    ? TEXT.zh
    : TEXT.en;
}

/** Preset name and description for the running profile. */
function presetText(env = process.env) {
  return textFor(localeOf(env));
}

module.exports = { presetText, textFor, localeOf, preferenceIn, patchFiles };
