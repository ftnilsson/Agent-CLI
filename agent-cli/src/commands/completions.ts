import { generateCompletions } from "../completions.js";

/**
 * `agent completions <shell>` — Output shell completion script.
 */
export function cmdCompletions(args: string[]): void {
  const shell = args[0];
  if (!shell) {
    console.error("Usage: agent completions <zsh|bash|fish>");
    console.error("");
    console.error("Install completions:");
    console.error("  zsh:   agent completions zsh > ~/.zsh/completions/_agent");
    console.error("  bash:  agent completions bash >> ~/.bashrc");
    console.error("  fish:  agent completions fish > ~/.config/fish/completions/agent.fish");
    process.exit(1);
  }
  try {
    const script = generateCompletions(shell);
    process.stdout.write(script);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
