#!/usr/bin/env node
// clarity-keywords 훅 자체 점검. 의존성 없이 `node hooks/clarity-keywords.test.mjs`로 실행.
import assert from 'assert';
import { execFileSync } from 'child_process';
import { randomUUID } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'clarity-keywords.mjs');

function run(prompt, sessionId = randomUUID()) {
  const out = execFileSync('node', [HOOK], {
    input: JSON.stringify({ prompt, session_id: sessionId }),
    encoding: 'utf-8',
  });
  return JSON.parse(out);
}

const fired = (r) => String(r.additionalContext || '').includes('CLARITY-MISS');

// 1. 짧은 재질문은 잡는다
assert.ok(fired(run('이게 무슨 말이야? 쉽게 설명해줘')), '짧은 재질문을 놓쳤다');

// 2. 회귀: 인용된 예시 문구가 본문 깊숙이 있는 긴 지시문은 잡지 않는다.
//    매시간 돌던 자동 작업이 이 문구 때문에 재질문으로 오인됐다.
const spec =
  '@calmtiger_ 계정의 시간별 참여 루틴을 1회차 실행한다.\n' +
  'x'.repeat(4000) + '\n' +
  '원문) 우연히 피드에 떴는데 잘 받아볼게!\n' +
  '답글) 최대한 쉽게 풀어서 설명하니까 팔로우하면 도움될거야!\n' +
  'y'.repeat(500);
assert.ok(!fired(run(spec)), '긴 지시문 속 인용 문구에 오탐했다');

// 3. 붙여넣기 뒤 짧게 덧붙인 재질문은 잡는다
assert.ok(fired(run('에러 로그입니다.\n' + 'z'.repeat(3000) + '\n이게 무슨 뜻이야?')),
  '붙여넣기 뒤 재질문을 놓쳤다');

// 4. 사본이 여러 개여도 같은 세션·같은 프롬프트에는 한 번만 주입한다
const sid = randomUUID();
const p = '이해가 안 됩니다. 다시 설명해주세요';
assert.ok(fired(run(p, sid)), '첫 실행은 주입해야 한다');
assert.ok(!fired(run(p, sid)), '중복 실행이 또 주입했다');
assert.ok(fired(run(p, randomUUID())), '다른 세션까지 막으면 안 된다');

// 5. 무관한 프롬프트는 조용히 통과
const plain = run('파일 목록 보여줘');
assert.ok(!fired(plain) && plain.continue === true, '무관한 프롬프트에 반응했다');

console.log('통과: 5개 항목');
