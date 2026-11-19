<p align="center"><b>Ryugi mode and the Artboard for DeepSeek Harness</b></p>

# dsh-ryugi

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) plugin that
brings [Ryugi](https://github.com/Innei/ryugi) into DSH.

- **Ryugi mode** (设计模式 in a Chinese UI) — an agent preset that starts every task
  on the using-ryugi workflow: brainstorm, draw the options on the Artboard, approve
  a written spec, then hand the tasks to an agent team. The preset is registered with
  the Host and its display name follows the interface language.
- **画板** — a third conversation view after **对话** and **轨迹**. It is full-bleed,
  hides the composer while open, embeds the running Artboard server and shows a
  placeholder until a session has an artifact. New artifacts open the Artboard tab in
  the right sidebar automatically.
- **Feedback** — submitted choices, answers and comments wake the session with the
  `comment` command to run.
- **Agent team** — the preset mounts the shared task board and turns the root
  session's Team mode on, so executing-specs can hand approved work to teammates.
  Computer use (`cua`) is used for acceptance where the deployment enables it.

## Requirements

- DSH 0.2.2-rc.5 or newer with the Web app. The inline Artboard needs the Desktop
  shell, where the page runs as an approved `<webview>` guest.
- A **Ryugi checkout** that provides `skills/` and `skills/artifacts/app/ryugi.cjs`.
  The plugin reads it at runtime and never writes to it.
- Node.js 20.12 or newer, and the artifacts CLI for the Ryugi server
  (`npx ryugi-artifacts install --mode full --harness none`, or pick your other
  harnesses).

## Install

1. Install Ryugi's CLI and artifacts as above.
2. In DSH open **Plugins → Add plugin** and enter `github:Mitscherlich/dsh-ryugi`
   (or the absolute path of a checkout of this repository).
3. Choose **Enable now**, then **restart DSH**. A bundle update replaces its
   JavaScript modules and DSH loads a fresh module generation only after a restart;
   reload the page as well so the browser half comes from the new bundle.
4. Start a new session and select **Ryugi mode** (设计模式 in a Chinese UI) in the
   agent preset picker. The display name follows the UI language.

The unified `ryugi install --harness …` installer has no `dsh` target; install this
bundle through DSH instead.

### Pointing at a Ryugi checkout

The plugin resolves the checkout in this order:

1. `config.ryugiRoot` on the bundle row (a profile patch override or the plugin row),
2. the `DSH_RYUGI_ROOT` environment variable, then `RYUGI_ROOT`,
3. the parent directory, when installed inside a checkout as `<repo>/.dsh-plugin`,
4. `~/i/ryugi`, then `~/ryugi`.

Without a usable checkout the Artboard surfaces keep working; the bootstrap, skills
and feedback are skipped with a warning naming the paths it searched.

```yaml
# profile cordis.patch.yml, when auto-detection is not enough
- id: ryugi
  config:
    ryugiRoot: /path/to/ryugi
```

The DSH tool mapping ships in `assets/dsh-tools.md`. A checkout's
`skills/using-ryugi/references/dsh-tools.md` wins when it exists, so the porting
documentation and the plugin stay in step.

## What it adds

| Surface    | Where                                   | What                                                                                                                                                           |
| ---------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ryugi mode | Agent preset picker                     | System-prompt section with `using-ryugi` + the DSH tool mapping; registers the checkout's skills; enables the team task board; never touches subagent sessions |
| 画板       | Conversation view ring, after 对话/轨迹 | Full-bleed embedded Artboard; placeholder with Refresh; compact picker when a session has several artifacts                                                    |
| 画板 tab   | Right sidebar                           | Opens by itself on a new artifact; keeps Reload, Refresh and Open in browser                                                                                   |
| Feedback   | Session input                           | Choices, answers and comments wake the session                                                                                                                 |

## Development

```bash
bun install
bun run test    # checkout resolution, host smoke, client behaviour
```

```text
index.js          Host plugin: checkout resolution, bootstrap, skills, preset, Team mode, routes
client.js         Client module: 画板 view, sidebar tab, empty state, light/dark tokens
preset.cjs        The Ryugi mode preset definition registered with ctx.agentPresets
preset-text.cjs   Locale-aware preset name and description
cordis.patch.yml  Bundle patch: inserts the Host plugin row
assets/           Bundled DSH tool mapping
docs/             Bundle detail page and the full guide
tests/            Bun-run integration tests
```

The plugin talks to Ryugi's on-disk contract (.ryugi/artifacts, ~/.ryugi/server) and
to the checkout's launcher for the artifacts server and feedback; it carries no
runtime dependencies.

## License

Ryugi License 1.0 — see [LICENSE](LICENSE). This plugin is part of the Ryugi project.
