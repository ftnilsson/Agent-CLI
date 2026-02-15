# 02 — Version Control & Git

## Description

Use Git effectively as both a **personal productivity tool** and a **team collaboration system**. This skill goes beyond `add-commit-push` — it covers branching strategies, commit hygiene, history surgery, conflict resolution, code review, and workflows that scale from solo projects to large teams.

Version control is the single most universal tool in software development. Every language, every framework, every company uses it. Mastering it removes friction from every other activity.

## When To Use

- Every project, from the first line of code. No exceptions.
- Collaborating with one or more developers on shared code.
- Needing to experiment safely (branches), recover from mistakes (revert/reset), or understand why a change was made (blame/log).
- Setting up CI/CD pipelines triggered by Git events.
- Managing releases, hotfixes, and parallel development streams.

## Prerequisites

| Skill | Why |
|-------|-----|
| Command-line proficiency | Git is best understood through the CLI; GUIs hide critical details |
| Basic file system concepts | Understanding how files, directories, and diffs work |

## Instructions

### 1 — The Mental Model

Git is a **directed acyclic graph (DAG)** of snapshots. Every commit is a complete snapshot of the project, not a diff. Understanding this model makes every Git operation intuitive:

```
            main
              │
    A ◄── B ◄── C ◄── D
                       │
                       └── E ◄── F
                                 │
                              feature
```

- **Commits** (A-F) are immutable snapshots with a parent pointer.
- **Branches** (main, feature) are just movable pointers to commits.
- **HEAD** is a pointer to the current branch (or commit, when detached).
- **Tags** are immutable pointers to commits (used for releases).

### 2 — Configuration Essentials

```bash
# Identity
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Default branch name
git config --global init.defaultBranch main

# Better diff algorithm
git config --global diff.algorithm histogram

# Auto-correct typos (runs after 1.5s)
git config --global help.autocorrect 15

# Rebase by default on pull (avoid merge commits)
git config --global pull.rebase true

# Default push behaviour
git config --global push.default current
git config --global push.autoSetupRemote true

# Better merge conflict markers (shows base version too)
git config --global merge.conflictstyle zdiff3

# Global gitignore
git config --global core.excludesfile ~/.gitignore_global

# Sign commits with SSH key (recommended)
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
```

### 3 — The Commit as a Unit of Communication

A commit is a **message to future developers** (including yourself). It should answer three questions:

1. **What** changed? → the diff
2. **Why** did it change? → the commit message
3. **Does this change stand alone?** → each commit should be atomic and buildable

#### Commit Message Format

```
<type>(<scope>): <short summary in imperative mood>
                                                     ← blank line
<body: explain WHY, not WHAT — the diff shows WHAT>
                                                     ← blank line
<footer: references, breaking changes>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, `style`

Examples:

```
feat(auth): add OAuth2 login with Google

Users can now sign in with their Google account. This replaces the
custom email/password flow for new signups, reducing friction. The
old flow remains available for existing users.

Closes #142
```

```
fix(cart): prevent negative quantities on line items

Quantity was set from user input without validation. A negative value
caused the subtotal to become negative, which downstream payment
processing rejected with an opaque error.

Added Math.max(1, quantity) guard and a user-facing validation message.
```

**Bad commits to avoid:**
- `fix stuff` — what stuff? why?
- `WIP` — rebase/squash before merging
- `address review comments` — squash into the original commit

#### Atomic Commits

Each commit should represent **one logical change** that compiles and passes tests. If you've made three unrelated changes, split them into three commits:

```bash
# Stage specific hunks, not entire files
git add -p

# Interactive staging for surgical precision
git add -i
```

### 4 — Branching Strategies

#### 4.1 — Trunk-Based Development (recommended for most teams)

```
main:      A ── B ── C ── D ── E ── F ── G ── H
                │              ▲         ▲
                └── x ── y ────┘         │
                    (short-lived         │
                     feature branch     │
                     1-2 days)          │
                                        │
                         └── p ── q ────┘
                             (another feature)
```

- **Main is always deployable.**
- Feature branches live for **1-3 days max** (the shorter the better).
- Merge via squash or rebase to keep history linear.
- Use feature flags to decouple deploy from release.

#### 4.2 — GitHub Flow (simple, well-known)

1. Create a branch from `main`.
2. Make commits.
3. Open a Pull Request.
4. Review + discuss.
5. Merge to `main`.
6. Deploy.

#### 4.3 — Git Flow (for versioned releases)

```
main:       ─── v1.0 ─────────── v1.1 ────── v2.0
                  ▲                 ▲            ▲
develop:    ──────┼── A ── B ── C ──┼── D ── E ──┘
                  │                 │
release/1.1:      └────── RC1 ─────┘
                                │
hotfix/1.0.1:            ── fix ──► main + develop
```

Use Git Flow **only if** you maintain multiple supported versions (e.g., library/framework authors, mobile apps with staged rollouts).

### 5 — Rebase vs. Merge

| Approach | Result | Best For |
|----------|--------|----------|
| `git merge` | Creates a merge commit; preserves branch topology | Shared/long-lived branches where history matters |
| `git rebase` | Replays commits on top of target; linear history | Feature branches before merging; keeping history clean |
| `git merge --squash` | Combines all branch commits into one; linear history | Short-lived feature branches |

#### Interactive Rebase (History Surgery)

```bash
# Rewrite the last 5 commits
git rebase -i HEAD~5
```

Commands in the interactive editor:

| Command | Effect |
|---------|--------|
| `pick` | Keep the commit as-is |
| `reword` | Change the commit message |
| `edit` | Stop and let you amend the commit |
| `squash` | Meld into the previous commit, combine messages |
| `fixup` | Meld into previous commit, discard this message |
| `drop` | Delete the commit |
| `reorder` | Move lines to reorder commits |

**Golden rule:** Never rebase commits that have been pushed to a shared branch that others are working on.

### 6 — Conflict Resolution

Conflicts are not scary — they're **information**. Two people changed the same thing, and Git needs a human to decide the intent.

```bash
# See which files conflict
git status

# For each conflicted file, the markers look like:
<<<<<<< HEAD (yours)
    return user.email;
||||||| base (original — shown with zdiff3)
    return user.getEmail();
======= 
    return user.emailAddress;
>>>>>>> feature (theirs)
```

**Resolution process:**
1. Read the base (middle) version to understand the original.
2. Understand what each side intended.
3. Write the correct merged version (which may differ from both sides).
4. Remove all conflict markers.
5. Test that the merged code compiles and passes tests.
6. `git add <file>` then `git rebase --continue` (or `git merge --continue`).

**Tip:** Use a 3-way merge tool for complex conflicts:

```bash
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait --merge $REMOTE $LOCAL $BASE $MERGED'
```

### 7 — Recovering from Mistakes

| Situation | Command | Notes |
|-----------|---------|-------|
| Undo last commit (keep changes) | `git reset --soft HEAD~1` | Changes stay staged |
| Undo last commit (unstage changes) | `git reset --mixed HEAD~1` | Changes stay in working tree |
| Undo last commit (discard everything) | `git reset --hard HEAD~1` | **Destructive** — changes are gone |
| Undelete a commit/branch | `git reflog` then `git checkout <sha>` | Reflog keeps ~90 days of history |
| Undo a pushed commit safely | `git revert <sha>` | Creates a new commit that undoes the change |
| Remove a file from staging | `git restore --staged <file>` | |
| Discard working tree changes | `git restore <file>` | **Destructive** |
| Recover a deleted branch | `git reflog` → find the tip → `git branch <name> <sha>` | |
| Undo a rebase gone wrong | `git reflog` → `git reset --hard <pre-rebase-sha>` | |

**The reflog is your safety net.** It records every HEAD movement for ~90 days. If you can describe what you did, you can probably undo it.

### 8 — Advanced Techniques

#### Bisect (Find the Commit That Introduced a Bug)

```bash
git bisect start
git bisect bad                    # Current commit is broken
git bisect good v1.2.0            # This tag was known-good

# Git checks out a middle commit. Test it, then:
git bisect good                   # or: git bisect bad

# Repeat until Git identifies the exact commit.
# Automate with a test script:
git bisect run ./test-script.sh

git bisect reset                  # Return to original branch
```

#### Worktrees (Multiple Branches Checked Out Simultaneously)

```bash
# Work on a hotfix without stashing your feature work
git worktree add ../hotfix-branch hotfix/critical-fix

# When done:
git worktree remove ../hotfix-branch
```

#### Stash

```bash
git stash                         # Save and clean working tree
git stash push -m "WIP: auth"    # Named stash
git stash list                    # See all stashes
git stash pop                     # Apply and remove latest stash
git stash apply stash@{2}        # Apply without removing
git stash drop stash@{0}         # Delete a stash
```

#### Cherry-Pick

```bash
# Apply a specific commit from another branch
git cherry-pick <sha>

# Apply without committing (stage only)
git cherry-pick --no-commit <sha>
```

### 9 — Code Review via Pull Requests

Code review is the **highest-leverage activity** in collaborative development. A good review culture catches bugs, spreads knowledge, and improves design.

#### As the Author

1. **Keep PRs small** — under 400 lines of diff. Large PRs get rubber-stamped.
2. **Write a clear description** — what, why, how to test, screenshots/video if UI.
3. **Self-review first** — read your own diff before requesting review. You'll catch half the issues.
4. **Separate refactoring from behaviour changes** — don't mix cleanups with new features.
5. **Respond to every comment** — even if just "Done" or "Addressed in <sha>".

#### As the Reviewer

1. **Review for correctness, design, and clarity** — in that order.
2. **Ask questions instead of making demands** — "What happens if X is null here?" is better than "Add a null check".
3. **Distinguish blocking from non-blocking feedback** — prefix with `nit:`, `suggestion:`, or `blocking:`.
4. **Approve when it's good enough** — perfect is the enemy of shipped.
5. **Time-box reviews** — review within 4 hours of request to avoid blocking the author.

### 10 — .gitignore Patterns

```gitignore
# OS files
.DS_Store
Thumbs.db

# Editor/IDE
.vscode/
.idea/
*.swp
*.swo

# Dependencies (install from lockfile)
node_modules/
vendor/
.venv/
__pycache__/

# Build output
dist/
build/
out/
*.o
*.exe

# Environment & secrets (NEVER commit)
.env
.env.local
*.pem
*.key

# Logs
*.log
logs/
```

**Never commit secrets.** If you accidentally do:
```bash
# Remove from history (use git-filter-repo, not filter-branch)
pip install git-filter-repo
git filter-repo --path .env --invert-paths
```
Then rotate the exposed credentials immediately.

### 11 — Git Hooks

Automate quality checks before commits/pushes:

```bash
# .git/hooks/pre-commit (make executable: chmod +x)
#!/bin/sh
# Run linter before allowing commit
npm run lint --quiet
if [ $? -ne 0 ]; then
    echo "Lint failed. Fix errors before committing."
    exit 1
fi
```

Use **Husky** (JS), **pre-commit** (Python), or **Lefthook** (polyglot) to manage hooks across the team:

```yaml
# .lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint:
      run: npm run lint --quiet
    typecheck:
      run: npm run typecheck
    test:
      run: npm run test -- --bail
```

## Best Practices

1. **Commit early, commit often** — small atomic commits are easier to review, revert, bisect, and understand.
2. **Write commit messages for the reader six months from now** — explain *why*, not *what*.
3. **Never commit directly to main** — always use a branch + PR, even for solo projects (it builds discipline).
4. **Rebase feature branches before merging** — a linear history is dramatically easier to navigate.
5. **Keep branches short-lived** — 1-3 days. Long-lived branches lead to painful merges.
6. **Use `git add -p`** to stage only the relevant changes — avoid committing debug code or unrelated edits.
7. **Protect main** — require PR reviews, passing CI, and no force-pushes on the main branch.
8. **Tag releases** — `git tag -a v1.2.0 -m "Release 1.2.0"` creates an annotated reference point.
9. **Use `.gitattributes`** to handle line endings and binary files consistently across platforms.
10. **Review your own PR before requesting review** — you'll catch obvious issues and show respect for the reviewer's time.

## Common Pitfalls

| Pitfall | How It Happens | Fix |
|---------|---------------|-----|
| **Committing secrets** | `.env`, API keys, passwords in the repo | `.gitignore` from day one; use `git-filter-repo` to scrub history; rotate credentials immediately |
| **Giant monolithic commits** | "I'll commit when it's done" | Commit after each small, logical change. Use `git add -p` |
| **Merge commit spaghetti** | Everyone merges without rebasing | Set `pull.rebase true`; squash-merge feature branches |
| **Force-pushing shared branches** | `git push --force` on main | Use `--force-with-lease` (safer); never force-push main |
| **Detached HEAD panic** | Checking out a tag or SHA | `git switch -c new-branch` to resume from there |
| **Forgetting to pull before pushing** | Working on a stale branch | `git pull --rebase` before pushing |
| **Losing work after reset --hard** | Thought the changes were saved | Check `git reflog`; stash uncommitted work first |
| **Binary files bloating the repo** | Committing images, videos, builds | Use Git LFS for large binaries; `.gitignore` build outputs |
| **Ignoring merge conflicts** | Accepting "theirs" or "ours" blindly | Always read both sides and the base; understand intent |
| **Branch naming chaos** | `fix`, `test2`, `johns-branch`, `asdf` | Convention: `feat/`, `fix/`, `chore/` prefix + ticket number |

## Reference

- [Pro Git Book](https://git-scm.com/book/en/v2) — Free, comprehensive, and authoritative
- [Git Flight Rules](https://github.com/k88hudson/git-flight-rules) — "I did X, how do I fix it?"
- [Conventional Commits](https://www.conventionalcommits.org/) — Commit message specification
- [Trunk-Based Development](https://trunkbaseddevelopment.com/) — The preferred branching strategy
- [Atlassian Git Tutorials](https://www.atlassian.com/git/tutorials) — Visual, well-explained guides
- [git-filter-repo](https://github.com/newren/git-filter-repo) — The recommended tool for history rewriting
- [Lefthook](https://github.com/evilmartians/lefthook) — Fast, cross-platform Git hooks manager
