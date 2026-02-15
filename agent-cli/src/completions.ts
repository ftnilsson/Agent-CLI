// ─── Shell Completions ───────────────────────────────────────────────────────

const COMMANDS = [
  "init",
  "install",
  "list",
  "update",
  "add",
  "remove",
  "preset",
  "diff",
  "create",
  "prompt",
];

/**
 * Generate shell completion script for the given shell.
 */
export function generateCompletions(shell: string): string {
  switch (shell) {
    case "zsh":
      return generateZsh();
    case "bash":
      return generateBash();
    case "fish":
      return generateFish();
    default:
      throw new Error(`Unsupported shell: "${shell}". Use zsh, bash, or fish.`);
  }
}

function generateZsh(): string {
  return `#compdef agent

_agent() {
  local -a commands
  commands=(
    'init:Create a .agent.json manifest'
    'install:Pull skills + compose agent instructions'
    'list:Show entries in your manifest'
    'update:Update ref to latest tag/commit'
    'add:Add skills or agent instructions'
    'remove:Remove entries from the manifest'
    'preset:Apply a named preset'
    'diff:Preview what would change'
    'create:Scaffold a new agent.md or skill.md'
    'prompt:Browse and use prompts'
  )

  local -a global_opts
  global_opts=(
    '--help[Show help]'
    '-h[Show help]'
    '--version[Show version]'
    '-v[Show version]'
  )

  _arguments -C \\
    '1:command:->command' \\
    '*::arg:->args'

  case "$state" in
    command)
      _describe -t commands 'agent command' commands
      _describe -t options 'options' global_opts
      ;;
    args)
      case "\${words[1]}" in
        init)
          _arguments \\
            '1:source:' \\
            '--output[Output directory]:dir:_directories'
          ;;
        install)
          _arguments \\
            '--format[Agent output format]:format:(copilot cursor claude)' \\
            '--no-gitignore[Skip auto-adding to .gitignore]'
          ;;
        list)
          _arguments \\
            '--remote[Show all available entries]'
          ;;
        add|remove)
          # Could be extended to fetch from registry for live completions
          _arguments '*:entry:'
          ;;
        preset)
          _arguments \\
            '--list[Show available presets]' \\
            '1:preset:'
          ;;
        create)
          _arguments \\
            '1:type:(agent skill)'
          ;;
        prompt)
          _arguments \\
            '1:subcommand:(list show copy)'
          ;;
      esac
      ;;
  esac
}

_agent "$@"

# To install: agent completions zsh > ~/.zsh/completions/_agent
# Then add to .zshrc: fpath=(~/.zsh/completions $fpath) && autoload -Uz compinit && compinit
`;
}

function generateBash(): string {
  return `# bash completion for agent-cli

_agent_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="init install list update add remove preset diff create prompt"

  case "\${COMP_WORDS[1]}" in
    install)
      if [[ "$prev" == "--format" ]]; then
        COMPREPLY=( $(compgen -W "copilot cursor claude" -- "$cur") )
        return
      fi
      COMPREPLY=( $(compgen -W "--format --no-gitignore" -- "$cur") )
      return
      ;;
    list)
      COMPREPLY=( $(compgen -W "--remote" -- "$cur") )
      return
      ;;
    preset)
      COMPREPLY=( $(compgen -W "--list" -- "$cur") )
      return
      ;;
    init)
      if [[ "$prev" == "--output" ]]; then
        COMPREPLY=( $(compgen -d -- "$cur") )
        return
      fi
      COMPREPLY=( $(compgen -W "--output" -- "$cur") )
      return
      ;;
    create)
      COMPREPLY=( $(compgen -W "agent skill" -- "$cur") )
      return
      ;;
    prompt)
      COMPREPLY=( $(compgen -W "list show copy" -- "$cur") )
      return
      ;;
  esac

  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "$commands --help --version" -- "$cur") )
  fi
}

complete -F _agent_completions agent

# To install: agent completions bash >> ~/.bashrc
# Or: agent completions bash > /etc/bash_completion.d/agent
`;
}

function generateFish(): string {
  return `# fish completion for agent-cli

# Disable file completions by default
complete -c agent -f

# Commands
complete -c agent -n '__fish_use_subcommand' -a init -d 'Create a .agent.json manifest'
complete -c agent -n '__fish_use_subcommand' -a install -d 'Pull skills + compose agent instructions'
complete -c agent -n '__fish_use_subcommand' -a list -d 'Show entries in your manifest'
complete -c agent -n '__fish_use_subcommand' -a update -d 'Update ref to latest tag/commit'
complete -c agent -n '__fish_use_subcommand' -a add -d 'Add skills or agent instructions'
complete -c agent -n '__fish_use_subcommand' -a remove -d 'Remove entries from the manifest'
complete -c agent -n '__fish_use_subcommand' -a preset -d 'Apply a named preset'
complete -c agent -n '__fish_use_subcommand' -a diff -d 'Preview what would change'
complete -c agent -n '__fish_use_subcommand' -a create -d 'Scaffold a new agent.md or skill.md'
complete -c agent -n '__fish_use_subcommand' -a prompt -d 'Browse and use prompts'

# Global options
complete -c agent -n '__fish_use_subcommand' -s h -l help -d 'Show help'
complete -c agent -n '__fish_use_subcommand' -s v -l version -d 'Show version'

# init options
complete -c agent -n '__fish_seen_subcommand_from init' -l output -d 'Output directory' -r -a '(__fish_complete_directories)'

# install options
complete -c agent -n '__fish_seen_subcommand_from install' -l format -d 'Agent output format' -r -a 'copilot cursor claude'
complete -c agent -n '__fish_seen_subcommand_from install' -l no-gitignore -d 'Skip auto-adding to .gitignore'

# list options
complete -c agent -n '__fish_seen_subcommand_from list' -l remote -d 'Show all available entries'

# preset options
complete -c agent -n '__fish_seen_subcommand_from preset' -l list -d 'Show available presets'

# create options
complete -c agent -n '__fish_seen_subcommand_from create' -a 'agent skill' -d 'Type to create'

# prompt options
complete -c agent -n '__fish_seen_subcommand_from prompt' -a 'list show copy' -d 'Prompt subcommand'

# To install: agent completions fish > ~/.config/fish/completions/agent.fish
`;
}
