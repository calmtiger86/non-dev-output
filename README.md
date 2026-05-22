<div align="center">

# 🧠 non-dev-output

**The Claude Code plugin that speaks human.**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/calmtiger86/non-dev-output)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-blueviolet.svg)](https://claude.ai/code)
[![Language](https://img.shields.io/badge/language-KO%20%7C%20EN%20%7C%20ZH-orange.svg)](#)

[한국어](README.ko.md) · [English](README.md) · [中文](README.zh.md)

</div>

---

> *"The greatest barrier to understanding isn't complexity — it's vocabulary."*

Claude is brilliant. But when it explains a **race condition**, it says "concurrent worker threads accessing a shared resource without synchronization." When what you actually needed was: *two chefs grabbing the same order ticket at the same time.*

**non-dev-output** fixes that. Automatically. No commands. No setup. Just install and talk.

---

## ✨ What It Does

### 🎯 Auto-Detects Confusion
When you type *"what does that mean?"*, *"I don't understand"*, or *"explain it simply"* — the hook fires instantly, switching Claude into **analogy mode**.

```
You:    "I don't understand what a deadlock is"
Claude: ──────────────────────────────────────────
        By analogy
        Two people face each other in a narrow hallway.
        Person A holds the key to the right door (Lock 1),
        waiting for the left. Person B — the opposite.
        Neither yields. They're frozen forever (deadlock).
        The building manager (DB engine) has to drag
        one person back (rollback) to break it.

        In reality
        Two transactions wait for each other's locks in a
        cycle. The RDBMS detects the cycle in a wait-for
        graph and rolls back one side. Prevention: always
        acquire locks in the same order (lock ordering).
```

### ✍️ Korean Writing Mode
When you ask *"write a blog post"*, *"draft a newsletter"*, *"make a card news"* — Claude automatically:
- Removes AI default rhetoric (excessive bold, habitual 3-point lists, redundant phrasing)
- Writes in active voice at the sentence level
- Keeps formal Korean endings (존댓말)
- One point per thought — no padding

### 📚 Learns From You
Every time an analogy lands, it gets recorded. Future sessions start with analogies *already calibrated for you*.

---

## ⚡ How It Works

```
Session Start
└── session-start.sh
    └── Injects output-clarity rules into every conversation

Every Prompt (UserPromptSubmit hook)
└── clarity-keywords.mjs
    ├── Pattern: "what does that mean / I don't understand / explain simply"
    │   └── → [CLARITY-MISS] signal → analogy translation mode
    └── Pattern: "blog post / newsletter / card news + write/draft/create"
        └── → [WRITING-INTENT] signal → ko-humanche-calmta mode
```

**Zero false positives** — the writing detector requires both a content-type keyword AND an action verb. *"I saw this pattern in a blog"* → silent pass. *"Write me a blog post about..."* → triggered.

---

## 📦 Installation

### Via OMC (Recommended)
```bash
omc install non-dev-output
```

### Manual
```bash
# Clone to your Claude plugins directory
git clone https://github.com/calmtiger86/non-dev-output \
  ~/.claude/plugins/non-dev-output

# Restart Claude Code
```

> **Requirements:** Node.js 18+ · Claude Code · No external npm dependencies

---

## 🎛️ Trigger Reference

| Trigger Pattern | Language | Action |
|-----------------|----------|--------|
| "what does that mean", "I don't understand", "explain simply" | EN | Analogy mode |
| "무슨 말이야", "이해 안 돼", "쉽게 설명해줘" | KO | Analogy mode |
| "blog post / newsletter / card news + write" | EN | Writing mode |
| "블로그 써줘", "카드뉴스 만들어줘", "뉴스레터 작성" | KO | Writing mode |

---

## 🗂️ File Structure

```
non-dev-output/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest
├── hooks/
│   ├── hooks.json               # Auto-wires on install (no manual setup)
│   ├── session-start.sh         # Injects rules at session start
│   └── clarity-keywords.mjs    # Pattern detection engine (self-contained)
├── rules/
│   └── output-clarity.md       # The "two-block" analogy rule
└── skills/
    ├── explain-by-analogy/      # Deep analogy construction skill
    └── ko-humanche-calmta/      # Korean prose tone correction skill
```

---

## 🤝 Philosophy

This plugin exists because **the hardest part of learning isn't the concepts — it's the words used to describe them**. A race condition isn't hard to understand. "Concurrent thread synchronization failure" is.

Every analogy Claude generates gets tested against one question: *Can someone who has never written code understand this in 10 seconds?*

---

## 📄 License

MIT © [calmtiger86](https://github.com/calmtiger86)
