<div align="center">

# 🧠 non-dev-output

**用人类语言说话的 Claude Code 插件。**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/calmtiger86/non-dev-output)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-blueviolet.svg)](https://claude.ai/code)
[![Language](https://img.shields.io/badge/language-KO%20%7C%20EN%20%7C%20ZH-orange.svg)](#)

[한국어](README.ko.md) · [English](README.md) · [中文](README.zh.md)

</div>

---

> *"理解最大的障碍不是复杂性，而是词汇。"*

Claude 很聪明。但当它解释**竞态条件**时，它会说"多个工作线程在没有同步的情况下并发访问共享资源"。而你真正需要的是：*两位厨师同时抢走同一张点餐单。*

**non-dev-output** 解决这个问题。自动运行。无需命令。安装即用。

---

## ✨ 功能介绍

### 🎯 自动检测困惑
当你输入 *"这是什么意思？"*、*"我不理解"*、*"用简单的话解释"* — 钩子立即触发，将 Claude 切换到**类比模式**。

```
你:     "我不明白死锁是什么"
Claude: ──────────────────────────────────────────────────
        用类比来说
        两个人在狭窄的走廊里面对面站着。A 拿着右门的钥匙
        （锁1），等待左边的。B 则相反。两人都不让步，永远
        僵住了（死锁）。楼管（数据库引擎）必须强制把一个人
        拉回去（回滚）才能解开。

        实际上
        两个事务相互等待对方的锁，形成循环等待。RDBMS 在
        等待图中检测到循环，回滚其中一方。预防方法：所有事务
        按相同顺序获取锁（锁排序）。
```

### ✍️ 中文/韩文写作自动优化
当你要求 *"写一篇博客"*、*"起草新闻稿"*、*"制作卡片新闻"* — Claude 自动：
- 去除 AI 默认修辞结构（过度加粗、惯性三点式、冗余表述）
- 以句子为单位使用主动语态
- 核心只有一个时只说一个——没有填充内容

### 📚 持续学习的类比库
每当一个类比奏效，它就会被记录。下次会话从*已为你校准*的类比开始。

---

## ⚡ 工作原理

```
会话开始
└── session-start.sh
    └── 将 output-clarity 规则注入每个对话

每条提示（UserPromptSubmit 钩子）
└── clarity-keywords.mjs
    ├── 模式："什么意思 / 不理解 / 简单解释"
    │   └── → [CLARITY-MISS] 信号 → 类比翻译模式
    └── 模式："博客/新闻稿/卡片新闻 + 写/起草/制作"
        └── → [WRITING-INTENT] 信号 → 写作优化模式
```

**零误报** — 写作检测需要内容类型关键词 + 行为动词的 AND 条件。*"我在博客上看到这个代码"* → 静默通过。*"帮我写一篇博客"* → 触发。

---

## 📦 安装

### 通过 OMC（推荐）
```bash
omc install non-dev-output
```

### 手动安装
```bash
# 克隆到 Claude 插件目录
git clone https://github.com/calmtiger86/non-dev-output \
  ~/.claude/plugins/non-dev-output

# 重启 Claude Code
```

> **环境要求：** Node.js 18+ · Claude Code · 无外部 npm 依赖

---

## 🎛️ 触发词参考

| 触发模式 | 语言 | 动作 |
|----------|------|------|
| "什么意思"、"不理解"、"简单解释" | 中文 | 类比模式 |
| "무슨 말이야"、"이해 안 돼"、"쉽게 설명해줘" | 韩语 | 类比模式 |
| "what does that mean"、"I don't understand" | 英文 | 类比模式 |
| "写博客"、"起草新闻稿"、"制作卡片" | 中文 | 写作优化模式 |
| "블로그 써줘"、"카드뉴스 만들어줘" | 韩语 | 写作优化模式 |

---

## 🗂️ 文件结构

```
non-dev-output/
├── .claude-plugin/
│   └── plugin.json              # 插件清单
├── hooks/
│   ├── hooks.json               # 安装时自动连线（无需手动配置）
│   ├── session-start.sh         # 会话启动时注入规则
│   └── clarity-keywords.mjs    # 模式检测引擎（自包含）
├── rules/
│   └── output-clarity.md       # "双块"类比规则
└── skills/
    ├── explain-by-analogy/      # 深度类比构建技能
    └── ko-humanche-calmta/      # 韩语散文语调校正技能
```

---

## 🤝 设计理念

这个插件基于一个信念：**学习中最难的部分不是概念本身，而是用来描述概念的词语**。竞态条件并不难理解。"并发线程同步失败"才难。

Claude 生成的每一个类比都接受一个问题的检验：*一个从未写过代码的人能在 10 秒内理解这个吗？*

---

## 📄 许可证

MIT © [calmtiger86](https://github.com/calmtiger86)
