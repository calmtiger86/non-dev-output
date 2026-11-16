#!/usr/bin/env node
// 예전 방식(방법 C: install.js)과 1.x 훅이 남긴 non-dev-output 흔적을 정리한다.
// 인자 없이 실행하면 미리보기만 하고, --apply 를 붙이면 백업한 뒤 정리한다.
import {
  existsSync, readFileSync, writeFileSync, renameSync, rmSync, mkdirSync, readdirSync,
  cpSync, copyFileSync, realpathSync, statSync, lstatSync, chmodSync, unlinkSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// install.js가 settings.json에 적던 훅 명령은 정확히 `node "<설정 폴더>/plugins/non-dev-output/hooks/<파일>.mjs"` 모양이다.
// 역슬래시는 먼저 /로 바꿔서 비교한다. 이 모양이 아니면(다른 명령이 붙었거나 다른 경로면) 지우지 않고 알린다.
const HOOK_CMD_RE = /^node "([^"]*)\/hooks\/(session-start|clarity-keywords)\.mjs"$/;
const HOOK_PATH_RE = /\/plugins\/non-dev-output\/hooks\/(session-start|clarity-keywords)\.mjs/;
const HOOK_EVENTS = ['SessionStart', 'UserPromptSubmit'];
const LOG_NOTE = '프롬프트 앞부분이 평문으로 들어 있을 수 있음';

const apply = process.argv.slice(2).includes('--apply');
const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
// 1.x 훅은 설정 폴더와 상관없이 홈 아래에 기록을 남겼다
const stateDir = join(homedir(), '.omc', 'state');

const readText = (file) => readFileSync(file, 'utf8').replace(/^﻿/, '');
const slashed = (p) => p.replace(/\\/g, '/');
const fold = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);
const legacyRoot = fold(slashed(join(configDir, 'plugins', 'non-dev-output')));

// 'ours': install.js가 이 설정 폴더에 적은 훅과 똑같은 명령. 'similar': 경로 조각만 같고 모양이 다른 것(지우지 않음). null: 상관없음.
function classifyHook(h) {
  if (!h || typeof h.command !== 'string') return null;
  const cmd = slashed(h.command).trim();
  const m = HOOK_CMD_RE.exec(cmd);
  if (m && fold(m[1]) === legacyRoot) return 'ours';
  return HOOK_PATH_RE.test(cmd) ? 'similar' : null;
}

function timestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  // 같은 초에 다시 실행해도 이름이 겹치지 않게 밀리초까지 붙인다
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${String(d.getMilliseconds()).padStart(3, '0')}`;
}

// settings.json의 훅 묶음에서 이 플러그인 훅만 뺀 새 hooks 객체와, 뺀 명령(removed)·모양이 달라 남긴 명령(similar)을 돌려준다.
function stripLegacyHooks(hooks) {
  const next = { ...hooks };
  const removed = [];
  const similar = [];
  for (const event of HOOK_EVENTS) {
    const groups = next[event];
    if (!Array.isArray(groups)) continue;
    const kept = [];
    for (const group of groups) {
      if (!group || !Array.isArray(group.hooks)) { kept.push(group); continue; }
      const rest = group.hooks.filter((h) => {
        const kind = classifyHook(h);
        if (kind === 'ours') removed.push({ event, command: h.command });
        else if (kind === 'similar') similar.push({ event, command: h.command });
        return kind !== 'ours';
      });
      if (rest.length === group.hooks.length) kept.push(group);
      else if (rest.length > 0) kept.push({ ...group, hooks: rest });
    }
    if (kept.length > 0) next[event] = kept;
    else delete next[event]; // 비게 된 이벤트 키는 지운다
  }
  return { hooks: next, removed, similar };
}

// 지울 대상(targets)과 건드리지 않는 것(skipped)을 모은다. 이 단계는 아무것도 바꾸지 않는다.
function collect() {
  const targets = [];
  const skipped = [];

  const settingsPath = join(configDir, 'settings.json');
  let settingsTarget = null;
  let settingsBroken = false;
  if (existsSync(settingsPath)) {
    let settings;
    try {
      settings = JSON.parse(readText(settingsPath));
    } catch (err) {
      settingsBroken = true;
      skipped.push(`${settingsPath}: settings.json을 읽지 못해(JSON 오류: ${err.message}) settings.json과 옛 플러그인 폴더는 그대로 둡니다. settings.json을 고친 뒤 다시 실행하세요`);
    }
    if (settings && settings.hooks && typeof settings.hooks === 'object') {
      const { hooks, removed, similar } = stripLegacyHooks(settings.hooks);
      for (const { event, command } of similar) {
        skipped.push(`${settingsPath}: ${event} 훅이 install.js가 적은 모양과 달라 건드리지 않음 (명령: ${command}). 예전 설치 폴더를 지우면 이 훅이 실패할 수 있으니 직접 고치세요`);
      }
      if (removed.length > 0) {
        const { hooks: _old, ...rest } = settings;
        const next = Object.keys(hooks).length > 0 ? { ...settings, hooks } : rest; // 비게 된 hooks 키도 지운다
        settingsTarget = {
          kind: 'settings', path: settingsPath, backupAs: 'settings.json', next,
          label: `settings.json의 non-dev-output 훅 ${removed.length}개`,
          detail: removed.map(({ event, command }) => `${event}: ${command}`),
        };
      }
    }
  }

  const pluginDir = join(configDir, 'plugins', 'non-dev-output');
  if (existsSync(pluginDir)) {
    // 지우다 중간에 멈춘 폴더도 다시 실행할 때 알아볼 수 있게 install.js도 표지로 본다
    const ours = ['hooks/session-start.mjs', 'hooks/clarity-keywords.mjs', 'install.js'].some((f) => existsSync(join(pluginDir, f)));
    if (!ours) {
      skipped.push(`${pluginDir}: 예전 non-dev-output 훅 파일이 없어 건드리지 않음`);
    } else if (settingsBroken) {
      skipped.push(`${pluginDir}: settings.json을 읽지 못해 옛 플러그인 폴더도 그대로 둡니다`);
    } else {
      targets.push({ kind: 'path', path: pluginDir, backupAs: join('plugins', 'non-dev-output'), label: '예전 설치 폴더' });
    }
  }
  if (settingsTarget) targets.push(settingsTarget);

  // 1.x 훅이 남긴 기록. 이 두 이름만 지우고 ~/.omc/state의 다른 파일은 건드리지 않는다.
  const events = join(stateDir, 'clarity-events.jsonl');
  if (existsSync(events)) {
    const kb = Math.max(1, Math.round(statSync(events).size / 1024));
    targets.push({ kind: 'path', path: events, backupAs: join('omc-state', 'clarity-events.jsonl'), label: `메시지 기록 파일 ${kb}KB`, note: LOG_NOTE, isLog: true, hasPrompts: true });
  }
  const claims = join(stateDir, 'clarity-claims');
  if (existsSync(claims)) {
    targets.push({ kind: 'path', path: claims, backupAs: join('omc-state', 'clarity-claims'), label: '중복 방지 표시 폴더', isLog: true });
  }

  return { targets, skipped };
}

function backup(targets, backupDir) {
  mkdirSync(dirname(backupDir), { recursive: true });
  mkdirSync(backupDir); // 같은 이름이 이미 있으면 실패시켜 덮어쓰지 않는다
  for (const t of targets) {
    const dest = join(backupDir, t.backupAs);
    mkdirSync(dirname(dest), { recursive: true });
    if (t.kind === 'settings') copyFileSync(t.path, dest); // 심볼릭 링크면 실제 내용이 복사된다
    else cpSync(t.path, dest, { recursive: true, dereference: true });
  }
}

// 읽기 전용 파일(Windows의 .git 객체 등)이나 폴더가 끼어 있으면 지우기가 멈출 수 있어, 쓰기 권한을 준 뒤 한 번 더 시도한다.
function makeWritable(p) {
  const st = lstatSync(p);
  if (st.isSymbolicLink()) return; // 링크는 따라가지 않는다
  chmodSync(p, st.mode | (st.isDirectory() ? 0o700 : 0o200));
  if (st.isDirectory()) for (const name of readdirSync(p)) makeWritable(join(p, name));
}

function removeTree(p) {
  try {
    rmSync(p, { recursive: true });
  } catch {
    makeWritable(p);
    rmSync(p, { recursive: true });
  }
}

function writeSettings(t) {
  const real = realpathSync(t.path);
  const tmp = join(dirname(real), `.settings.json.non-dev-output-${process.pid}.tmp`);
  try {
    writeFileSync(tmp, JSON.stringify(t.next, null, 2) + '\n', { mode: statSync(real).mode & 0o777 });
    renameSync(tmp, real);
  } catch (err) {
    try { unlinkSync(tmp); } catch { /* 임시 파일이 없으면 무시 */ }
    throw err;
  }
}

function main() {
  const { targets, skipped } = collect();
  console.log(`non-dev-output 예전 흔적 정리 — ${apply ? '실행' : '미리보기 (아무것도 바꾸지 않습니다)'}`);
  console.log(`설정 폴더: ${configDir}\n`);
  if (skipped.length) {
    console.log('건드리지 않는 것:');
    for (const s of skipped) console.log(`  - ${s}`);
    console.log('');
  }
  if (targets.length === 0) {
    console.log('정리할 흔적이 없습니다.');
    return 0;
  }
  console.log(apply ? '정리할 것:' : '--apply 로 실행하면 백업한 뒤 정리할 것:');
  for (const t of targets) {
    console.log(`  - ${t.label}: ${t.path}${t.note ? ` (${t.note})` : ''}`);
    for (const line of t.detail || []) console.log(`      ${line}`);
  }
  console.log('');

  if (!apply) {
    console.log(`실제로 정리하려면: node "${fileURLToPath(import.meta.url)}" --apply`);
    return 0;
  }

  const backupDir = join(configDir, 'backups', `non-dev-output-legacy-${timestamp()}`);
  try {
    backup(targets, backupDir);
  } catch (err) {
    console.error(`백업에 실패해서 아무것도 지우지 않았습니다: ${err.message}`);
    console.error(`만들다 만 백업 폴더가 남아 있을 수 있습니다: ${backupDir} (원본은 그대로이니 필요 없으면 지워도 됩니다)`);
    return 1;
  }
  console.log(`백업 위치: ${backupDir}`);
  if (targets.some((t) => t.hasPrompts)) {
    console.log(`  메시지 기록 파일의 사본이 이 백업의 omc-state 폴더에 들어 있습니다. 필요 없으면 그 폴더를 지우세요.`);
  }

  // settings.json을 먼저 고친다. 실패하면 훅 파일을 남겨 두어 메시지를 보낼 때 오류가 나지 않게 한다.
  const settingsTarget = targets.find((t) => t.kind === 'settings');
  if (settingsTarget) {
    try {
      writeSettings(settingsTarget);
      console.log(`  ✓ ${settingsTarget.label} 제거`);
    } catch (err) {
      console.error(`settings.json을 고치지 못해 나머지도 지우지 않았습니다: ${err.message}`);
      return 1;
    }
  }

  let failed = 0;
  for (const t of targets.filter((x) => x.kind === 'path')) {
    try {
      removeTree(t.path);
      console.log(`  ✓ ${t.label} 삭제`);
    } catch (err) {
      failed += 1;
      console.error(`  ✗ ${t.label} 삭제 실패: ${err.message} (백업이 있으니 직접 지워도 됩니다)`);
    }
  }
  if (targets.some((t) => !t.isLog)) console.log('\nClaude Code를 다시 시작하세요. 그래야 지운 훅이 더는 불리지 않습니다.');
  return failed ? 1 : 0;
}

try {
  process.exitCode = main();
} catch (err) {
  console.error(`예상하지 못한 오류로 멈췄습니다: ${err.message}`);
  process.exitCode = 1;
}
