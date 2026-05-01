import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import { generateCompletions } from "../completions.js";

describe("generateCompletions", () => {
  it("generates zsh completions", () => {
    const result = generateCompletions("zsh");
    assert.ok(result.includes("#compdef agent"));
    assert.ok(result.includes("_agent"));
    assert.ok(result.includes("init"));
    assert.ok(result.includes("install"));
    assert.ok(result.includes("diff"));
    assert.ok(result.includes("create"));
  });

  it("generates bash completions", () => {
    const result = generateCompletions("bash");
    assert.ok(result.includes("_agent_completions"));
    assert.ok(result.includes("complete"));
    assert.ok(result.includes("init"));
    assert.ok(result.includes("install"));
  });

  it("generates fish completions", () => {
    const result = generateCompletions("fish");
    assert.ok(result.includes("agent"));
    assert.ok(result.includes("init"));
    assert.ok(result.includes("install"));
    // Fish uses 'complete -c agent'
    assert.ok(result.includes("complete -c agent"));
  });

  it("throws for unsupported shell", () => {
    assert.throws(
      () => generateCompletions("powershell"),
      { message: /Unsupported shell.*powershell/ },
    );
  });

  it("includes all subcommands in zsh output", () => {
    const result = generateCompletions("zsh");
    const expectedCommands = [
      "init", "install", "list", "update",
      "add", "remove", "preset", "diff", "create",
      "prompt", "search", "completions", "dev-container",
    ];
    for (const cmd of expectedCommands) {
      assert.ok(result.includes(cmd), `Missing command: ${cmd}`);
    }
  });

  it("includes search and completions support across shells", () => {
    const zsh = generateCompletions("zsh");
    const bash = generateCompletions("bash");
    const fish = generateCompletions("fish");

    assert.ok(zsh.includes("'search:Find skills, agents, and prompts by keyword'"));
    assert.ok(zsh.includes("'completions:Output shell completion script'"));
    assert.ok(zsh.includes("--json[Output results as JSON]"));
    assert.ok(zsh.includes("'1:shell:(zsh bash fish)'"));

    assert.ok(bash.includes('commands="init install list update add remove preset diff create prompt search completions dev-container"'));
    assert.ok(bash.includes('compgen -W "--json"'));
    assert.ok(bash.includes('compgen -W "zsh bash fish"'));

    assert.ok(fish.includes("-a search -d 'Find skills, agents, and prompts by keyword'"));
    assert.ok(fish.includes("-a completions -d 'Output shell completion script'"));
    assert.ok(fish.includes("__fish_seen_subcommand_from search' -l json"));
    assert.ok(fish.includes("__fish_seen_subcommand_from completions' -a 'zsh bash fish'"));
  });

  it("includes dev-container --target values in zsh output", () => {
    const result = generateCompletions("zsh");
    assert.ok(result.includes("dev-container"), "Missing dev-container command");
    assert.ok(result.includes("claude"), "Missing claude target");
    assert.ok(result.includes("copilot"), "Missing copilot target");
    assert.ok(result.includes("ai"), "Missing ai target");
  });

  it("includes dev-container --target values in bash output", () => {
    const result = generateCompletions("bash");
    assert.ok(result.includes("dev-container"), "Missing dev-container command");
    assert.ok(result.match(/compgen -W "claude copilot ai"/), "Missing target completions");
  });

  it("includes dev-container --target values in fish output", () => {
    const result = generateCompletions("fish");
    assert.ok(result.includes("dev-container"), "Missing dev-container command");
    assert.ok(result.includes("-a 'claude copilot ai'"), "Missing target completions");
  });

  it("zsh completion is a valid function definition", () => {
    const result = generateCompletions("zsh");
    // Should start with #compdef and define the _agent function
    assert.ok(result.startsWith("#compdef agent"));
    assert.ok(result.includes("_agent()"));
  });

  it("bash completion registers with complete command", () => {
    const result = generateCompletions("bash");
    assert.ok(result.includes("complete -F _agent_completions agent"));
  });
});
