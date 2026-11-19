# DeepSeek Harness Tool Mapping

Skills speak in actions ("dispatch a subagent", "create a todo", "read a file").
On DeepSeek Harness (DSH) these resolve to the tools below. DSH ships a native
skill tool, so `ryugi:<name>` always means: load the skill named `<name>` with
`skill`.

| Action skills request                    | DSH tool                                                                                                                            |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Invoke a skill (`ryugi:<name>`, `Skill`) | `skill` — pass the bare name (`brainstorming`), never the `ryugi:` prefix; never read `SKILL.md` by hand while `skill` is available |
| Ask the user a question                  | `ask_user_question`                                                                                                                 |
| TodoWrite / task list                    | `todo_write`                                                                                                                        |
| Read a file                              | `read`                                                                                                                              |
| Create, edit or delete a file            | `write`, `edit` (`bash` for deletion)                                                                                               |
| Find files / search contents             | `glob`, `grep`                                                                                                                      |
| Run a shell command                      | `bash`                                                                                                                              |
| Fetch a URL / search the web             | `web_fetch`, `web_search`                                                                                                           |
| Show a file to the human                 | `present`                                                                                                                           |
| Dispatch a subagent                      | `subagent` (fresh context) or `subagent_fork` (inherits the current conversation)                                                   |
| Work the agent team shares               | `team_task_create`, `team_task_get`, `team_task_list`, `team_task_update`                                                           |
| Reach a teammate                         | `list_agents`, `send_message`, `wait_agent`; `interrupt_agent` stops a teammate's current turn                                      |
| Operate a desktop app (acceptance)       | `cua` when the deployment enables computer use; otherwise verify with tests and screenshots the human provides                      |

## Dispatching subagents

Both tools take `description` and `prompt`; pass `name` to choose the teammate's
identity, which is how `send_message` addresses it later. A subagent session is a
child Session: it does not receive the Ryugi bootstrap, so give it everything it
needs in `prompt`.

## Agent team handoff

Design mode turns the Session's Team mode on, so the shared board is available
from the first step. The executing-specs handoff is:

1. `team_task_create` once per task in the approved spec, with its `title`, its
   `details`, and dependencies on the tasks that must land first.
2. Start one teammate per parallel track with `subagent` (`name`, `description`,
   `prompt` holding that task's brief). Teammates claim the tasks they own.
3. `team_task_list` / `team_task_get` to follow progress; `send_message` to
   steer; `wait_agent` to wait for a teammate's next step.
4. Review each finished task against its spec before marking it complete with
   `team_task_update`.

If Team mode or the team tools are unavailable, do the work inline or with plain
subagents and say which capability was missing. Do not invent a task-board tool.

## Acceptance with computer use

When the deployment enables computer use, `cua` inspects and operates native
applications: list apps, read an accessibility tree, take a screenshot, click and
type. Use it to check what the spec promised the human would see — a page they
open in an app, a built screen, a flow that only exists in a GUI — and report the
evidence. Without `cua`, verify with tests, build output and the artifacts the
human can open themselves; never claim a visual result you did not observe.

## Artboards

The human sees artifacts in the **画板** view, after **对话** and **轨迹** in the
conversation's view ring, and in the **画板** tab of the right sidebar, which opens
by itself when a new artifact appears.

- Start the server with `--no-open`, for example
  `node app/ryugi.cjs start --background --no-open --project-dir <project> --artifact <type>/<id>`.
- Never pass `--open`, never launch a browser yourself, and never hand the human
  a link to open. The DSH plugin already suppresses browser opening; telling them
  "see the 画板 view" is the correct hand-off.
- The `Open` URL the CLI prints stays useful for programmatic checks; it is not
  what you tell the human.
- After writing or editing an artifact, run the target's Check command, then say
  what changed. Do not re-link the page.

## Comments, choices and answers

Artifact feedback reaches the session as user messages that begin with
`Ryugi comments`, `Ryugi choices` or `Ryugi answers`. They name a command; run it
with `bash` to read the full text before acting.
