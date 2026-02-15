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
    ];
    for (const cmd of expectedCommands) {
      assert.ok(result.includes(cmd), `Missing command: ${cmd}`);
    }
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
