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

import { appendFileSync, mkdirSync } from 'fs';
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
const WRITING_INTENT = /(블로그|포스트|카드뉴스|SNS|인스타(그램)?|뉴스레터|기고|아티클|칼럼|원고).{0,40}(써|작성|초안|다듬|고쳐|재작성|만들|적어|써줘|작성해)/i;

// ── 이벤트 로깅 ────────────────────────────────────────────────────────────

function logEvent(type, prompt) {
  try {
    const dir = join(homedir(), '.omc', 'state');
    mkdirSync(dir, { recursive: true });
    const rec = { ts: new Date().toISOString(), event: type, prompt: prompt.slice(0, 200) };
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

    const isClarityMiss = CLARITY_REASK.test(prompt);
    const isWritingIntent = WRITING_INTENT.test(prompt);

    const messages = [];

    if (isClarityMiss) {
      logEvent('clarity_reask', prompt);
      messages.push(CLARITY_MISS_MSG);
    }

    if (isWritingIntent) {
      logEvent('writing_intent', prompt);
      messages.push(WRITING_INTENT_MSG);
    }

    if (messages.length === 0) {
      process.stdout.write(JSON.stringify({ continue: true, suppressOutput: true }) + '\n');
      return;
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
