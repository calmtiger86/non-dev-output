#!/usr/bin/env node
/**
 * non-dev-output installer — CommonJS (Node.js 18+, Mac/Linux/Windows)
 *
 * 실행: node install.js
 * 동작:
 *   1. ~/.claude/plugins/non-dev-output/ 에 플러그인 파일 복사
 *   2. ~/.claude/settings.json 에 훅 등록 (SessionStart + UserPromptSubmit)
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const SRC        = __dirname;
const HOME       = os.homedir();
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(HOME, '.claude');
const PLUGIN_DST = path.join(CLAUDE_DIR, 'plugins', 'non-dev-output');
const SETTINGS   = path.join(CLAUDE_DIR, 'settings.json');

function log(msg) { console.log('  ' + msg); }
function ok(msg)  { console.log('  ✓ ' + msg); }
function die(msg) { console.error('  ✗ ' + msg); process.exit(1); }

// ── 1. 파일 복사 ──────────────────────────────────────────────────────────────

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const s = path.join(src, entry);
    const d = path.join(dst, entry);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

log('플러그인 파일을 복사합니다...');
try {
  copyDir(SRC, PLUGIN_DST);
  ok('~/.claude/plugins/non-dev-output/');
} catch (e) {
  die('파일 복사 실패: ' + e.message);
}

// ── 2. settings.json 훅 등록 ──────────────────────────────────────────────────

log('훅을 settings.json 에 등록합니다...');

let settings = {};
if (fs.existsSync(SETTINGS)) {
  try { settings = JSON.parse(fs.readFileSync(SETTINGS, 'utf-8')); }
  catch (_) { settings = {}; }
}
if (!settings.hooks) settings.hooks = {};

const ROOT       = PLUGIN_DST.replace(/\\/g, '/');
const SESSION_CMD = 'node "' + ROOT + '/hooks/session-start.mjs"';
const PROMPT_CMD  = 'node "' + ROOT + '/hooks/clarity-keywords.mjs"';

function hasCmd(entries, cmd) {
  return (entries || []).some(function(e) {
    return (e.hooks || []).some(function(h) { return h.command === cmd; });
  });
}

function addHook(event, cmd, extra) {
  if (!settings.hooks[event]) settings.hooks[event] = [];
  if (!hasCmd(settings.hooks[event], cmd)) {
    var hook = Object.assign({ type: 'command', command: cmd }, extra || {});
    settings.hooks[event].push({ hooks: [hook] });
  }
}

addHook('SessionStart',     SESSION_CMD);
addHook('UserPromptSubmit', PROMPT_CMD, { timeout: 5 });

try {
  fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  ok('SessionStart 훅 등록');
  ok('UserPromptSubmit 훅 등록');
} catch (e) {
  die('settings.json 쓰기 실패: ' + e.message);
}

// ── 완료 ──────────────────────────────────────────────────────────────────────

console.log('');
console.log('설치 완료! Claude Code를 재시작하면 바로 작동합니다.');
console.log('');
console.log('동작 확인:');
console.log('  · "이해가 안 돼" → 자동 비유 번역 모드');
console.log('  · "블로그 글 써줘" → 자동 한국어 글쓰기 모드');
