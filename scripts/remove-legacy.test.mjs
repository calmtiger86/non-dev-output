// 실행: node scripts/remove-legacy.test.mjs
// 임시 설정 폴더(CLAUDE_CONFIG_DIR)와 임시 홈에 예전 설치 흔적을 만들고 정리 도구를 실제 프로세스로 돌려 확인한다.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, lstatSync,
  readlinkSync, realpathSync, rmSync, symlinkSync, existsSync, chmodSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'remove-legacy.mjs');
const base = realpathSync(mkdtempSync(join(tmpdir(), 'ndo-remove-')));

const OTHER_HOOK = { type: 'command', command: 'node other.mjs' };
const OTHER_PROMPT = { type: 'command', command: 'node other-prompt.mjs' };
const DECOY_MARKET = { type: 'command', command: 'node "/Users/x/.claude/plugins/marketplaces/non-dev-output/hooks/session-start.mjs"' };
const DECOY_DEV = { type: 'command', command: 'node "/Users/x/Desktop/non-dev-output/hooks/session-start.mjs"' };
const STOP_HOOK = { type: 'command', command: 'node stop.mjs' };

// install.js가 적던 훅 명령은 `node "<설정 폴더>/plugins/non-dev-output/hooks/<파일>.mjs"` 모양이다. 설정 폴더에 맞춰 만든다.
const hookCmd = (dir, file, win = false) => {
  const path = `${dir}/plugins/non-dev-output/hooks/${file}`;
  return `node "${win ? path.split('/').join('\\') : path}"`;
};

// 지워야 할 훅(our)과, 비슷하게 생겼지만 지우면 안 되는 훅(similar)을 섞은 settings.json과 정리 뒤 모습을 돌려준다.
function settingsFor(dir) {
  const our = {
    session: { type: 'command', command: hookCmd(dir, 'session-start.mjs') },
    sessionWin: { type: 'command', command: hookCmd(dir, 'session-start.mjs', true) },
    prompt: { type: 'command', command: hookCmd(dir, 'clarity-keywords.mjs'), timeout: 5 },
  };
  const similar = {
    compound: { type: 'command', command: `${hookCmd(dir, 'session-start.mjs')} && echo mine` }, // 사용자가 뒤에 명령을 붙인 것
    outside: { type: 'command', command: 'node "/Users/x/work/plugins/non-dev-output/hooks/session-start.mjs"' }, // 설정 폴더 밖
    unquoted: { type: 'command', command: `node ${dir}/plugins/non-dev-output/hooks/session-start.mjs` }, // 따옴표 없음
  };
  const keep = [{ hooks: [DECOY_MARKET] }, { hooks: [DECOY_DEV] }, ...Object.values(similar).map((h) => ({ hooks: [h] }))];
  const before = {
    model: 'opus',
    hooks: {
      SessionStart: [{ hooks: [our.session] }, { matcher: 'startup', hooks: [our.sessionWin, OTHER_HOOK] }, ...keep],
      UserPromptSubmit: [{ hooks: [our.prompt] }, { hooks: [OTHER_PROMPT] }],
      Stop: [{ hooks: [STOP_HOOK] }],
    },
    permissions: { allow: ['Read'] },
  };
  const after = {
    model: 'opus',
    hooks: {
      SessionStart: [{ matcher: 'startup', hooks: [OTHER_HOOK] }, ...keep],
      UserPromptSubmit: [{ hooks: [OTHER_PROMPT] }],
      Stop: [{ hooks: [STOP_HOOK] }],
    },
    permissions: { allow: ['Read'] },
  };
  return { our, similar, before, after };
}

let fixtureCount = 0;
function write(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

// 예전 설치 흔적 + 남의 파일이 섞인 설정 폴더와 홈을 만든다. 홈은 설정 폴더와 따로 둬서 기록 파일 위치가 홈 기준임을 확인한다.
function makeFixture({ settingsText = (dir) => JSON.stringify(settingsFor(dir).before, null, 4), plugin = true, logs = true } = {}) {
  fixtureCount += 1;
  const dir = join(base, `config-${fixtureCount}`);
  const home = join(base, `home-${fixtureCount}`);
  mkdirSync(dir);
  mkdirSync(home);
  if (plugin) {
    write(join(dir, 'plugins', 'non-dev-output', 'hooks', 'session-start.mjs'), '// 1.x\n');
    write(join(dir, 'plugins', 'non-dev-output', 'hooks', 'clarity-keywords.mjs'), '// 1.x\n');
    write(join(dir, 'plugins', 'non-dev-output', 'install.js'), '// 1.x\n');
    write(join(dir, 'plugins', 'non-dev-output', '.git', 'HEAD'), 'ref: refs/heads/main\n');
  }
  write(join(dir, 'plugins', 'cache', 'keep.txt'), '유지\n');
  write(join(dir, 'plugins', 'marketplaces', 'non-dev-output', 'hooks', 'hooks.json'), '{}\n');
  write(join(dir, 'rules', 'common', 'user-config.md'), '# User Config\n');
  if (settingsText !== null) write(join(dir, 'settings.json'), typeof settingsText === 'function' ? settingsText(dir) : settingsText);
  if (logs) {
    if (logs !== 'claims') write(join(home, '.omc', 'state', 'clarity-events.jsonl'), '{"prompt":"앞 200자"}\n'.repeat(50));
    write(join(home, '.omc', 'state', 'clarity-claims', 'abc123'), '');
  }
  write(join(home, '.omc', 'state', 'other-tool.json'), '{"keep":true}\n');
  write(join(home, '.omc', 'project-memory.json'), '{}\n');
  return { dir, home, cfg: settingsFor(dir) };
}

// 폴더 전체를 { 상대경로: 내용 } 으로 찍는다. 심볼릭 링크는 링크 자체를 기록한다.
function snapshot(root) {
  const out = {};
  const walk = (dir, rel) => {
    for (const name of readdirSync(dir).sort()) {
      const p = join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      const st = lstatSync(p);
      if (st.isSymbolicLink()) out[r] = `link -> ${readlinkSync(p)}`;
      else if (st.isDirectory()) { out[r] = 'dir'; walk(p, r); }
      else out[r] = readFileSync(p, 'utf8');
    }
  };
  walk(root, '');
  return out;
}

// 설정 폴더와 홈이 둘 다 임시 폴더 안일 때만 돌린다. 홈이 진짜 홈이면 진짜 ~/.omc/state를 지울 수 있다.
function run(fx, args = []) {
  assert.ok(fx.dir.startsWith(base + sep), '임시 폴더 밖의 설정 폴더로는 실행하지 않는다');
  assert.ok(fx.home.startsWith(base + sep), '임시 폴더 밖의 홈으로는 실행하지 않는다');
  const env = { ...process.env, CLAUDE_CONFIG_DIR: fx.dir, HOME: fx.home, USERPROFILE: fx.home };
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { env, encoding: 'utf8' });
  return { status: r.status, out: r.stdout + r.stderr };
}

// 읽기 전용으로 만든 폴더·파일을 풀어, 시험이 끝난 뒤 임시 폴더를 지울 수 있게 한다.
const unlock = (root) => spawnSync('chmod', ['-R', 'u+w', root]);

const backupsOf = (dir) => (existsSync(join(dir, 'backups')) ? readdirSync(join(dir, 'backups')) : []);
const stateOf = (home) => join(home, '.omc', 'state');

function assertLogsRemoved({ home }) {
  assert.equal(existsSync(join(stateOf(home), 'clarity-events.jsonl')), false, '메시지 기록 파일이 남음');
  assert.equal(existsSync(join(stateOf(home), 'clarity-claims')), false, '중복 방지 폴더가 남음');
  assert.ok(existsSync(join(stateOf(home), 'other-tool.json')), '다른 도구의 state 파일이 지워짐');
  assert.ok(existsSync(join(home, '.omc', 'project-memory.json')), '.omc의 다른 파일이 지워짐');
}

function assertCleaned(fx) {
  assert.equal(existsSync(join(fx.dir, 'plugins', 'non-dev-output')), false, '예전 설치 폴더가 남음');
  assert.ok(existsSync(join(fx.dir, 'plugins', 'cache', 'keep.txt')), '다른 플러그인 파일이 지워짐');
  assert.ok(existsSync(join(fx.dir, 'plugins', 'marketplaces', 'non-dev-output', 'hooks', 'hooks.json')), '마켓 설치본이 지워짐');
  assert.ok(existsSync(join(fx.dir, 'rules', 'common', 'user-config.md')), '다른 규칙이 지워짐');
  assertLogsRemoved(fx);
}

const tests = [
  ['미리보기는 아무것도 바꾸지 않음 (backups 폴더도 만들지 않음)', () => {
    const fx = makeFixture();
    const before = [snapshot(fx.dir), snapshot(fx.home)];
    const r = run(fx);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /미리보기/);
    assert.ok(r.out.includes(join(fx.dir, 'plugins', 'non-dev-output')));
    assert.ok(r.out.includes('settings.json의 non-dev-output 훅 3개'));
    // 지울 명령은 원문 그대로 한 줄씩 보여 준다
    for (const h of Object.values(fx.cfg.our)) assert.ok(r.out.includes(h.command), `지울 명령이 미리보기에 없음: ${h.command}`);
    // 모양이 다른 훅은 지우지 않고, 어떤 명령인지 보여 준다
    assert.match(r.out, /건드리지 않는 것:/);
    for (const h of Object.values(fx.cfg.similar)) assert.ok(r.out.includes(h.command), `남기는 명령이 알림에 없음: ${h.command}`);
    assert.ok(r.out.includes(join(stateOf(fx.home), 'clarity-events.jsonl')));
    assert.ok(r.out.includes(join(stateOf(fx.home), 'clarity-claims')));
    assert.match(r.out, /프롬프트 앞부분이 평문으로 들어 있을 수 있음/);
    assert.deepEqual([snapshot(fx.dir), snapshot(fx.home)], before);
  }],
  ['--apply는 백업을 만들고 우리 것만 지움, settings.json은 우리 훅만 뺌 (SessionStart와 UserPromptSubmit 모두)', () => {
    const fx = makeFixture();
    const settingsText = JSON.stringify(fx.cfg.before, null, 4);
    const topBefore = readdirSync(base).sort();
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 0, r.out);
    assertCleaned(fx);
    assert.equal(readFileSync(join(fx.dir, 'settings.json'), 'utf8'), JSON.stringify(fx.cfg.after, null, 2) + '\n');
    assert.match(r.out, /Claude Code를 다시 시작하세요/);
    assert.match(r.out, /omc-state 폴더에 들어 있습니다/);

    const backups = backupsOf(fx.dir);
    assert.equal(backups.length, 1);
    assert.match(backups[0], /^non-dev-output-legacy-\d{8}-\d{6}-\d{3}$/);
    const b = join(fx.dir, 'backups', backups[0]);
    assert.equal(readFileSync(join(b, 'settings.json'), 'utf8'), settingsText);
    assert.ok(existsSync(join(b, 'plugins', 'non-dev-output', 'install.js')));
    assert.ok(existsSync(join(b, 'plugins', 'non-dev-output', '.git', 'HEAD')));
    assert.ok(existsSync(join(b, 'omc-state', 'clarity-events.jsonl')), '홈 쪽 기록 파일이 백업 안에 없음');
    assert.ok(existsSync(join(b, 'omc-state', 'clarity-claims', 'abc123')));
    assert.equal(existsSync(join(b, 'omc-state', 'other-tool.json')), false, '대상이 아닌 것까지 백업함');
    assert.equal(existsSync(join(b, 'plugins', 'cache')), false, '대상이 아닌 것까지 백업함');
    assert.equal(existsSync(join(b, 'plugins', 'marketplaces')), false, '대상이 아닌 것까지 백업함');
    // 홈 쪽 경로를 설정 폴더 기준 상대 경로로 바꾸면 백업 폴더 밖(../..)에 쓰게 된다. 임시 폴더 바깥쪽에 새 것이 생기지 않아야 한다.
    assert.deepEqual(readdirSync(base).sort(), topBefore, '임시 폴더 최상위에 뜻밖의 파일이 생김');
    assert.deepEqual(readdirSync(fx.dir).sort(), ['backups', 'plugins', 'rules', 'settings.json']);
  }],
  ['두 번째 실행은 정리할 것이 없고 새 백업도 만들지 않음', () => {
    const fx = makeFixture();
    assert.equal(run(fx, ['--apply']).status, 0);
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /정리할 흔적이 없습니다/);
    assert.equal(backupsOf(fx.dir).length, 1);
  }],
  ['마켓 설치만 쓴 사용자(예전 폴더·훅 없음)는 기록 파일만 정리하고 settings.json은 그대로', () => {
    const settingsText = JSON.stringify({ model: 'opus', enabledPlugins: { 'non-dev-output@non-dev-output': true } }, null, 4);
    const fx = makeFixture({ settingsText, plugin: false });
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 0, r.out);
    assertLogsRemoved(fx);
    assert.equal(readFileSync(join(fx.dir, 'settings.json'), 'utf8'), settingsText);
    assert.ok(existsSync(join(fx.dir, 'plugins', 'marketplaces', 'non-dev-output', 'hooks', 'hooks.json')));
    assert.doesNotMatch(r.out, /다시 시작/, '훅을 건드리지 않았는데 재시작을 안내함');
  }],
  ['settings.json이 없어도 예전 폴더와 기록 파일은 정리', () => {
    const fx = makeFixture({ settingsText: null });
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 0, r.out);
    assertCleaned(fx);
    assert.equal(existsSync(join(fx.dir, 'settings.json')), false);
  }],
  ['훅 파일이 없는 plugins/non-dev-output 폴더는 남기고 알림', () => {
    const fx = makeFixture({ plugin: false });
    write(join(fx.dir, 'plugins', 'non-dev-output', 'notes.txt'), '남의 폴더\n');
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 0, r.out);
    assert.equal(readFileSync(join(fx.dir, 'plugins', 'non-dev-output', 'notes.txt'), 'utf8'), '남의 폴더\n');
    assert.match(r.out, /예전 non-dev-output 훅 파일이 없어 건드리지 않음/);
    assert.deepEqual(JSON.parse(readFileSync(join(fx.dir, 'settings.json'), 'utf8')), fx.cfg.after);
  }],
  ['깨진 settings.json이면 settings.json과 예전 폴더는 남기고 기록 파일만 정리', () => {
    const broken = '{ "hooks": { "SessionStart": [ broken';
    const fx = makeFixture({ settingsText: broken });
    const pluginBefore = snapshot(join(fx.dir, 'plugins', 'non-dev-output'));
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 0, r.out);
    assert.equal(readFileSync(join(fx.dir, 'settings.json'), 'utf8'), broken);
    assert.deepEqual(snapshot(join(fx.dir, 'plugins', 'non-dev-output')), pluginBefore, '예전 폴더가 바뀜');
    assertLogsRemoved(fx);
    assert.match(r.out, /settings\.json을 읽지 못해\(JSON 오류: .*\) settings\.json과 옛 플러그인 폴더는 그대로 둡니다\. settings\.json을 고친 뒤 다시 실행하세요/);
  }],
  ['깨진 settings.json을 고친 뒤 다시 실행하면 남은 것을 정리', () => {
    const fx = makeFixture({ settingsText: '{ broken' });
    assert.equal(run(fx, ['--apply']).status, 0);
    writeFileSync(join(fx.dir, 'settings.json'), JSON.stringify(fx.cfg.before));
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 0, r.out);
    assertCleaned(fx);
    assert.deepEqual(JSON.parse(readFileSync(join(fx.dir, 'settings.json'), 'utf8')), fx.cfg.after);
  }],
  ['BOM이 붙은 settings.json도 읽어서 처리', () => {
    const fx = makeFixture({ settingsText: (dir) => '\uFEFF' + JSON.stringify(settingsFor(dir).before) });
    assert.equal(run(fx, ['--apply']).status, 0);
    assert.deepEqual(JSON.parse(readFileSync(join(fx.dir, 'settings.json'), 'utf8')), fx.cfg.after);
  }],
  ['우리 훅만 있던 이벤트는 키까지 지우고, hooks가 비면 hooks 키도 지움', () => {
    const only = (dir) => {
      const { our } = settingsFor(dir);
      return JSON.stringify({ model: 'opus', hooks: { SessionStart: [{ hooks: [our.session] }], UserPromptSubmit: [{ hooks: [our.prompt] }] } });
    };
    const fx = makeFixture({ settingsText: only });
    assert.equal(run(fx, ['--apply']).status, 0);
    assert.equal(readFileSync(join(fx.dir, 'settings.json'), 'utf8'), JSON.stringify({ model: 'opus' }, null, 2) + '\n');
  }],
  ['심볼릭 링크 settings.json은 링크를 유지하고 실제 파일에 씀', () => {
    if (process.platform === 'win32') return 'skip'; // Windows는 링크 생성에 관리자 권한이 필요할 수 있음
    const fx = makeFixture({ settingsText: null });
    const realFile = join(base, `real-settings-${fixtureCount}.json`);
    const original = JSON.stringify(fx.cfg.before, null, 2);
    writeFileSync(realFile, original);
    symlinkSync(realFile, join(fx.dir, 'settings.json'));
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 0, r.out);
    assert.ok(lstatSync(join(fx.dir, 'settings.json')).isSymbolicLink(), '링크가 일반 파일로 바뀜');
    assert.equal(readFileSync(realFile, 'utf8'), JSON.stringify(fx.cfg.after, null, 2) + '\n');
    const b = join(fx.dir, 'backups', backupsOf(fx.dir)[0], 'settings.json');
    assert.ok(!lstatSync(b).isSymbolicLink(), '백업이 링크로 남음');
    assert.equal(readFileSync(b, 'utf8'), original);
  }],
  ['백업에 실패하면 아무것도 지우지 않고 종료 코드 1', () => {
    const fx = makeFixture();
    write(join(fx.dir, 'backups'), '폴더 자리에 놓인 파일\n');
    const before = [snapshot(fx.dir), snapshot(fx.home)];
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /백업에 실패해서 아무것도 지우지 않았습니다/);
    assert.match(r.out, /만들다 만 백업 폴더가 남아 있을 수 있습니다/);
    assert.deepEqual([snapshot(fx.dir), snapshot(fx.home)], before);
  }],
  ['백업 도중 실패하면 반쯤 만든 백업 폴더를 알리고 아무것도 지우지 않음', () => {
    if (process.platform === 'win32' || process.getuid() === 0) return 'skip'; // 읽기 금지(chmod 000) 흉내가 POSIX 일반 사용자 전용
    const fx = makeFixture();
    const settingsBefore = readFileSync(join(fx.dir, 'settings.json'), 'utf8');
    const locked = join(fx.dir, 'plugins', 'non-dev-output', 'locked.txt');
    write(locked, '읽을 수 없는 파일\n');
    chmodSync(locked, 0o000);
    try {
      const r = run(fx, ['--apply']);
      assert.equal(r.status, 1, r.out);
      const backups = backupsOf(fx.dir);
      assert.equal(backups.length, 1, '반쯤 만든 백업 폴더가 없음');
      assert.ok(r.out.includes(`만들다 만 백업 폴더가 남아 있을 수 있습니다: ${join(fx.dir, 'backups', backups[0])}`), r.out);
      assert.ok(existsSync(join(fx.dir, 'plugins', 'non-dev-output', 'hooks', 'session-start.mjs')), '예전 훅 파일이 지워짐');
      assert.ok(existsSync(join(stateOf(fx.home), 'clarity-events.jsonl')), '기록 파일이 지워짐');
      assert.equal(readFileSync(join(fx.dir, 'settings.json'), 'utf8'), settingsBefore);
    } finally {
      chmodSync(locked, 0o644);
    }
  }],
  ['settings.json을 고치지 못하면 나머지를 지우지 않고 종료 코드 1', () => {
    if (process.platform === 'win32') return 'skip'; // 폴더 쓰기 금지(chmod) 흉내가 POSIX 전용
    const fx = makeFixture({ settingsText: null });
    const roDir = join(base, `read-only-${fixtureCount}`);
    write(join(roDir, 'settings.json'), JSON.stringify(fx.cfg.before, null, 2));
    symlinkSync(join(roDir, 'settings.json'), join(fx.dir, 'settings.json'));
    chmodSync(roDir, 0o555);
    try {
      const r = run(fx, ['--apply']);
      assert.equal(r.status, 1, r.out);
      assert.match(r.out, /settings.json을 고치지 못해 나머지도 지우지 않았습니다/);
      assert.ok(existsSync(join(fx.dir, 'plugins', 'non-dev-output', 'hooks', 'session-start.mjs')), '예전 훅 파일이 지워짐');
      assert.ok(existsSync(join(stateOf(fx.home), 'clarity-events.jsonl')), '기록 파일이 지워짐');
      assert.deepEqual(readdirSync(roDir), ['settings.json'], '임시 파일이 남음');
    } finally {
      chmodSync(roDir, 0o755);
    }
  }],
  ['우리 모양과 다른 훅만 있으면 settings.json은 바이트까지 그대로, 명령을 보여 주고 예전 폴더는 정리', () => {
    const lookalikes = (dir) => {
      const { similar } = settingsFor(dir);
      return JSON.stringify({ hooks: { SessionStart: Object.values(similar).map((h) => ({ hooks: [h] })) } }, null, 4);
    };
    const fx = makeFixture({ settingsText: lookalikes });
    const before = readFileSync(join(fx.dir, 'settings.json'), 'utf8');
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 0, r.out);
    assert.equal(readFileSync(join(fx.dir, 'settings.json'), 'utf8'), before);
    for (const h of Object.values(fx.cfg.similar)) assert.ok(r.out.includes(h.command), `남긴 명령이 알림에 없음: ${h.command}`);
    assert.match(r.out, /예전 설치 폴더를 지우면 이 훅이 실패할 수 있으니 직접 고치세요/);
    assert.equal(existsSync(join(fx.dir, 'plugins', 'non-dev-output')), false);
  }],
  ['중복 방지 폴더만 있으면 메시지 기록 파일 사본 안내를 하지 않음', () => {
    const fx = makeFixture({ plugin: false, logs: 'claims', settingsText: null });
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 0, r.out);
    assert.equal(existsSync(join(stateOf(fx.home), 'clarity-claims')), false);
    assert.doesNotMatch(r.out, /메시지 기록 파일의 사본/);
    assert.doesNotMatch(r.out, /다시 시작/, '훅을 건드리지 않았는데 재시작을 안내함');
    assert.equal(backupsOf(fx.dir).length, 1);
  }],
  ['install.js만 남은 폴더(지우다 멈춘 흔적)도 예전 폴더로 알아봄', () => {
    const fx = makeFixture({ plugin: false });
    write(join(fx.dir, 'plugins', 'non-dev-output', 'install.js'), '// 1.x\n');
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 0, r.out);
    assert.equal(existsSync(join(fx.dir, 'plugins', 'non-dev-output')), false);
  }],
  ['읽기 전용 폴더·파일이 끼어 있어도 예전 폴더를 지움 (Windows의 읽기 전용 .git 파일 대비)', () => {
    if (process.platform === 'win32' || process.getuid() === 0) return 'skip'; // 읽기 전용 흉내는 POSIX 일반 사용자 전용
    const fx = makeFixture();
    const inner = join(fx.dir, 'plugins', 'non-dev-output', '.git', 'objects');
    write(join(inner, 'pack.idx'), '읽기 전용\n');
    chmodSync(join(inner, 'pack.idx'), 0o444);
    chmodSync(inner, 0o555);
    try {
      const r = run(fx, ['--apply']);
      assert.equal(r.status, 0, r.out);
      assertCleaned(fx);
    } finally {
      unlock(fx.dir); // 백업 사본에도 읽기 전용 폴더가 따라와서 시험 뒷정리를 위해 푼다
    }
  }],
  ['흔적이 없는 설정 폴더와 홈', () => {
    fixtureCount += 1;
    const fx = { dir: join(base, `config-empty-${fixtureCount}`), home: join(base, `home-empty-${fixtureCount}`) };
    mkdirSync(fx.dir);
    mkdirSync(fx.home);
    const r = run(fx, ['--apply']);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /정리할 흔적이 없습니다/);
    assert.deepEqual(readdirSync(fx.dir), []);
    assert.deepEqual(readdirSync(fx.home), []);
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
if (process.platform !== 'win32') unlock(base);
rmSync(base, { recursive: true, force: true });
console.log(`\n${tests.length - failed - skipped}/${tests.length} 통과, ${skipped}개 건너뜀${failed ? `, ${failed}개 실패` : ''}`);
process.exitCode = failed ? 1 : 0;
