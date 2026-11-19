'use strict';

// The Ryugi mode preset, registered with ctx.agentPresets at Host activation.
// A preset row in the bundle patch keeps its own config verbatim for the child
// rows it carries, so a '!!js' name there never reaches the preset schema; the
// service registration is what lets the display name follow the UI language.
const { textFor } = require('./preset-text.cjs');

const PERSONA = [
  'You are in Ryugi mode. Every task starts by following the Ryugi workflow that',
  'is already loaded in this session: run brainstorming before any code, put the',
  'options on the Artboard when the human is deciding something visual, and stop',
  'for the human to approve a written spec before implementation. Never write',
  'product code before an approved spec, and never skip a skill the workflow',
  'names. When executing-specs dispatches tasks, use the agent team tools to',
  'create and assign the tasks, and verify the result against the spec before',
  'reporting it done.',
].join('\n');

function group(id, config, isolate) {
  return {
    id,
    name: 'cordis:group',
    group: true,
    ...(isolate === undefined ? {} : { isolate }),
    config,
  };
}

/** The Ryugi mode preset definition for one locale id. */
function designPreset(locale) {
  const text = textFor(locale);
  const windows = process.platform === 'win32';
  return {
    id: 'design',
    name: text.name,
    description: text.description,
    order: 4,
    plugins: [
      { id: 'persona', name: '@deepseek-ai/dsh-persona', config: { prefix: PERSONA } },
      {
        id: 'agent-instructions',
        name: '@deepseek-ai/dsh-agent-instructions',
        config: { maxBytes: 65536 },
      },
      { id: 'time-context', name: '@deepseek-ai/dsh-time-context' },
      { id: 'tool-bash', name: '@deepseek-ai/dsh-tool-bash', disabled: windows },
      { id: 'tool-pwsh', name: '@deepseek-ai/dsh-tool-pwsh', disabled: !windows },
      { id: 'tool-fs', name: '@deepseek-ai/dsh-tool-fs', config: { applyPatch: false } },
      {
        id: 'tool-fs-search',
        name: '@deepseek-ai/dsh-tool-fs-search',
        config: { sampleOverCapGlobResults: false },
      },
      { id: 'skill-filesystem', name: '@deepseek-ai/dsh-skill-filesystem' },
      { id: 'tool-skill', name: '@deepseek-ai/dsh-tool-skill' },
      { id: 'tool-ask-user', name: '@deepseek-ai/dsh-tool-ask-user' },
      {
        id: 'tool-todo',
        name: '@deepseek-ai/dsh-tool-todo',
        config: { allowParallelInProgress: true },
      },
      {
        id: 'tool-web',
        name: '@deepseek-ai/dsh-tool-web',
        config: { fetch: true, searchTimeoutMs: 60000 },
      },
      { id: 'present', name: '@deepseek-ai/dsh-tool-present' },
      group('delegation', [
        {
          id: 'tool-subagent-control',
          name: '@deepseek-ai/dsh-tool-subagent-control',
          config: { interrupt: false },
        },
        {
          id: 'tool-subagent',
          name: '@deepseek-ai/dsh-tool-subagent',
          config: {
            provider: 'spawn',
            toolName: 'subagent',
            modelSelection: true,
            modelDiscovery: true,
          },
        },
        {
          id: 'tool-subagent-fork',
          name: '@deepseek-ai/dsh-tool-subagent',
          config: { provider: 'fork', toolName: 'subagent_fork' },
        },
        // The shared task board; the Host plugin turns Team mode on for these
        // sessions, which is what makes the tools visible.
        { id: 'tool-agent-team', name: '@deepseek-ai/dsh-tool-agent-team' },
      ]),
      group(
        'compaction',
        [
          { id: 'compaction-basic', name: '@deepseek-ai/dsh-compaction-basic' },
          { id: 'command-compact', name: '@deepseek-ai/dsh-command-compact' },
          {
            id: 'tool-result-pruner',
            name: '@deepseek-ai/dsh-compaction-tool-result-pruner',
            config: { thresholdChars: 8192, headChars: 4096, tailChars: 1024 },
          },
        ],
        { compaction: true, toolResultPruner: true },
      ),
    ],
  };
}

module.exports = { designPreset, PERSONA };
