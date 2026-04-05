// ─── UI utilities: logo, colors, spinner, icons ─────────────────────────────

// ─── ANSI helpers (no dependencies) ──────────────────────────────────────────

const isTTY = process.stdout.isTTY ?? false;

const c = {
  reset: isTTY ? "\x1b[0m" : "",
  dim: isTTY ? "\x1b[2m" : "",
  bold: isTTY ? "\x1b[1m" : "",
  cyan: isTTY ? "\x1b[36m" : "",
  green: isTTY ? "\x1b[32m" : "",
  yellow: isTTY ? "\x1b[33m" : "",
  magenta: isTTY ? "\x1b[35m" : "",
  blue: isTTY ? "\x1b[34m" : "",
  gray: isTTY ? "\x1b[90m" : "",
  white: isTTY ? "\x1b[97m" : "",
};

export const color = c;

// ─── ASCII Logo ──────────────────────────────────────────────────────────────

const LOGO = `
${c.cyan}   ╔═══════════════════════════════════════════════════╗
   ║                                                   ║
   ║${c.bold}${c.white}     █████╗  ██████╗ ███████╗███╗   ██╗████████╗    ${c.reset}${c.cyan}║
   ║${c.bold}${c.white}    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝    ${c.reset}${c.cyan}║
   ║${c.bold}${c.white}    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║       ${c.reset}${c.cyan}║
   ║${c.bold}${c.white}    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║       ${c.reset}${c.cyan}║
   ║${c.bold}${c.white}    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║       ${c.reset}${c.cyan}║
   ║${c.bold}${c.white}    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝       ${c.reset}${c.cyan}║
   ║${c.bold}${c.magenta}                  ┌─┐┬  ┬                           ${c.reset}${c.cyan}║
   ║${c.bold}${c.magenta}                  │  │  │                           ${c.reset}${c.cyan}║
   ║${c.bold}${c.magenta}                  └─┘┴─┘┴                           ${c.reset}${c.cyan}║
   ║                                                   ║
   ╚═══════════════════════════════════════════════════╝${c.reset}
`;

export function printLogo(): void {
  console.log(LOGO);
}

// ─── Icons / Emojis ──────────────────────────────────────────────────────────

export const icon = {
  // Status
  success: "✅",
  error: "❌",
  warning: "⚠️ ",
  info: "ℹ️ ",
  skip: "⏭️ ",

  // Actions
  add: "➕",
  remove: "➖",
  install: "📦",
  update: "🔄",
  search: "🔍",
  link: "🔗",
  compose: "🧩",
  scaffold: "🏗️ ",
  diff: "🔀",
  preset: "⚡",
  list: "📋",
  init: "🚀",

  // Items
  skill: "📚",
  agent: "🤖",
  prompt: "💬",
  folder: "📁",
  file: "📄",
  lock: "🔒",
  git: "🌿",
  star: "⭐",
  clipboard: "📋",

  // Tools
  container: "🐳",

  // UI
  arrow: "→",
  bullet: "•",
  check: "✓",
  cross: "✗",
  included: "●",
  available: "○",
  line: "─",

  // Interactive
  question: "❓",
  pick: "👉",
  done: "🎉",
};

// ─── Spinner ─────────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export class Spinner {
  private frameIndex = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  start(): void {
    if (!isTTY) {
      console.log(`  ${this.message}...`);
      return;
    }
    this.frameIndex = 0;
    process.stdout.write(`  ${c.cyan}${SPINNER_FRAMES[0]}${c.reset} ${this.message}`);
    this.interval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % SPINNER_FRAMES.length;
      process.stdout.write(
        `\r  ${c.cyan}${SPINNER_FRAMES[this.frameIndex]}${c.reset} ${this.message}`,
      );
    }, 80);
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (isTTY) {
      process.stdout.write(`\r  ${icon.success} ${finalMessage ?? this.message}\n`);
    }
  }

  fail(errorMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (isTTY) {
      process.stdout.write(`\r  ${icon.error} ${errorMessage ?? this.message}\n`);
    }
  }
}

// ─── Section header ──────────────────────────────────────────────────────────

export function sectionHeader(title: string): void {
  console.log(`\n  ${c.bold}${c.cyan}${title}${c.reset}`);
  console.log(`  ${c.dim}${"─".repeat(title.length + 2)}${c.reset}\n`);
}

// ─── Formatted log helpers ───────────────────────────────────────────────────

export function success(msg: string): void {
  console.log(`  ${icon.success} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`  ${icon.warning} ${c.yellow}${msg}${c.reset}`);
}

export function info(msg: string): void {
  console.log(`  ${icon.info} ${msg}`);
}

export function err(msg: string): void {
  console.log(`  ${icon.error} ${c.yellow}${msg}${c.reset}`);
}
