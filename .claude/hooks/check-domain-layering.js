#!/usr/bin/env node
/**
 * PostToolUse hook (Edit|Write): enforces the src/domain/ layering rule
 * from CLAUDE.md — domain/ may only import ../utils/AppLogger and uuid,
 * never React, ../context, ../storage, or ../services. Non-blocking:
 * surfaces a warning as context rather than forcing a retry, since this
 * is an architectural guideline that a human may occasionally need to
 * override deliberately.
 */
const fs = require('fs');

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
  const isInDomain = normalized.includes('/src/domain/') || normalized.startsWith('src/domain/');
  if (!isInDomain) process.exit(0);
  if (normalized.includes('/__tests__/')) process.exit(0);

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    process.exit(0);
  }

  const forbidden = [
    { pattern: /from\s+['"]react/i, label: 'React-Import' },
    { pattern: /from\s+['"].*\/context/i, label: 'Import aus context/' },
    { pattern: /from\s+['"].*\/storage/i, label: 'Import aus storage/' },
    { pattern: /from\s+['"].*\/services/i, label: 'Import aus services/' },
  ];

  const violations = forbidden
    .filter(({ pattern }) => pattern.test(content))
    .map(({ label }) => label);

  if (violations.length === 0) process.exit(0);

  process.stdout.write(JSON.stringify({
    systemMessage: `Layering-Verstoß in ${filePath}: ${violations.join(', ')}`,
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `Architekturregel verletzt in ${filePath}: domain/ darf nur utils/AppLogger und uuid importieren. Gefunden: ${violations.join(', ')}. Siehe CLAUDE.md, Abschnitt "Architektur".`,
    },
  }));
  process.exit(0);
});
