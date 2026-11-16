<div align="center">

# non-dev-output

### A Claude Code plugin that speaks human, not compiler.

[![Version](https://img.shields.io/badge/version-2.0.0-6c63ff.svg?style=flat-square)](https://github.com/calmtiger86/non-dev-output/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg?style=flat-square)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-f97316.svg?style=flat-square)](https://claude.ai/code)

**[한국어](README.ko.md) · English · [中文](README.zh.md)**

<br/>

> *You don't need to learn the vocabulary of computers.*  
> *They should learn yours.*

</div>

---

## The Problem

Claude is smart. But ask *"why is my app slow?"* and you get:

> *"The bottleneck appears to be N+1 query generation in the ORM layer, causing redundant round-trips to the database."*

You close the tab knowing less than before.

**non-dev-output** changes how Claude explains things. It turns the hard words into an everyday scene first, and keeps the exact technical details in a separate block.

---

## After You Install

**Scenario 1 — You didn't follow the explanation:**

```
You:    "I still don't get what a database index is"

Claude: ──────────────────────────────────────────────────────────
        By analogy ↓
        A dictionary has A–Z tabs on the side.
        To find "serendipity" you flip to S — not page one.
        A database index is that tab.
        A bit more space on disk, but finding rows gets fast.

        In reality ↓
        CREATE INDEX idx ON table(column);
        Use EXPLAIN to confirm the index is being hit.
        Only index columns you read often — indexes slow down writes.
```

No command typed. The "two-block rule" is already in Claude's context from the start of the session, so when you ask again or say you didn't follow, Claude explains it in this shape.

**Scenario 2 — You asked for a blog post:**

```
You:    "Write a blog post about why coffee makes you more productive"

Without plugin:
        Coffee has many effects on productivity.
        Firstly, caffeine improves focus.
        Secondly, it reduces fatigue.
        In conclusion, coffee has a positive impact on productivity.

With plugin:
        Every morning, one cup. Just to wake up.
        But caffeine does something more specific than that —
        it blocks the signal that tells your brain it's tired.
        While that signal is paused, your thinking gets sharper.
        We call that focus.
```

For a writing request, Claude can pick up the `ko-humanche-calmta` skill (a bundle of instructions for one kind of task) and strip out AI boilerplate. Claude decides from the request whether to use the skill, so it is not guaranteed every time. The example above is an illustration. That skill targets Korean prose.

---

## Installation

non-dev-output is a Claude Code plugin. Install it from the marketplace (the list plugins are downloaded from) `calmtiger86/non-dev-output`. Pick the one way that fits where you work.

### Inside Claude Code (v2.1.275 or later)

```
/plugin install non-dev-output --marketplace calmtiger86/non-dev-output
```

### In a terminal (v2.1.292 or later)

```bash
claude plugin install non-dev-output --marketplace calmtiger86/non-dev-output
```

### Claude desktop app

Click the **+** button next to the prompt box, choose **Add plugins**, add the marketplace `calmtiger86/non-dev-output`, then install non-dev-output.

> If it doesn't show up after installing, type `/reload-plugins` in the running session or restart Claude Code.

**Node.js is not required.** The hook that loads the rule at session start (a small command Claude Code runs automatically at a set moment) is a single `cat` line. It ends with `exit 0`, so no error line appears even if the rule file can't be read. This was checked on macOS; it has not been checked on Windows without Git Bash (PowerShell).

---

## How It Works

```
When a session starts (startup · clear · compact)
└── Loads the "two-block rule" (rules/output-clarity.md) into Claude's context
    (analogy block + reality block, no mixing)

During the conversation
├── You say you didn't follow, or ask the same thing again
│   └── Claude explains again as two blocks, following the rule
├── "explain simply", "this is hard" and similar
│   └── the explain-by-analogy skill helps build the analogy
└── "polish this", "remove the AI tone", "write a blog post" and similar
    └── the ko-humanche-calmta skill smooths Korean prose
```

There is no hook that runs on every message you send. Nothing reads or records what you type, and the plugin creates no log files.

Claude decides whether a skill fits the request. To call one yourself, type `/explain-by-analogy` or `/ko-humanche-calmta`. If another plugin has a skill with the same name, put the plugin name in front: `/non-dev-output:explain-by-analogy`.

---

## Update and Uninstall

### Update

- This marketplace has auto-update off by default. Type `/plugin`, open the Marketplaces tab, and turn on auto-update for this marketplace to receive new versions automatically.
- To update by hand, run this in a terminal:

```bash
claude plugin update non-dev-output@non-dev-output
```

- In a session that is already running, type `/reload-plugins` to apply the new version.

### Uninstall

```bash
claude plugin uninstall non-dev-output@non-dev-output
```

---

## Moving from 1.x

From 2.0 on, installing from the marketplace is the only way. The older `omc install` and `install.js` (Option C) routes are gone. If you used 1.x, move over like this:

1. Install 2.0 with one of the methods above.
2. Clean up the old leftovers with the tool below. It needs Node.js.
3. Restart Claude Code.

**What the cleanup tool removes:**

- If you installed with `install.js` (Option C): the `~/.claude/plugins/non-dev-output/` folder, and this plugin's hook entries in `~/.claude/settings.json`. Your other hooks are left alone.
- The files 1.x hooks left behind: `~/.omc/state/clarity-events.jsonl` (the first 200 characters of your messages) and `~/.omc/state/clarity-claims/`. These may exist even if you installed from the marketplace.

```bash
# If you still have the old download folder, run git pull; otherwise these two lines
git clone https://github.com/calmtiger86/non-dev-output
cd non-dev-output

node scripts/remove-legacy.mjs           # preview: only shows what would be removed
node scripts/remove-legacy.mjs --apply   # backs up into the config folder's backups, then cleans up
```

- It follows `CLAUDE_CONFIG_DIR` if you moved your config folder.
- If `settings.json` can't be read (for example one stray comma), the tool leaves `settings.json` and the old folder untouched and tells you. Fix the file and run it again.
- The message log can contain the beginning of what you typed, in plain text, so the backup keeps a copy too (the `omc-state` folder). Delete that folder if you don't need it.

**What changed in 2.0:**

- The per-message detection hook and the input log are gone. The reaction to "I didn't understand" moved into one sentence of the rule, and writing requests are handled by the trigger words of the `ko-humanche-calmta` skill.
- The feature that skipped the rule when `~/.claude/rules/common/output-clarity.md` already existed is gone. If you keep that file yourself and also enable this plugin, the rule is loaded twice (about 3KB).
- Skill pre-approvals (`allowed-tools`) were narrowed. File edits and shell commands still ask for confirmation as usual, even in a turn where a skill runs.

---

## File Structure

```
non-dev-output/
├── .claude-plugin/
│   ├── plugin.json              ← plugin info
│   └── marketplace.json         ← marketplace info
├── hooks/
│   ├── hooks.json               ← loads the rule at session start (one cat line)
│   └── hooks.test.mjs           ← checks the hook command
├── rules/
│   └── output-clarity.md        ← the two-block rule
├── skills/
│   ├── explain-by-analogy/      ← analogy-building skill
│   └── ko-humanche-calmta/      ← Korean prose correction skill
└── scripts/
    ├── remove-legacy.mjs        ← cleanup tool for 1.x leftovers
    └── remove-legacy.test.mjs   ← checks the cleanup tool
```

---

## Contributing

Bug reports and suggestions are always welcome.

**Run the checks.** After a change, run these in the repository folder:

```bash
node hooks/hooks.test.mjs
node scripts/remove-legacy.test.mjs
claude plugin validate .
```

**To ship a change,** raise `version` in both `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` to the same new number. If the number stays the same, users who update are told they are "already up to date" and never receive the new content.

---

## License

MIT © [calmtiger86](https://github.com/calmtiger86)
