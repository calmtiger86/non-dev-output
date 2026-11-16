<div align="center">

# non-dev-output

### 사람 말로 설명하는 Claude Code 플러그인

[![Version](https://img.shields.io/badge/version-2.0.0-6c63ff.svg?style=flat-square)](https://github.com/calmtiger86/non-dev-output/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg?style=flat-square)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-f97316.svg?style=flat-square)](https://claude.ai/code)

**한국어 · [English](README.md) · [中文](README.zh.md)**

<br/>

> *컴퓨터의 언어를 배울 필요 없습니다.*  
> *컴퓨터가 당신의 언어를 배우면 됩니다.*

</div>

---

## 문제

Claude는 똑똑합니다. 그런데 "왜 앱이 느려요?"라고 물으면 이렇게 답합니다.

> *"ORM 레이어에서 N+1 쿼리가 발생해 데이터베이스 왕복 횟수가 증가하는 것이 병목으로 판단됩니다."*

더 모르는 채로 화면을 닫습니다.

**non-dev-output**은 Claude가 설명하는 방식 자체를 바꿉니다. 어려운 말을 일상의 장면으로 옮겨 먼저 보여 주고, 정확한 기술 내용은 따로 모아 둡니다.

---

## 설치하면

**상황 1 — 이해가 안 됐을 때:**

```
나:     "인덱스가 아직도 이해가 안 돼요"

Claude: ──────────────────────────────────────────────────
        비유로 ↓
        책 뒤에 있는 찾아보기 페이지 있잖아요.
        "사랑"을 찾을 때 'ㅅ'을 펴면 바로 나옵니다.
        그게 없으면 1페이지부터 한 장씩 넘겨야 합니다.
        데이터베이스 인덱스가 그 찾아보기입니다.
        공간을 조금 더 쓰는 대신, 찾는 속도가 빨라집니다.

        실제로는 ↓
        CREATE INDEX idx ON 테이블명(컬럼명);
        EXPLAIN으로 인덱스가 실제로 타는지 확인합니다.
        읽기보다 쓰기가 잦은 컬럼에는 만들지 않는 편이 낫습니다.
```

명령은 필요 없습니다. 세션이 시작될 때 "두 블록 규칙"이 Claude에게 전달되어 있기 때문에, 같은 것을 다시 묻거나 이해하지 못했다고 하면 Claude가 이 모양으로 다시 설명합니다.

**상황 2 — 블로그 글을 써달라고 했을 때:**

```
나:     "커피와 생산성에 관한 블로그 글 써줘"

플러그인 없이:
        커피가 생산성에 미치는 영향은 다양합니다.
        첫째, 카페인은 집중력을 높여줍니다.
        둘째, 피로를 줄여줍니다.
        결론적으로, 커피는 생산성에 긍정적인 영향을 미칩니다.

플러그인 있을 때:
        매일 아침 커피 한 잔을 마십니다. 잠을 깨려고 마십니다.
        그런데 카페인이 뇌에서 하는 일은 단순히 잠을 쫓는 게 아닙니다.
        졸음 신호를 차단하는 동안, 뇌가 조금 더 날카롭게 돌아갑니다.
        그걸 우리는 집중력이라고 부릅니다.
```

글쓰기 요청이면 Claude가 `ko-humanche-calmta` 스킬(특정 작업용 지침 묶음)을 불러 AI 상투어를 걷어내고 씁니다. 스킬을 부를지는 Claude가 요청 내용을 보고 판단하므로, 매번 반드시 불리는 것은 아닙니다. 위 예시는 이해를 돕기 위한 장면입니다.

---

## 설치

non-dev-output은 Claude Code 플러그인(기능을 덧붙이는 확장 묶음)입니다. 플러그인을 내려받는 목록인 마켓플레이스 `calmtiger86/non-dev-output`에서 설치합니다. 쓰는 곳에 맞는 방법 하나만 고르세요.

### Claude Code 안에서 (v2.1.275 이상)

```
/plugin install non-dev-output --marketplace calmtiger86/non-dev-output
```

### 터미널에서 (v2.1.292 이상)

```bash
claude plugin install non-dev-output --marketplace calmtiger86/non-dev-output
```

### Claude 데스크톱 앱

프롬프트 입력창 옆의 **+** 버튼을 누르고, **Add plugins**에서 마켓 `calmtiger86/non-dev-output`을 추가한 뒤 non-dev-output을 설치합니다.

> 설치한 뒤 반영되지 않으면, 실행 중인 세션에서 `/reload-plugins`를 입력하거나 Claude Code를 다시 시작하세요.

**Node.js는 없어도 됩니다.** 세션을 시작할 때 규칙을 불러오는 훅(정해진 시점에 자동으로 실행되는 작은 명령)이 `cat` 명령 한 줄이기 때문입니다. 명령 뒤에 `exit 0`이 붙어 있어서 규칙 파일을 못 읽는 경우에도 오류 줄이 보이지 않습니다. 이 동작은 macOS에서 확인했고, Git Bash가 없는 Windows(PowerShell)에서는 아직 확인하지 못했습니다.

---

## 동작 방식

```
세션이 시작될 때 (startup · clear · compact)
└── "두 블록 규칙"(rules/output-clarity.md)을 Claude의 대화에 넣습니다
    (비유 블록 + 실제 블록, 섞지 않음)

대화하는 동안
├── 이해하지 못했다고 하거나 같은 것을 다시 물으면
│   └── 규칙에 따라 비유 두 블록으로 다시 설명합니다
├── "쉽게 설명해줘", "이거 어려워" 같은 말이 오면
│   └── explain-by-analogy 스킬이 비유 구성을 도와줍니다
└── "다듬어줘", "AI톤 제거", "블로그 써줘" 같은 말이 오면
    └── ko-humanche-calmta 스킬이 한국어 글을 자연스럽게 고칩니다
```

메시지를 보낼 때마다 도는 감지 훅은 없습니다. 입력한 글을 읽거나 기록하는 부분이 없고, 기록 파일도 만들지 않습니다.

스킬은 Claude가 요청에 맞는지 판단해서 불러 쓰며, 직접 부르려면 `/explain-by-analogy` 또는 `/ko-humanche-calmta`를 입력합니다. 다른 플러그인에 같은 이름이 있으면 `/non-dev-output:explain-by-analogy`처럼 플러그인 이름을 앞에 붙이세요.

---

## 업데이트와 제거

### 업데이트

- 이 마켓은 자동 업데이트가 기본으로 꺼져 있습니다. `/plugin`을 입력하고 Marketplaces 탭에서 이 마켓의 자동 업데이트를 켜 두면 새 버전을 자동으로 받습니다.
- 직접 받으려면 터미널에서 아래 명령을 실행합니다.

```bash
claude plugin update non-dev-output@non-dev-output
```

- 이미 실행 중인 세션에서는 `/reload-plugins`를 입력해야 새 버전이 적용됩니다.

### 제거

```bash
claude plugin uninstall non-dev-output@non-dev-output
```

---

## 1.x에서 옮기기

2.0부터 설치는 위의 마켓 방법 하나뿐입니다. 예전의 `omc install`, `install.js`(방법 C) 설치는 없어졌습니다. 1.x를 쓰던 분은 아래 순서로 옮기세요.

1. 위의 [설치](#설치) 방법으로 2.0을 설치합니다.
2. 아래 정리 도구로 예전 흔적을 지웁니다. 정리 도구를 실행하려면 Node.js가 필요합니다.
3. Claude Code를 다시 시작합니다.

**정리 도구가 지우는 것:**

- `install.js`(방법 C)로 설치했다면, `~/.claude/plugins/non-dev-output/` 폴더와 `~/.claude/settings.json`에 적힌 이 플러그인의 훅 항목. 다른 훅은 그대로 둡니다.
- 1.x 훅이 남긴 `~/.omc/state/clarity-events.jsonl`(메시지 앞 200자 기록)과 `~/.omc/state/clarity-claims/`. 마켓으로 설치했어도 이 기록은 남아 있을 수 있습니다.

```bash
# 예전에 내려받은 폴더가 있으면 git pull, 없으면 아래 두 줄
git clone https://github.com/calmtiger86/non-dev-output
cd non-dev-output

node scripts/remove-legacy.mjs           # 미리보기: 무엇을 지울지 보여 주기만 합니다
node scripts/remove-legacy.mjs --apply   # 설정 폴더의 backups에 백업한 뒤 정리합니다
```

- 설정 폴더를 `CLAUDE_CONFIG_DIR`로 옮겨 쓰는 경우에도 그 폴더를 따릅니다.
- `settings.json`을 읽지 못하면(쉼표 하나가 틀렸을 때 등) `settings.json`과 예전 폴더를 건드리지 않고 알려 줍니다. 고친 뒤 다시 실행하세요.
- 메시지 기록 파일에는 입력한 글의 앞부분이 그대로 들어 있을 수 있어, 백업에도 사본(`omc-state` 폴더)이 남습니다. 필요 없으면 그 폴더를 지우세요.

**2.0에서 달라진 점:**

- 메시지를 보낼 때마다 도는 감지 훅과 입력 기록이 없어졌습니다. 이해하지 못했다는 말에 대한 대응은 규칙의 한 문장으로 옮겼고, 글쓰기 요청은 `ko-humanche-calmta` 스킬의 발동 낱말이 맡습니다.
- 세션을 시작할 때 `~/.claude/rules/common/output-clarity.md`가 이미 있으면 규칙을 건너뛰던 기능이 없어졌습니다. 그 파일을 직접 두고 이 플러그인도 켜면 규칙이 두 번 들어갑니다(약 2.7KB).
- 스킬의 사전 승인(`allowed-tools`)을 줄였습니다. 스킬이 불린 턴에도 파일 수정이나 셸 명령은 평소처럼 확인 창을 거칩니다.

---

## 파일 구조

```
non-dev-output/
├── .claude-plugin/
│   ├── plugin.json              ← 플러그인 정보
│   └── marketplace.json         ← 마켓 정보
├── hooks/
│   ├── hooks.json               ← 세션 시작 때 규칙을 넣는 훅 (cat 한 줄)
│   └── hooks.test.mjs           ← 훅 명령 점검
├── rules/
│   └── output-clarity.md        ← 두 블록 규칙
├── skills/
│   ├── explain-by-analogy/      ← 비유 구성 스킬
│   └── ko-humanche-calmta/      ← 한국어 산문 보정 스킬
└── scripts/
    ├── remove-legacy.mjs        ← 1.x 흔적 정리 도구
    └── remove-legacy.test.mjs   ← 정리 도구 점검
```

---

## 기여

버그 신고나 개선 제안은 언제든 환영합니다.

**점검 실행.** 고친 뒤에는 저장소 폴더에서 아래 명령으로 점검합니다.

```bash
node hooks/hooks.test.mjs
node scripts/remove-legacy.test.mjs
claude plugin validate .
```

**고친 내용을 배포하려면** `.claude-plugin/plugin.json`과 `.claude-plugin/marketplace.json`에 있는 `version`을 모두 같은 새 번호로 올려야 합니다. 번호가 그대로면 사용자가 업데이트해도 "이미 최신"이라고 나오고 새 내용을 받지 못합니다.

---

## 라이선스

MIT © [calmtiger86](https://github.com/calmtiger86)
