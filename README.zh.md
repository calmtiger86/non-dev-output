<div align="center">

# non-dev-output

### 用人话说话的 Claude Code 插件

[![Version](https://img.shields.io/badge/version-1.0.0-6c63ff.svg?style=flat-square)](https://github.com/calmtiger86/non-dev-output/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg?style=flat-square)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-f97316.svg?style=flat-square)](https://claude.ai/code)
[![Platform](https://img.shields.io/badge/platform-Mac%20%7C%20Linux%20%7C%20Windows-0ea5e9.svg?style=flat-square)](#安装)

**[한국어](README.ko.md) · [English](README.md) · 中文**

<br/>

> *你不需要学计算机的语言。*  
> *让计算机来学你的语言。*

</div>

---

## 问题所在

Claude 很聪明。但当你问"为什么我的应用变慢了？"，它会这样回答：

> *"瓶颈似乎在于 ORM 层生成的 N+1 查询，导致与数据库的冗余往返次数增加。"*

你来是想弄懂一件事，离开时却比来时更迷惑。

**non-dev-output** 从根源解决这个问题——自动触发，在 Claude 打出第一个字之前。

---

## 安装后的变化

**场景一——你没听懂解释：**

```
你:     "我还是不明白数据库索引是什么"

Claude: ──────────────────────────────────────────────────────────
        用类比来说 ↓
        想象一本1000页的词典。没有索引，找"星星"这个词
        就得从第1页翻起。有了索引（旁边的字母标签），
        直接翻到"X"就行了。
        数据库索引就是数据的"字母标签"——用一点额外空间，
        换来极快的查找速度。

        实际上 ↓
        CREATE INDEX idx ON 表名(列名);
        用 EXPLAIN 确认索引确实在被使用。
        只给查询频繁的列建索引——索引对写入有维护成本。
```

你什么命令都没输入。插件检测到"还是不明白"，自动切换了模式。

**场景二——你要写博客或公众号文章：**

```
你:     "帮我写一篇关于咖啡为什么能提高效率的博客"

Claude: （没有 AI 惯用套话——不会有"首先，值得注意的是……"，
         不会把三点总结再总结三遍，
         不会有什么都没说的"综上所述"结尾）
```

同样没有命令。插件检测到写作请求，悄悄应用了文字规范。

---

## 安装

### 方式 A — 使用 `claude plugin`（推荐，如有 Claude Code CLI）

```bash
claude plugin marketplace add https://github.com/calmtiger86/non-dev-output
claude plugin install non-dev-output@non-dev-output
```

重启 Claude Code，完成。

### 方式 B — 使用 `omc install`（适用于 oh-my-claudecode 用户）

```bash
omc install https://github.com/calmtiger86/non-dev-output
```

重启 Claude Code，完成。

### 方式 C — 手动安装（适用于所有环境）

**第一步** — 确认已安装 [Node.js](https://nodejs.org)（18 版本或以上）。  
在终端运行 `node --version`，能看到版本号就说明准备好了。

**第二步** — 下载本仓库：

```bash
git clone https://github.com/calmtiger86/non-dev-output
cd non-dev-output
```

**第三步** — 运行安装脚本：

```bash
node install.js
```

**第四步** — 重启 Claude Code，完成。

> 不需要 npm install。不需要配置文件。不需要 API 密钥。

---

## 自动触发词

插件自动监听以下内容——你无需输入任何命令。

**没听懂时（切换到类比模式）：**

| 你输入的内容 | 语言 |
|-------------|------|
| "什么意思"、"看不懂"、"简单说一下" | 中文 |
| "再解释一次"、"太难了"、"不明白" | 中文 |
| "이해가 안 돼", "무슨 말이야" | 韩语 |
| "I don't understand", "what does that mean" | 英语 |

**写作请求时（切换到自然文笔模式）：**

| 你输入的内容 | 语言 |
|-------------|------|
| "写博客"、"写公众号文章"、"写小红书" | 中文 |
| "写新闻稿"、"帮我起草一篇文章" | 中文 |
| "블로그 써줘", "카드뉴스 만들어줘" | 韩语 |

---

## 工作原理（给好奇的人）

```
每次会话开始
└── 将"双块规则"注入 Claude 的对话上下文
    （类比块 + 现实块，不混在一起）

每条消息发送时
└── 扫描困惑信号或写作信号
    ├── 检测到困惑 → 注入 [CLARITY-MISS] 指令
    └── 检测到写作 → 注入 [WRITING-INTENT] 指令
```

核心设计原则：**零误报**。写作检测需要内容关键词（博客、公众号……）和行为动词（写、起草、制作……）同时存在才会触发。随口提到"博客"不会触发。

---

## 文件结构

```
non-dev-output/
├── hooks/
│   ├── hooks.json               ← 安装时自动注册
│   ├── session-start.mjs        ← 会话启动时加载规则
│   └── clarity-keywords.mjs    ← 模式检测（自包含）
├── rules/
│   └── output-clarity.md       ← 双块规则
├── skills/
│   ├── explain-by-analogy/      ← 深度类比构建技能
│   └── ko-humanche-calmta/      ← 韩语散文校正技能
├── install.js                   ← 跨平台安装脚本
├── install.sh                   ← Mac/Linux 快捷方式
└── install.ps1                  ← Windows 快捷方式
```

---

## 卸载

```bash
# 删除插件文件
rm -rf ~/.claude/plugins/non-dev-output

# 打开 ~/.claude/settings.json
# 在 "hooks" 部分删除包含 "non-dev-output" 路径的两个条目。
```

---

## 许可证

MIT © [calmtiger86](https://github.com/calmtiger86)
