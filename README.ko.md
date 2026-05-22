<div align="center">

# 🧠 non-dev-output

**사람의 언어로 말하는 Claude Code 플러그인.**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/calmtiger86/non-dev-output)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-plugin-blueviolet.svg)](https://claude.ai/code)
[![Language](https://img.shields.io/badge/language-KO%20%7C%20EN%20%7C%20ZH-orange.svg)](#)

[한국어](README.ko.md) · [English](README.md) · [中文](README.zh.md)

</div>

---

> *"이해의 가장 큰 장벽은 복잡성이 아니라 용어다."*

Claude는 똑똑합니다. 하지만 **레이스 컨디션**을 설명할 때 "동기화 없이 공유 자원에 동시 접근하는 워커 스레드"라고 말합니다. 당신에게 필요한 건 이거였는데: *두 요리사가 같은 주문표를 동시에 집는 상황.*

**non-dev-output**가 그걸 고쳐줍니다. 자동으로. 명령 없이. 그냥 설치하고 말만 하면 됩니다.

---

## ✨ 무엇을 해주나요

### 🎯 혼란 자동 감지
*"무슨 말이야?"*, *"이해가 안 돼"*, *"쉽게 설명해줘"* — 이 말들을 입력하는 순간 훅이 발동해 Claude를 **비유 번역 모드**로 전환합니다.

```
나:     "데드락이 뭔지 이해가 안 돼"
Claude: ──────────────────────────────────────────────────
        비유로
        좁은 복도에서 두 사람이 마주 봤습니다. A는 오른쪽
        문 열쇠(락 1)를 쥐고 왼쪽(락 2)을 기다리고, B는
        반대. 둘 다 양보 안 해 영원히 막힙니다(데드락).
        관리인(DB 엔진)이 한쪽을 강제로 뒤로 빼야(롤백)
        풀립니다.

        실제로는
        두 트랜잭션이 서로의 락을 기다리는 순환 대기.
        RDBMS가 wait-for 그래프에서 사이클을 찾아 한쪽을
        롤백합니다. 예방은 모든 트랜잭션이 락을 같은 순서로
        잡는 것(lock ordering).
```

### ✍️ 한국어 글쓰기 자동 보정
*"블로그 글 써줘"*, *"뉴스레터 작성해줘"*, *"카드뉴스 만들어줘"* — 이렇게 요청하면 Claude가 자동으로:
- AI 특유의 수사 구조 제거 (강조 남발, 습관적 3분류, 이중서술)
- 문장 단위 능동형으로 작성
- 존댓말 어미 유지
- 핵심 하나면 하나만 — 허수 없음

### 📚 학습하는 비유 뱅크
비유가 통할 때마다 기록됩니다. 다음 세션부터는 *당신에게 맞게 보정된* 비유로 시작합니다.

---

## ⚡ 동작 원리

```
세션 시작
└── session-start.sh
    └── output-clarity 규칙을 모든 대화에 주입

모든 프롬프트 (UserPromptSubmit 훅)
└── clarity-keywords.mjs
    ├── 패턴: "무슨 말 / 이해 안 돼 / 쉽게 설명"
    │   └── → [CLARITY-MISS] 신호 → 비유 번역 모드
    └── 패턴: "블로그/뉴스레터/카드뉴스 + 써/작성/만들"
        └── → [WRITING-INTENT] 신호 → ko-humanche-calmta 모드
```

**거짓 양성 제로** — 글쓰기 감지는 콘텐츠 키워드 + 행위 동사 AND 조건을 요구합니다. *"블로그에서 본 코드 패턴인데"* → 조용히 통과. *"블로그 글 써줘"* → 발동.

---

## 📦 설치

### OMC 사용 (권장)
```bash
omc install non-dev-output
```

### 수동 설치
```bash
# Claude 플러그인 디렉토리에 클론
git clone https://github.com/calmtiger86/non-dev-output \
  ~/.claude/plugins/non-dev-output

# Claude Code 재시작
```

> **필요 환경:** Node.js 18+ · Claude Code · 외부 npm 패키지 없음

---

## 🎛️ 트리거 레퍼런스

| 트리거 패턴 | 동작 |
|------------|------|
| "무슨 말이야", "이해 안 돼", "쉽게 설명해줘", "다시 설명해줘" | 비유 번역 모드 |
| "이해가 안 가", "뭔 뜻이야", "쉽게 풀어줘" | 비유 번역 모드 |
| "블로그 써줘", "카드뉴스 만들어줘" | 글쓰기 보정 모드 |
| "뉴스레터 작성해줘", "인스타 포스트" | 글쓰기 보정 모드 |
| "기고문 써줘", "칼럼 초안 잡아줘" | 글쓰기 보정 모드 |

---

## 🗂️ 파일 구조

```
non-dev-output/
├── .claude-plugin/
│   └── plugin.json              # 플러그인 메타데이터
├── hooks/
│   ├── hooks.json               # 설치 시 자동 배선 (수동 설정 불필요)
│   ├── session-start.sh         # 세션 시작 시 규칙 주입
│   └── clarity-keywords.mjs    # 패턴 감지 엔진 (자체 완결)
├── rules/
│   └── output-clarity.md       # 두 블록 비유 규칙
└── skills/
    ├── explain-by-analogy/      # 비유 구성 심층 스킬
    └── ko-humanche-calmta/      # 한국어 산문 톤 보정 스킬
```

---

## 🤝 철학

이 플러그인은 **학습의 가장 어려운 부분이 개념이 아니라 그 개념을 설명하는 단어들**이라는 믿음에서 만들어졌습니다. 레이스 컨디션은 이해하기 어렵지 않습니다. "동시 스레드 동기화 실패"가 어려운 겁니다.

Claude가 생성하는 모든 비유는 하나의 질문으로 검증됩니다: *코드를 한 번도 써본 적 없는 사람이 10초 안에 이해할 수 있는가?*

---

## 📄 라이선스

MIT © [calmtiger86](https://github.com/calmtiger86)
