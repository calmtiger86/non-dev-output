<div align="center">

# non-dev-output

### A Claude Code plugin that explains tech like you're a human, not a compiler.

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

Claude gives brilliant answers. But when you ask *"why is my app slow?"*, it responds:

> *"The bottleneck appears to be N+1 query generation in the ORM layer, causing redundant round-trips to the database."*

You came here to understand something. You left more confused than before.

**non-dev-output** solves this at the source — automatically, before Claude even types its first word.

---

## What Happens After You Install

**Scenario 1 — You're confused by an explanation:**

```
You:    "I still don't understand what a database index is"

Claude: ──────────────────────────────────────────────────────────
        By analogy ↓
        Imagine a 1,000-page dictionary. Finding the word "serendipity"
        without an alphabetical index means reading from page 1. An index
        (the A–Z tabs on the side) lets you jump straight to "S."
        A database index works the same way — it's the A–Z tabs
        for your data, trading a little storage for a lot of speed.

        In reality ↓
        CREATE INDEX idx ON table(column);
        Use EXPLAIN to confirm the index is being used.
        Only index columns you query frequently — indexes have
        a maintenance cost on writes.
```

You didn't type any command. The plugin detected *"I still don't understand"* and switched modes automatically.

**Scenario 2 — You're writing a blog post or social caption:**

```
You:    "Write a blog post about why coffee makes you more productive"

Claude: (writes without AI clichés — no "Firstly, it is important to note
        that...", no three-bullet summaries of three-bullet lists,
        no "In conclusion" paragraphs that say nothing new)
```

Again — no command. The plugin detected the writing request and applied prose standards silently.

---

## Installation

### Option A — via `claude plugin` (recommended if you have Claude Code CLI)

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
If you can run `node --version` in a terminal, you're ready.

**Step 2** — Download this repository:

```bash
git clone https://github.com/calmtiger86/non-dev-output
cd non-dev-output
```

**Step 3** — Run the installer:

```bash
node install.js
```

**Step 4** — Restart Claude Code. Done.

> No npm install. No configuration files. No API keys.

---

## Trigger Words

The plugin watches for these automatically — you never have to type a command.

**Clarity triggers** (switches to analogy mode):

| What you type | Language |
|---------------|----------|
| "I don't understand", "what does that mean", "explain simply" | English |
| "이해가 안 돼", "무슨 말이야", "쉽게 설명해줘" | Korean |
| "什么意思", "看不懂", "简单说一下" | Chinese |
| "too technical", "what?", "explain it again" | English |

**Writing triggers** (switches to natural prose mode):

| What you type | Language |
|---------------|----------|
| "write a blog post / newsletter / caption" | English |
| "블로그 써줘", "카드뉴스 만들어줘", "뉴스레터 작성해줘" | Korean |
| "写博客", "写公众号文章", "写小红书" | Chinese |

---

## How It Works (For the Curious)

```
Every session start
└── Loads the "two-block rule" into Claude's context
    (analogy block + reality block, no mixing)

Every message you send
└── Scans for confusion or writing signals
    ├── Confusion detected → injects [CLARITY-MISS] instruction
    └── Writing detected  → injects [WRITING-INTENT] instruction
```

The key design choice: **no false positives**. Writing detection requires both a content keyword (blog, newsletter…) AND an action verb (write, draft, create…). Mentioning a blog in passing won't trigger it.

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

# Then open ~/.claude/settings.json and remove the two entries
# that reference "non-dev-output" under the "hooks" section.
```

---

## License

MIT © [calmtiger86](https://github.com/calmtiger86)
