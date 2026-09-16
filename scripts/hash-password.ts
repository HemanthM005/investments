/**
 * Generate a hashed APP_USERS entry.
 *
 *   npx tsx scripts/hash-password.ts hemanth 'my password'
 *   npx tsx scripts/hash-password.ts hemanth        # prompts, nothing in shell history
 *
 * Paste the printed entry into APP_USERS. The plaintext is never stored.
 */
import { hashPassword } from '../lib/password';
import readline from 'readline';

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const out = process.stdout as NodeJS.WriteStream & { muted?: boolean };
    // @ts-expect-error — replacing the write hook to hide typed characters
    rl._writeToOutput = (s: string) => { if (!out.muted) process.stdout.write(s); };
    rl.question(question, (answer) => { out.muted = false; process.stdout.write('\n'); rl.close(); resolve(answer); });
    out.muted = true;
    process.stdout.write(question);
  });
}

async function main() {
  const [user, inline] = process.argv.slice(2);
  if (!user) {
    console.error('usage: npx tsx scripts/hash-password.ts <username> [password]');
    process.exit(1);
  }
  if (!/^[a-z0-9_-]+$/.test(user)) {
    console.error('Username must be [a-z0-9_-] — it becomes a storage path segment.');
    process.exit(1);
  }

  const password = inline ?? (await promptHidden('Password: '));
  if (!password) { console.error('Empty password.'); process.exit(1); }

  const hash = await hashPassword(password);
  console.log('\nAPP_USERS entry (append to the comma-separated list):\n');
  console.log(`  ${user}:${hash}\n`);
}

main();
