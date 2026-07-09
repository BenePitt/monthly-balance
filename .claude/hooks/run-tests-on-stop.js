#!/usr/bin/env node
/**
 * Stop hook: runs the Vitest suite before Claude ends a turn and blocks
 * with the failure output if it doesn't pass, enforcing the CLAUDE.md rule
 * "npm test muss grün sein". The suite is fast (~1.5s), so it always runs
 * rather than trying to detect whether src/ was touched this turn.
 */
const { execSync } = require('child_process');

try {
  execSync('npm test', { stdio: 'pipe', encoding: 'utf-8' });
  process.exit(0);
} catch (err) {
  const output = (err.stdout || '') + (err.stderr || '');
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: `npm test schlägt fehl. Bitte beheben, bevor die Antwort abgeschlossen wird:\n${output.slice(-4000)}`,
  }));
  process.exit(0);
}
