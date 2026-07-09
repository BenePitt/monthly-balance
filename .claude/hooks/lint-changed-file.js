#!/usr/bin/env node
/**
 * PostToolUse hook (Edit|Write): runs ESLint on the file that was just
 * edited and feeds any findings back to Claude as context. Non-blocking.
 *
 * Scoped to .js/.jsx only under src/ — the project's eslint.config.js has
 * no TypeScript parser configured, so running this against .ts/.tsx files
 * would only ever surface the known, pre-existing "Parsing error" noise
 * unrelated to the actual edit (see CLAUDE.md "Offene Fragen").
 */
const path = require('path');
const { execFileSync } = require('child_process');

const eslintBin = path.join(process.cwd(), 'node_modules', 'eslint', 'bin', 'eslint.js');

let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  const filePath = payload && payload.tool_input && payload.tool_input.file_path;
  if (!filePath) process.exit(0);

  const normalized = filePath.replace(/\\/g, '/');
  const isInSrc = normalized.includes('/src/') || normalized.startsWith('src/');
  const isJs = /\.(js|jsx)$/.test(normalized);
  if (!isInSrc || !isJs) process.exit(0);

  try {
    execFileSync(process.execPath, [eslintBin, filePath], { stdio: 'pipe', encoding: 'utf-8' });
    process.exit(0);
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `ESLint meldet Probleme in ${filePath}:\n${output}`,
      },
    }));
    process.exit(0);
  }
});
