// 실행: node hooks/hooks.test.mjs
// SessionStart 훅 명령을 sh로 직접 돌려, 규칙이 그대로 나오고 어떤 경우에도 종료 코드가 0인지 확인한다.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const hooks = JSON.parse(readFileSync(join(ROOT, 'hooks', 'hooks.json'), 'utf8')).hooks;
const group = hooks.SessionStart[0];
const command = group.hooks[0].command;
const rules = readFileSync(join(ROOT, 'rules', 'output-clarity.md'), 'utf8');

// PATH에 sh와 cat만 있는 환경(= Node가 없는 컴퓨터)에서 명령을 돌린다.
const bin = mkdtempSync(join(tmpdir(), 'ndo-bin-'));
if (process.platform !== 'win32') symlinkSync('/bin/cat', join(bin, 'cat')); // 링크 시험은 Windows에서 건너뜀
const runHook = (pluginRoot) =>
  spawnSync('/bin/sh', ['-c', command], { env: { PATH: bin, CLAUDE_PLUGIN_ROOT: pluginRoot }, encoding: 'utf8' });

const tests = [
  ['훅은 SessionStart 하나뿐이고 matcher는 startup|clear|compact', () => {
    assert.deepEqual(Object.keys(hooks), ['SessionStart']);
    assert.equal(hooks.SessionStart.length, 1);
    assert.equal(group.matcher, 'startup|clear|compact');
  }],
  ['명령에 sh 전용 문법이 없고 중괄호 표기를 쓰며 exit 0으로 끝남', () => {
    assert.ok(command.includes('${CLAUDE_PLUGIN_ROOT}'), '중괄호 없는 변수 표기');
    assert.ok(command.endsWith('; exit 0'), 'exit 0으로 끝나지 않음');
    for (const bad of ['||', '&&', 'command -v', '[ ', '$(']) assert.ok(!command.includes(bad), `sh 전용 문법: ${bad}`);
  }],
  ['Node 없는 PATH에서도 규칙을 그대로 내보내고 종료 코드 0 (경로에 공백이 있어도)', () => {
    if (process.platform === 'win32') return 'skip';
    const r = runHook(ROOT);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, rules);
    assert.match(r.stdout, /비유로/);
  }],
  ['규칙 파일이 없어도 출력 없이 종료 코드 0', () => {
    if (process.platform === 'win32') return 'skip';
    const empty = join(bin, 'empty');
    mkdirSync(empty);
    const r = runHook(empty);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, '');
  }],
];

let failed = 0;
let skipped = 0;
for (const [name, fn] of tests) {
  try {
    const result = fn();
    if (result === 'skip') skipped += 1;
    console.log(`${result === 'skip' ? 'skip' : 'ok  '} ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`FAIL ${name}\n${err.message}`);
  }
}
rmSync(bin, { recursive: true, force: true });
console.log(`\n${tests.length - failed - skipped}/${tests.length} 통과, ${skipped}개 건너뜀${failed ? `, ${failed}개 실패` : ''}`);
process.exitCode = failed ? 1 : 0;
