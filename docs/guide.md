# Ryugi on DeepSeek Harness (DSH)

This repository is the DSH integration: the **dsh-ryugi** bundle. It adds
**Ryugi mode** (设计模式 in a Chinese UI), an agent preset that pins the Ryugi
workflow, and the **画板** view, which shows Ryugi artifacts inside DSH.

Open a clean session in Ryugi mode and send:

> Let's make a react todo list

A working install starts `brainstorming` before any code is written and draws
directions on the Artboard.

## Install

The plugin reads a Ryugi checkout at runtime — it does not copy the skills — so
it needs one checkout on the machine and nothing else:

1. Install the `ryugi` command for artifacts if you have not already:
   `npx ryugi-artifacts install --mode full --harness none` (or pick your other
   harnesses; the unified installer has no `dsh` target yet).
2. In DSH, open **Plugins** in the sidebar, choose **Add plugin**, and enter
   `github:Mitscherlich/dsh-ryugi` (or the absolute path of a checkout of this
   repository).
3. When the install finishes, choose **Enable now**, then **restart DSH**. A
   bundle update replaces its JavaScript modules, and DSH loads a fresh module
   generation only after a restart; reload the page as well so the browser half
   comes from the new bundle.
4. Start a new session and select **Ryugi mode** (设计模式 in a Chinese UI) in the
   agent preset picker. The display name follows the UI language.

After a restart, `GET /ryugi/state` reports `plugin.version`; it is the quickest
way to confirm the running Host loaded this bundle.

### Pointing at a Ryugi checkout

The plugin resolves the checkout in this order:

1. `config.ryugiRoot` on the bundle row,
2. `DSH_RYUGI_ROOT`, then `RYUGI_ROOT`,
3. the parent directory, when installed inside a checkout as `<repo>/.dsh-plugin`,
4. `~/i/ryugi`, then `~/ryugi`.

```yaml
# profile cordis.patch.yml, when auto-detection is not enough
- id: ryugi
  config:
    ryugiRoot: /path/to/ryugi
```

Without a usable checkout the Artboard surfaces keep working; the bootstrap,
skills and feedback are skipped with a warning naming the paths it searched.

## What the bundle adds

| Surface    | Where it appears                                                      | What it does                                                                                                                                                                                                                                  |
| ---------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ryugi mode | Agent preset picker                                                   | Adds the `using-ryugi` bootstrap plus the DSH tool mapping as a system-prompt section scoped to the session; registers the checkout's skills with the Host skill registry; enables the agent-team task board; never touches subagent sessions |
| 画板       | Third view in the conversation view ring, after **对话** and **轨迹** | Full-bleed canvas: no card, no toolbar, no composer, the artboard filling the conversation area; the sidebar tab keeps Reload, Refresh and Open in browser                                                                                    |
| 画板 tab   | Right sidebar                                                         | Opens by itself when a new artifact appears; the conversation keeps its current view                                                                                                                                                          |
| Feedback   | Session input                                                         | Submitted choices, answers and comments wake the session with the `comment` command to run                                                                                                                                                    |

The 画板 view and the Artboard tab follow the host theme, light or dark, and
show a placeholder with a Refresh action until the session has an artifact.
The view is the page: it has no header bar of its own, hides the composer while
it is open, and shows a small artifact picker only when the session has more
than one. A failed embed offers a Reload action in place.

The preset mounts `team_task_create`, `team_task_get`, `team_task_list` and
`team_task_update` beside the subagent tools, and turns the session's Team mode
on, so `executing-specs` can hand approved tasks to teammates. Acceptance can use
DSH's computer use (`cua`) when the deployment enables it.

### How the bootstrap reaches the model

`using-ryugi` and the DSH tool mapping are registered through
`agent.ctx.systemPrompt.section()` for each Ryugi mode session, as one section
named `ryugi:bootstrap`. It is not a chat message: it never appears in the
transcript, never becomes the session title, and survives compaction because the
system prompt is assembled for every step. Subagent sessions get no section, so a
teammate executes its brief instead of restarting the design workflow.

The skills themselves are registered from the checkout at Host level, so they
appear in every session's skill catalog and load through the `skill` tool by
their bare names (`brainstorming`, not `ryugi:brainstorming`).

## Tool mapping

Skills name actions, not tools. The mapping ships in `assets/dsh-tools.md` and
covers `skill`, `ask_user_question`, `todo_write`, `read`, `write`, `edit`,
`glob`, `grep`, `bash`, `web_fetch`, `web_search`, `present`, `subagent`,
`subagent_fork`, the `team_task_*` board, `send_message`, `wait_agent` and
`cua`. A checkout's `skills/using-ryugi/references/dsh-tools.md` wins when it
exists, so the porting documentation and the plugin stay in step.

## Harness detection

Ryugi's `skills/artifacts/app/ryugi.cjs` recognises a DSH session through
`DSH_SESSION_ID` and registers the artifact under the `dsh` host, so the parts of
Ryugi that attribute a session to a harness keep working inside DSH. The bundle
sets `ARTIFACTS_OPEN=0`, so the artifacts CLI never opens a system browser behind
the 画板 view's back.

The unified installer (`ryugi install --harness …`) is published from the closed
`ryugi-artifacts` package and lists its targets there; `dsh` is not one of them
yet. Install the bundle through DSH as above, and use the installer only for the
CLI (`--harness none`) or for your other harnesses.

## Computer use in Ryugi mode

DSH ships computer use as a provider scoped to one preset. The desktop profile
mounts it with `agentPreset: ptc`, so a Ryugi mode session does not get the
`cua` tool until the scope is widened. To make the tool available to every
preset — including Ryugi mode — override the row in the profile's
`cordis.patch.yml`:

```yaml
- id: cua
  name: '@deepseek-ai/dsh-experimental-cua-macos'
  config:
    agentPreset: false
```

This registers the tool globally, so every preset gains it and its catalog entry
comes with that token cost; keep the shipped `ptc` scope if you only want it
there. With the tool present, `assets/dsh-tools.md` tells the agent to use it for
visual acceptance (open the app, read the accessibility tree, screenshot) and to
report what it observed.

## Requirements and limits

- DeepSeek Harness 0.2.2-rc.5 or newer with the Web app; the inline artboard
  needs the Desktop shell, because the page is served with
  `frame-ancestors 'none'` and must run as a `<webview>` guest.
- A Ryugi checkout with `skills/` and `skills/artifacts/app/ryugi.cjs`, configured
  as described above.
- A browser-only deployment shows the artifact list and the local URL instead of
  the inline page.
- The local Ryugi server serves one project at a time — the last one started. An
  artifact from another project is listed without an inline page.
- The bundle has its own version; it no longer shares the Ryugi repository's
  release train, so reinstall it after a Ryugi checkout update if the mapping or
  the preset should change.

## Verified

Observed on DSH 0.2.2-rc.5 (desktop profile and throwaway `ryugi-*` profiles
running this bundle, 2026-11-19/20):

- The preset roster listed **Ryugi mode**; a new session recorded
  `agentPreset: design` and a `team/mode` event with `{"enabled":true}`.
- The first tool call in that session was `skill` with `brainstorming`, then
  `artifacts` and `interface-craft`; the agent started an Artboard and wrote
  `.ryugi/artifacts/artboard/<id>/canvas.json`.
- The conversation view ring read **Chat | Trajectory | Artboard**.
- Creating a new artifact opened the right sidebar on the 画板 tab by itself; in
  the browser build its body listed the artifact and offered the local URL, and
  the page logged no plugin errors.
- The Host half's `/ryugi/state` reported `plugin.version`, and the session's
  skill catalog gained the checkout's skills.
- An agent-team handoff ran end to end: the session created `task-1`
  (`probe: report 2+2`), started the teammate `probe-runner`, which claimed the
  task, and marked it complete; the Session log recorded `team/task` revisions 1
  → 2 → 3 and the teammate's result.
- With the profile override above, a Ryugi mode session's tool catalog included
  `cua` beside `team_task_*`.
- The 画板 view filled the conversation area exactly (view and scroll area both
  797px tall at a 1440×873 pane), with no toolbar and the composer seat
  `display: none`; with two artifacts a compact picker appeared and the rest of
  the surface stayed clean.
- The 画板 view rendered the placeholder with token-driven colors in both themes
  (white ground in light, `#232324` ground in dark), and its Refresh action kept
  readable contrast in dark mode.
- Changing the profile locale from `en` to `zh` while the Host ran renamed the
  registered preset to 设计模式, and back to `Ryugi mode`, without a restart.

What remains unverified: the inline artboard inside the Desktop `<webview>`
after the final reload (the lease path was verified in an earlier session), and a
full executing-specs handoff on a real spec.

## Development

```bash
bun install
bun run test
```

- `tests/resolve.mjs` — checkout resolution (config, environment, `~`, fallbacks).
- `tests/smoke.mjs` — host plugin against a temporary checkout fixture: bootstrap
  and bundled mapping, skill registration, preset registration and locale, Team
  mode, routes, artifact state.
- `tests/client.mjs` — client module: preset gating, view order, sidebar tab,
  auto-open, teardown.
