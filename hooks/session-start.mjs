#!/usr/bin/env node
/**
 * SessionStart hook — output-clarity 규칙 주입
 * Node.js 전용 (Windows/Linux/Mac 호환)
 */
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function out(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

// 이미 규칙 파일이 로컬에 있으면 중복 주입 건너뜀
const localRules = join(homedir(), '.claude', 'rules', 'common', 'output-clarity.md');
if (existsSync(localRules)) {
  out({ hookSpecificOutput: { hookEventName: 'SessionStart' } });
  process.exit(0);
}

// 플러그인 내장 규칙 파일 로드
const rulesPath = join(__dirname, '..', 'rules', 'output-clarity.md');
let content = '';
try {
  content = readFileSync(rulesPath, 'utf-8');
} catch {
  out({ hookSpecificOutput: { hookEventName: 'SessionStart' } });
  process.exit(0);
}

out({
  hookSpecificOutput: {
    hookEventName: 'SessionStart',
    additionalContext: content
  }
});
