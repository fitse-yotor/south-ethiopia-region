#!/usr/bin/env node
// Repository malware guard. Fails if tracked files contain patterns used by the code that was
// hidden in this repo in Sept 2026 (obfuscated JS pushed off-screen with whitespace, blockchain
// RPC loaders) or if npm scripts run files outside the expected set.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
  // Also scan files WITHOUT an extension (the `init` loader of Nov 2026 slipped past because of this).
  .filter(f => /\.(m?[jt]sx?|cjs|json|css|sh|py|ya?ml|html|md)$/.test(f) || !/\.[A-Za-z0-9]+$/.test(f.split('/').pop()))
  // This script and the incident notes quote the malicious patterns on purpose.
  .filter(f => !['package-lock.json', 'scripts/security-guard.mjs', 'SECURITY.md'].includes(f));

const rules = [
  ['code hidden after a long whitespace run', /\S[ \t]{150,}\S/],
  ['line starts with a long whitespace run before code', /^[ \t]{150,}\S/m],
  ['global["!"] style loader', /global\[\s*['"]!['"]\s*\]/],
  ['blockchain RPC endpoint', /(blastapi\.io|infura\.io|alchemyapi|eth-mainnet|bsc-dataseed|tronweb|api\.trongrid)/i],
  ['dynamic code execution', /\b(eval|new\s+Function)\s*\(/],
  ['hex-obfuscated identifiers', /\b_0x[0-9a-f]{4,}\b/i],
  ['XOR numeric obfuscation', /\(\s*\d{5,}\s*\^\s*\d{5,}\s*\)|\d{5,}\^\d{5,}/],
  ['long \\u escape sequences', /(\\u00[0-9a-f]{2}){8,}/i],
  ['child_process outside scripts/', null],
];

const problems = [];
for (const f of files) {
  let text;
  try { text = readFileSync(f, 'utf8'); } catch { problems.push(`${f}: tracked file cannot be read (unreadable files can hide code from this guard)`); continue; }
  for (const [name, re] of rules) {
    if (re && re.test(text)) problems.push(`${f}: ${name}`);
  }
  if (!f.startsWith('scripts/') && /child_process/.test(text)) problems.push(`${f}: child_process outside scripts/`);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
  if (/\bnode\s+(?!scripts\/security-guard\.mjs)\S+/.test(cmd)) problems.push(`package.json script "${name}" runs a JS file: ${cmd}`);
  if (/(curl|wget|bash\s+-c|\|\s*sh)/.test(cmd)) problems.push(`package.json script "${name}" downloads or pipes to a shell: ${cmd}`);
}
for (const hook of ['preinstall', 'install', 'postinstall', 'prepare', 'prebuild', 'predev']) {
  if (pkg.scripts?.[hook]) problems.push(`package.json defines lifecycle hook "${hook}" – review it`);
}

if (problems.length) {
  console.error('Security guard FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`Security guard passed (${files.length} files checked).`);
