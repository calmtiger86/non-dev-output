<div align="center">

# non-dev-output

### 사람 말로 설명하는 Claude Code 플러그인

[![Version](https://img.shields.io/badge/version-1.0.0-6c63ff.svg?style=flat-square)](https://github.com/calmtiger86/non-dev-output/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg?style=flat-square)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-f97316.svg?style=flat-square)](https://claude.ai/code)
[![Platform](https://img.shields.io/badge/platform-Mac%20%7C%20Linux%20%7C%20Windows-0ea5e9.svg?style=flat-square)](#설치)

**한국어 · [English](README.md) · [中文](README.zh.md)**

<br/>

> *컴퓨터의 언어를 배울 필요 없습니다.*  
> *컴퓨터가 당신의 언어를 배우면 됩니다.*

</div>

---

## 문제

Claude는 똑똑합니다. 그런데 "왜 앱이 느려요?"라고 물으면 이렇게 답합니다.

> *"ORM 레이어에서 N+1 쿼리가 발생해 데이터베이스 왕복 횟수가 증가하는 것이 병목으로 판단됩니다."*

이해하러 왔다가 더 모르는 상태로 떠납니다.

**non-dev-output**은 이 문제를 근원에서 잡습니다 — Claude가 첫 글자를 타이핑하기 전에, 자동으로.

---

## 설치 후 달라지는 것

**상황 1 — 설명을 이해 못 했을 때:**

```
나:     "데이터베이스 인덱스가 뭔지 여전히 이해가 안 돼요"

Claude: ──────────────────────────────────────────────────────────
        비유로 ↓
        1,000페이지짜리 사전을 생각해보세요. "사랑"이라는 단어를
        색인(ㄱ~ㅎ 탭) 없이 찾으려면 1페이지부터 넘겨야 합니다.
        색인 탭이 있으면 "ㅅ" 탭을 열고 바로 점프하죠.
        데이터베이스 인덱스도 같습니다 — 데이터의 "색인 탭"이에요.
        조금 더 많은 공간을 쓰는 대신, 찾는 속도가 극적으로 빨라집니다.

        실제로는 ↓
        CREATE INDEX idx ON 테이블명(컬럼명);
        EXPLAIN으로 인덱스가 실제로 타이는지 확인합니다.
        쓰기가 잦은 컬럼보다 조회가 잦은 컬럼에만 만드세요.
```

아무 명령도 입력하지 않았습니다. 플러그인이 "이해가 안 돼요"를 감지하고 자동으로 모드를 전환했습니다.

**상황 2 — 블로그나 SNS 글을 쓸 때:**

```
나:     "커피가 생산성에 좋은 이유에 대해 블로그 글 써줘"

Claude: (AI 특유의 클리셰 없이 작성 — "첫째로, 중요한 점은...",
        세 줄 요약을 다시 세 줄로 반복하는 구성,
        아무 말도 안 하는 "결론적으로" 단락 없음)
```

역시 명령 없음. 플러그인이 글쓰기 요청을 감지하고 조용히 기준을 적용했습니다.

---

## 설치

### 방법 A — `claude plugin`으로 설치 (Claude Code CLI가 있는 경우 권장)

```bash
claude plugin marketplace add https://github.com/calmtiger86/non-dev-output
claude plugin install non-dev-output@non-dev-output
```

Claude Code 재시작. 끝.

### 방법 B — `omc install`로 설치 (oh-my-claudecode 사용 시)

```bash
omc install https://github.com/calmtiger86/non-dev-output
```

Claude Code 재시작. 끝.

### 방법 C — 직접 설치 (어디서나 동작)

**1단계** — [Node.js](https://nodejs.org)가 설치돼 있는지 확인합니다 (버전 18 이상).  
터미널에서 `node --version`을 실행해서 버전이 나오면 준비 완료입니다.

**2단계** — 이 저장소를 다운로드합니다:

```bash
git clone https://github.com/calmtiger86/non-dev-output
cd non-dev-output
```

**3단계** — 설치 스크립트를 실행합니다:

```bash
node install.js
```

**4단계** — Claude Code를 재시작합니다. 끝.

> npm install 없음. 설정 파일 없음. API 키 없음.

---

## 자동 감지 키워드

플러그인이 자동으로 감지합니다 — 별도 명령이 필요 없습니다.

**이해 못 했을 때 (비유 모드로 전환):**

| 입력 | 언어 |
|------|------|
| "이해가 안 돼", "무슨 말이야", "쉽게 설명해줘" | 한국어 |
| "뭔 뜻이야", "다시 설명해줘", "더 쉽게" | 한국어 |
| "I don't understand", "what does that mean" | 영어 |
| "什么意思", "看不懂" | 중국어 |

**글쓰기 요청 (자연스러운 글쓰기 모드로 전환):**

| 입력 | 언어 |
|------|------|
| "블로그 써줘", "카드뉴스 만들어줘" | 한국어 |
| "뉴스레터 작성해줘", "인스타 포스트" | 한국어 |
| "기고문 써줘", "칼럼 초안 잡아줘" | 한국어 |

---

## 동작 원리 (궁금한 분을 위해)

```
세션 시작할 때마다
└── "두 블록 규칙"을 Claude 대화에 자동 주입
    (비유 블록 + 실제 블록, 섞지 않음)

메시지를 보낼 때마다
└── 혼란 신호 또는 글쓰기 신호 감지
    ├── 혼란 감지 → [CLARITY-MISS] 지시 주입
    └── 글쓰기 감지 → [WRITING-INTENT] 지시 주입
```

핵심 설계 원칙: **오탐 제로**. 글쓰기 감지는 콘텐츠 키워드(블로그, 뉴스레터…) + 행위 동사(써줘, 작성해줘…)가 동시에 있어야만 발동합니다. 단순히 "블로그에서 봤는데"는 트리거되지 않습니다.

---

## 파일 구조

```
non-dev-output/
├── hooks/
│   ├── hooks.json               ← 설치 시 자동 등록
│   ├── session-start.mjs        ← 세션 시작 시 규칙 로드
│   └── clarity-keywords.mjs    ← 패턴 감지 (자체 완결)
├── rules/
│   └── output-clarity.md       ← 두 블록 규칙
├── skills/
│   ├── explain-by-analogy/      ← 비유 구성 심층 스킬
│   └── ko-humanche-calmta/      ← 한국어 산문 보정 스킬
├── install.js                   ← 크로스 플랫폼 설치 스크립트
├── install.sh                   ← Mac/Linux 단축 실행
└── install.ps1                  ← Windows 단축 실행
```

---

## 제거

```bash
# 플러그인 파일 삭제
rm -rf ~/.claude/plugins/non-dev-output

# ~/.claude/settings.json 을 열어서
# "hooks" 섹션 안에 "non-dev-output" 경로가 들어간 두 항목을 삭제합니다.
```

---

## 라이선스

MIT © [calmtiger86](https://github.com/calmtiger86)
