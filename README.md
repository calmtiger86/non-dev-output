<div align="center">

# non-dev-output

### A Claude Code plugin that speaks human, not compiler.

[![Version](https://img.shields.io/badge/version-1.0.0-6c63ff.svg?style=flat-square)](https://github.com/calmtiger86/non-dev-output/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg?style=flat-square)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-f97316.svg?style=flat-square)](https://claude.ai/code)
[![Platform](https://img.shields.io/badge/platform-Mac%20%7C%20Linux%20%7C%20Windows-0ea5e9.svg?style=flat-square)](#installation)

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

**non-dev-output** steps in before Claude types a single word. Automatically.

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

No command typed. The plugin caught *"I still don't get"* and switched modes.

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

No command. The plugin detected a writing request and cut the boilerplate.

---

## Installation

### Option A — via `claude plugin` (recommended)

```bash
claude plugin marketplace add https://github.com/calmtiger86/non-dev-output
claude plugin install non-dev-output@non-dev-output
```

Restart Claude Code. Done.

### Option B — via `omc install` (if you use oh-my-claudecode)

```bash
omc install https://github.com/calmtiger86/non-dev-output
```

Restart Claude Code. Done.

### Option C — manual (works everywhere)

**Step 1** — Make sure [Node.js](https://nodejs.org) is installed (v18 or higher).  
Run `node --version` in a terminal. If a version number appears, you're ready.

**Step 2** — Clone this repository:

```bash
git clone https://github.com/calmtiger86/non-dev-output
cd non-dev-output
```

**Step 3** — Run the installer:

```bash
node install.js
```

**Step 4** — Restart Claude Code. Done.

> No npm install. No config files. No API keys.

---

## Trigger Words

The plugin watches for these — no commands needed.

**When you're confused:**

| What you type | Language |
|---------------|----------|
| "I don't understand", "what does that mean", "explain simply" | English |
| "이해가 안 돼", "무슨 말이야", "쉽게 설명해줘" | Korean |
| "什么意思", "看不懂", "简单说一下" | Chinese |
| "too technical", "what?", "explain it again" | English |

**When you're writing:**

| What you type | Language |
|---------------|----------|
| "write a blog post / newsletter / caption" | English |
| "블로그 써줘", "카드뉴스 만들어줘", "뉴스레터 작성해줘" | Korean |
| "写博客", "写公众号文章", "写小红书" | Chinese |

---

## How It Works

```
Every session start
└── Loads the "two-block rule" into Claude's context
    (analogy block + reality block, no mixing)

Every message you send
└── Scans for confusion or writing signals
    ├── Confusion detected → injects [CLARITY-MISS] instruction
    └── Writing detected  → injects [WRITING-INTENT] instruction
```

Key design: **no false positives**. Writing mode needs both a subject (blog, newsletter…) and an action (write, draft…) in the same message. Casually mentioning a blog won't set it off.

---

## File Structure

```
non-dev-output/
├── hooks/
│   ├── hooks.json               ← auto-registers on install
│   ├── session-start.mjs        ← loads rules at session start
│   └── clarity-keywords.mjs    ← pattern detection (self-contained)
├── rules/
│   └── output-clarity.md       ← the two-block rule
├── skills/
│   ├── explain-by-analogy/      ← extended analogy skill
│   └── ko-humanche-calmta/      ← Korean prose correction skill
├── install.js                   ← cross-platform installer
├── install.sh                   ← Mac/Linux shortcut
└── install.ps1                  ← Windows shortcut
```

---

## Uninstall

```bash
# Remove plugin files
rm -rf ~/.claude/plugins/non-dev-output

# Open ~/.claude/settings.json and delete the two entries
# under "hooks" that reference "non-dev-output".
```

---

## License

MIT © [calmtiger86](https://github.com/calmtiger86)
