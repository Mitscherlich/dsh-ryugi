# Ryugi on DeepSeek Harness

This bundle adds two things to DeepSeek Harness (DSH): **Ryugi mode** (设计模式 in a Chinese UI), an agent
preset that pins the Ryugi workflow, and the **画板** view, which shows Ryugi
artifacts inside DSH instead of a browser tab.

## Ryugi mode / 设计模式

Select **Ryugi mode** (设计模式 in a Chinese UI) in the agent preset picker before creating a
session. The display name follows the interface language and updates when it changes. Every new task in that session then starts on the Ryugi workflow:

- the checkout's skills are registered with the Host skill registry, so the
  model loads `brainstorming`, `artifacts` and the rest through the `skill`
  tool by their bare names;
- the Host adds the `using-ryugi` bootstrap and the DSH tool mapping as one
  system-prompt section scoped to the session — not a chat message, so it stays
  out of the transcript and the session title and survives compaction;
- `executing-specs` hands work to the agent team: the bundle mounts the shared
  task board tools and switches the session's Team mode on, so tasks are created
  with `team_task_create` and owned by teammates started with `subagent`;
- acceptance can use DSH's computer use (`cua`) when the deployment enables it;
  DSH scopes that tool to one preset, so a Ryugi mode session sees it after the
  profile override in `docs/guide.md` widens the scope.

Subagent sessions never receive the bootstrap or the Team switch: a teammate
executes the task it was given and does not restart the design workflow.

## 画板 view and the Artboard sidebar

- **画板** is the third view in the conversation's view ring, after **对话** and
  **轨迹**. It lists the artifacts under `.ryugi/artifacts` in the session's
  working directory and embeds the running artboard server.
- The view is full-bleed: no card header, no composer underneath, and it fills the
  conversation area; the sidebar tab keeps Reload, Refresh and Open in browser.
  It uses the host theme tokens, so it follows the light and dark theme, and with
  no artifact it shows a placeholder and a Refresh action instead of an empty frame.
- A **画板** tab is registered for the right sidebar. When a new artifact appears
  in a Ryugi mode session, the sidebar opens on it by itself; the conversation
  keeps whatever view it was showing.
- The embedded page is a `<webview>` guest approved by the Desktop shell, so
  the artboard keeps its own theme and interactions. In a plain browser build
  without the Desktop bridge, the view lists the artifacts and offers the local
  URL instead.
- The plugin sets `ARTIFACTS_OPEN=0`, so the artifacts CLI never opens a system
  browser behind the view's back.

## Artifact feedback

While a Ryugi mode session runs, the Host polls the project's artifact state
and turns submitted choices, answers and comments into a user message that wakes
the session. The message names the `comment` command; the agent reads it with
`bash` before acting.

## Requirements

- DeepSeek Harness with the Web app and, for the inline artboard, the Desktop
  shell. Restart DSH after installing or updating the bundle.
- A Ryugi skills root: `~/.agents/skills` populated by `scripts/install-skills.mjs`,
  or a checkout's `skills/` named by `config.skillsRoot`, `DSH_RYUGI_SKILLS`,
  `config.ryugiRoot`, or the parent directory of a `.dsh-plugin` install. It supplies
  `using-ryugi` for the bootstrap, the workflow skills, and
  `artifacts/app/comment-watch.cjs` for feedback. The DSH tool mapping ships in
  this package and the root's copy wins when it exists.
- Node.js 20.12 or newer for the artifacts CLI.

## Limitations

- The artboard embeds only the project the local Ryugi server currently serves
  (the last one started). Artifacts from other projects are listed without an
  inline page.
- The inline page needs the Desktop bridge; a browser-only deployment shows the
  artifact list and the local URL.
- Without a usable Ryugi checkout the Artboard surfaces still work, but the
  bootstrap, skills and feedback are skipped with a warning.
- The bundle has its own version and is installed from this repository; it is not
  published to npm.
