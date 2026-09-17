#!/usr/bin/env node
/**
 * non-dev-output 플러그인 — UserPromptSubmit 훅
 *
 * 두 가지 패턴을 감지:
 * 1. CLARITY-MISS: 직전 설명이 안 통했다는 신호 → explain-by-analogy 유도
 * 2. WRITING-INTENT: 블로그/카드뉴스/SNS 글쓰기 요청 → ko-humanche-calmta 유도
 *
 * 외부 의존성 없이 자체 완결 (Node.js 내장 모듈만 사용).
 */

import { appendFileSync, mkdirSync, writeFileSync, statSync, readdirSync, unlinkSync } from 'fs';
import { createHash } from 'crypto';
import { homedir } from 'os';
import { join } from 'path';

// ── stdin 읽기 ──────────────────────────────────────────────────────────────

function readStdin(timeoutMs = 3000) {
  return new Promise((resolve) => {
    const chunks = [];
    let settled = false;
    const done = (result) => {
      if (!settled) { settled = true; resolve(result); }
    };
    const timer = setTimeout(() => {
      process.stdin.removeAllListeners();
      process.stdin.destroy();
      done(Buffer.concat(chunks).toString('utf-8'));
    }, timeoutMs);
    process.stdin.on('data', (chunk) => chunks.push(chunk));
    process.stdin.on('end', () => { clearTimeout(timer); done(Buffer.concat(chunks).toString('utf-8')); });
    process.stdin.on('error', () => { clearTimeout(timer); done(''); });
    if (process.stdin.readableEnded) { clearTimeout(timer); done(Buffer.concat(chunks).toString('utf-8')); }
  });
}

// ── 패턴 정의 ──────────────────────────────────────────────────────────────

// 직전 설명이 안 통했다는 신호 (재질문)
const CLARITY_REASK = /무슨\s*말|뭔\s*소리|이해가?\s*안|이해\s*(가|를)?\s*못|쉽게\s*(설명|풀어|말)|더\s*쉽게|다시\s*설명|쉽게\s*해\s*줘|뭔\s*뜻|무슨\s*뜻|이게\s*무슨|what do you mean|explain.*(simpl|easi)|too\s*(hard|complex|technical)/i;

// 글쓰기 의도 감지 — 키워드 + 행위 AND 조건 (거짓 양성 방지)
// negative lookahead: 컨텐츠 키워드가 출처(에서/에 있/에 대)로 쓰인 경우 제외
const WRITING_INTENT = /(블로그|포스트|카드뉴스|SNS|인스타(그램)?|뉴스레터|기고|아티클|칼럼|원고)(?!(에서|에\s*있|에\s*대|를?\s*봤)).{0,30}(써|작성|초안|다듬|고쳐|재작성|만들|적어|써줘|작성해)/i;

// ── 재질문 판정 범위 ────────────────────────────────────────────────────────

// 재질문은 사람이 그 자리에서 치는 짧은 말이다. 앞에 먼저 쓰거나, 무언가를
// 붙여넣은 뒤 짧게 덧붙인다. 수천 자짜리 작업 지시문 한가운데 인용된 예시
// 문구까지 검사하면 오탐이 난다. 실제로 시간별 자동 작업의 프롬프트에 들어 있던
// 예시 답글("최대한 쉽게 풀어서 설명하니까")이 매시간 재질문으로 잡혔다.
const HEAD_WINDOW = 300;
const TAIL_LINE_MAX = 100;

function reaskScope(prompt) {
  const head = prompt.slice(0, HEAD_WINDOW);
  const lines = prompt.trimEnd().split('\n');
  const last = (lines[lines.length - 1] || '').trim();
  // ponytail: 앞 300자 + 짧은 마지막 줄. 실측으로 오탐 38/104건이 2건으로 줄고
  // 진짜 재질문 32건은 그대로 잡힌다. 남은 2건은 프롬프트의 마지막 줄 자체가
  // 짧은 인용문인 경우다. 여기서 더 조이면 진짜 재질문을 놓치기 시작하므로
  // 두었다. 더 줄여야 하면 인용 표지(답글), 원문), >) 판정을 붙일 것.
  if (last && last.length <= TAIL_LINE_MAX && prompt.length > HEAD_WINDOW) {
    return head + '\n' + last;
  }
  return head;
}

// ── 중복 실행 가드 ──────────────────────────────────────────────────────────

// 플러그인이 여러 경로에 설치돼 있으면 Claude Code가 같은 훅을 사본 수만큼
// 실행한다. 그러면 안내 메시지도 그 수만큼 컨텍스트에 주입된다.
// writeFileSync의 'wx'는 원자적 배타 생성이라 첫 프로세스만 성공한다.
const CLAIM_TTL_MS = 5000;

function pruneClaims(dir) {
  try {
    const now = Date.now();
    for (const name of readdirSync(dir)) {
      const f = join(dir, name);
      if (now - statSync(f).mtimeMs > 60000) unlinkSync(f);
    }
  } catch { /* 청소 실패는 무시 */ }
}

function claimOnce(sessionId, prompt) {
  try {
    const dir = join(homedir(), '.omc', 'state', 'clarity-claims');
    mkdirSync(dir, { recursive: true });
    const key = createHash('sha1').update(sessionId + '\u0000' + prompt).digest('hex').slice(0, 32);
    const file = join(dir, key);
    try {
      writeFileSync(file, '', { flag: 'wx' });
      pruneClaims(dir);
      return true;
    } catch (err) {
      if (!err || err.code !== 'EEXIST') throw err;
      // 같은 말을 한참 뒤에 다시 하면 그건 새 재질문이다.
      // ponytail: 만료 직후엔 사본 여럿이 동시에 재청구할 수 있다. 창이 아주
      // 좁고 결과가 중복 주입 한 번이라 감수한다. 문제가 되면 파일 잠금으로 올릴 것.
      if (Date.now() - statSync(file).mtimeMs > CLAIM_TTL_MS) {
        writeFileSync(file, '');
        return true;
      }
      return false;
    }
  } catch {
    return true; // fail-open: 가드가 고장나면 놓치는 것보다 중복이 낫다
  }
}

// ── 이벤트 로깅 ────────────────────────────────────────────────────────────

function logEvent(type, prompt, match) {
  try {
    const dir = join(homedir(), '.omc', 'state');
    mkdirSync(dir, { recursive: true });
    // 어느 문구가 왜 걸렸는지 남긴다. prompt를 200자로 자르기만 하면
    // 뒤쪽에서 걸린 오탐은 로그만 보고는 원인을 알 수 없다.
    const rec = {
      ts: new Date().toISOString(),
      event: type,
      len: prompt.length,
      matched: match ? match[0].slice(0, 60) : null,
      at: match ? match.index : null,
      prompt: prompt.slice(0, 200),
    };
    appendFileSync(join(dir, 'clarity-events.jsonl'), JSON.stringify(rec) + '\n');
  } catch { /* fail-open */ }
}

// ── 스킬 안내 메시지 ────────────────────────────────────────────────────────

const CLARITY_MISS_MSG =
  '[CLARITY-MISS] 직전 설명이 안 통했거나 사용자가 더 쉬운 설명을 원합니다. ' +
  '하나의 일상 비유로 번역하세요: "비유로" 블록(장면 끝까지, 기술용어=괄호 태그) + "실제로는" 블록(기술 원문). ' +
  '비유와 기술을 한 문장에 섞지 않습니다. 강제 3박자 금지. ' +
  '비유가 통하면 ~/.claude/rules/common/output-clarity.md의 LEARNED-ANALOGY 섹션에 기록하세요.';

const WRITING_INTENT_MSG =
  '[WRITING-INTENT] 사용자가 한국어 글쓰기(블로그/카드뉴스/SNS 등)를 요청했습니다. ' +
  'ko-humanche-calmta 기준으로 작성하세요: ' +
  'AI 디폴트 수사 구조(강조 남발, 습관적 3분류, 이중서술) 제거, ' +
  '문장 단위 능동형, 핵심 하나면 하나만, 존댓말 어미 유지.';

// ── 메인 ────────────────────────────────────────────────────────────────────

async function main() {
  try {
    const input = await readStdin();
    if (!input.trim()) {
      process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
      return;
    }

    const data = JSON.parse(input);
    const prompt = data.prompt || '';

    if (!prompt) {
      process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
      return;
    }

    const clarityMatch = CLARITY_REASK.exec(reaskScope(prompt));
    const writingMatch = WRITING_INTENT.exec(prompt);

    if (!clarityMatch && !writingMatch) {
      process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
      return;
    }

    // 사본이 여럿이면 여기까지는 전부 도달한다. 실제 주입은 하나만 한다.
    if (!claimOnce(data.session_id || '', prompt)) {
      process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
      return;
    }

    const messages = [];

    if (clarityMatch) {
      logEvent('clarity_reask', prompt, clarityMatch);
      messages.push(CLARITY_MISS_MSG);
    }

    if (writingMatch) {
      logEvent('writing_intent', prompt, writingMatch);
      messages.push(WRITING_INTENT_MSG);
    }

    process.stdout.write(JSON.stringify({
      continue: true,
      additionalContext: messages.join('\n\n')
    }) + '\n');

  } catch {
    process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
  }
}

main();
