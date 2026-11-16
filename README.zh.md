<div align="center">

# non-dev-output

### 用人话说话的 Claude Code 插件

[![Version](https://img.shields.io/badge/version-2.0.0-6c63ff.svg?style=flat-square)](https://github.com/calmtiger86/non-dev-output/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg?style=flat-square)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-f97316.svg?style=flat-square)](https://claude.ai/code)

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

**non-dev-output** 改变的是 Claude 讲解的方式：先把难懂的词换成日常场景，再把准确的技术内容单独放在另一块里。

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

不需要输入任何命令。会话一开始，"双块规则"就会交给 Claude，规则里有一句话：当你再问一次、或者说没听懂时，要用这个格式重新讲解。Claude 是按规则来做，而不是固定脚本，所以每次的结果不一定完全一样。

**场景二——你要写一篇韩语博客（这里翻译成中文示意）：**

```
你:     "帮我写一篇关于咖啡为什么能提高效率的博客"

Claude: （没有 AI 惯用套话——不会有"首先，值得注意的是……"，
         不会把三点总结再总结三遍，
         不会有什么都没说的"综上所述"结尾）
```

遇到写作请求时，Claude 可以调用 `ko-humanche-calmta` 技能（针对某类任务的一组指令）来去掉 AI 套话。是否调用由 Claude 根据请求内容判断，不保证每次都会调用。上面只是示意。该技能是为韩语文章写的，触发词是韩语（外加 "humanize"），所以这个场景适用于韩语请求。

---

## 安装

non-dev-output 是 Claude Code 插件。请从插件市场 `calmtiger86/non-dev-output` 安装。按你使用的环境选择一种方式即可。

### 在 Claude Code 里（v2.1.275 或更高）

```
/plugin install non-dev-output --marketplace calmtiger86/non-dev-output
```

### 在终端里（v2.1.292 或更高）

```bash
claude plugin install non-dev-output --marketplace calmtiger86/non-dev-output
```

### Claude 桌面应用

点击输入框旁边的 **+** 按钮，选择 **Add plugins**，添加市场 `calmtiger86/non-dev-output`，然后安装 non-dev-output。

> 安装后如果没有生效，在运行中的会话里输入 `/reload-plugins`，或重启 Claude Code。

**不需要 Node.js。** 会话开始时加载规则的钩子（Claude Code 在固定时刻自动执行的小命令）只是一行 `cat` 命令。命令末尾有 `exit 0`，即使读不到规则文件也不会出现错误提示。该行为已在 macOS 上确认；在没有 Git Bash 的 Windows（PowerShell）上尚未确认。

---

## 工作原理

```
会话开始时（startup · clear · compact）
└── 把"双块规则"（rules/output-clarity.md）放进 Claude 的对话上下文
    （类比块 + 现实块，不混在一起）

对话过程中
├── 你说没听懂，或把同一个问题再问一遍
│   └── Claude 按规则用类比 + 实际两个块重新讲解
├── "explain simply"、"analogy"、"쉽게 설명해줘"、"이거 어려워" 之类的话
│   └── explain-by-analogy 技能帮助构建类比
└── "다듬어줘"、"AI톤 제거"、"블로그 써줘"、"humanize" 之类的话（韩语写作）
    └── ko-humanche-calmta 技能把韩语文章改得更自然
```

没有"每发一条消息就运行一次"的检测钩子。插件不读取也不记录你输入的内容，也不会创建日志文件。

技能是否适用由 Claude 判断。想自己调用，输入 `/explain-by-analogy` 或 `/ko-humanche-calmta`。如果别的插件有同名技能，请在前面加上插件名：`/non-dev-output:explain-by-analogy`。

---

## 更新与卸载

### 更新

- 这个市场默认关闭自动更新。输入 `/plugin`，在 Marketplaces 标签页里打开这个市场的自动更新，就会自动获取新版本。
- 想手动更新，在终端运行：

```bash
claude plugin update non-dev-output@non-dev-output
```

- 已经在运行的会话里，需要输入 `/reload-plugins` 才会应用新版本。

### 卸载

```bash
claude plugin uninstall non-dev-output@non-dev-output
```

---

## 从 1.x 迁移

从 2.0 开始，只能通过插件市场安装。旧 README 里的 `omc install` 说明已删除，`install.js`（方式 C）也已取消。用过 1.x 的话，请按下面的步骤迁移：

1. 获取 2.0。
   - 如果你是从市场安装的：它已经装好了，所以不要用安装命令，而是在终端运行 `claude plugin update non-dev-output@non-dev-output`。
   - 如果你用 `install.js`（方式 C）安装过：用上面的方式安装 2.0。
2. 用下面的清理工具删除旧版本的残留。运行它需要 Node.js。
3. 重启 Claude Code。

**清理工具会删除：**

- 如果你用 `install.js`（方式 C）安装过：`~/.claude/plugins/non-dev-output/` 文件夹，以及 `~/.claude/settings.json` 里属于本插件的钩子条目。只删除与 `install.js` 写入的格式（`node "…/plugins/non-dev-output/hooks/….mjs"`）完全一致的条目。格式哪怕有一点不同的钩子都不会删，并会告诉你那是什么命令。
- 1.x 的钩子留下的 `~/.omc/state/clarity-events.jsonl`（消息的前 200 个字符）和 `~/.omc/state/clarity-claims/`。即使你是从市场安装的，这些文件也可能存在。

如果你已安装或更新到 2.0，清理工具就在市场副本里。

```bash
node ~/.claude/plugins/marketplaces/non-dev-output/scripts/remove-legacy.mjs           # 预览：只显示会删除什么
node ~/.claude/plugins/marketplaces/non-dev-output/scripts/remove-legacy.mjs --apply   # 先备份到配置文件夹的 backups，再清理
```

如果那个路径下没有文件，或者你的命令行不认识 `~`（比如 Windows 命令提示符），就把仓库下载到一个新文件夹，再用同样的命令：

```bash
git clone https://github.com/calmtiger86/non-dev-output non-dev-output-cleanup
cd non-dev-output-cleanup
node scripts/remove-legacy.mjs           # 预览
node scripts/remove-legacy.mjs --apply   # 先备份，再清理
```

- 如果你用 `CLAUDE_CONFIG_DIR` 改了配置文件夹，工具会跟随该文件夹。
- 如果读不了 `settings.json`（比如多了一个逗号），工具不会碰 `settings.json` 和旧文件夹，只会提示你。修好后再运行。
- 消息记录文件里可能以明文保存着你输入内容的开头，所以备份里也会有一份副本（`omc-state` 文件夹）。不需要的话请删掉那个文件夹。

**2.0 的变化：**

- 每条消息都运行的检测钩子和输入记录已经取消。对"没听懂"的响应改成了规则里的一句话，写作请求则由 `ko-humanche-calmta` 技能的触发词负责。
- 以前当 `~/.claude/rules/common/output-clarity.md` 已存在时会跳过规则，这个功能取消了。如果你自己放了这个文件、又启用了本插件，规则会被加载两次（约 2.7KB）。
- 缩小了技能的预先授权（`allowed-tools`）。即使在技能运行的这一轮，修改文件和执行 shell 命令也和平时一样会弹出确认。

---

## 文件结构

```
non-dev-output/
├── .claude-plugin/
│   ├── plugin.json              ← 插件信息
│   └── marketplace.json         ← 市场信息
├── hooks/
│   ├── hooks.json               ← 会话开始时加载规则（一行 cat）
│   └── hooks.test.mjs           ← 钩子命令检查
├── rules/
│   └── output-clarity.md        ← 双块规则
├── skills/
│   ├── explain-by-analogy/      ← 类比构建技能
│   └── ko-humanche-calmta/      ← 韩语散文校正技能
└── scripts/
    ├── remove-legacy.mjs        ← 1.x 残留清理工具
    └── remove-legacy.test.mjs   ← 清理工具检查
```

---

## 贡献

欢迎随时提交问题和建议。

**运行检查。** 修改之后，在仓库文件夹里运行：

```bash
node hooks/hooks.test.mjs
node scripts/remove-legacy.test.mjs
claude plugin validate .
```

**发布修改时**，要把 `.claude-plugin/plugin.json` 和 `.claude-plugin/marketplace.json` 里的 `version` 都改成同一个新版本号。版本号不变的话，用户更新时只会看到"已是最新"，收不到新内容。

---

## 许可证

MIT © [calmtiger86](https://github.com/calmtiger86)
