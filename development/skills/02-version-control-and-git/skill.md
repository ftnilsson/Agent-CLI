# 02 — Version Control & Git

## Commit Conventions

Use Conventional Commits format:

```
<type>(<scope>): <short summary in imperative mood>

<body: explain WHY, not WHAT — the diff shows WHAT>

<footer: issue references, breaking changes>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, `style`

```
feat(auth): add OAuth2 login with Google

Users can now sign in with their Google account. This replaces the
custom email/password flow for new signups, reducing friction.

Closes #142
```

**Bad commits:** `fix stuff`, `WIP`, `address review comments` — squash or rebase before merging.

Each commit must represent one logical change that compiles and passes tests. Stage hunks with `git add -p`, not entire files.

## Branching Strategy

**Default: Trunk-Based Development**
- Main is always deployable.
- Feature branches live 1-3 days maximum.
- Use squash or rebase merge to keep history linear.
- Use feature flags to decouple deploy from release.

**GitHub Flow** (simple, well-known): branch → commit → PR → review → merge to main → deploy.

**Git Flow**: use only if maintaining multiple supported versions (library authors, staged mobile rollouts). Adds `develop`, `release/*`, and `hotfix/*` branches.

## Rebase vs. Merge

| Approach | Use When |
|----------|----------|
| `git merge` | Shared/long-lived branches where branch topology matters |
| `git rebase` | Feature branches before merging; keeping history linear |
| `git merge --squash` | Short-lived feature branches — combine all commits into one |

Never rebase commits that have been pushed to a shared branch others are working on.

## Recovering from Mistakes

| Situation | Command | Notes |
|-----------|---------|-------|
| Undo last commit (keep changes staged) | `git reset --soft HEAD~1` | |
| Undo last commit (unstage changes) | `git reset --mixed HEAD~1` | |
| Undo last commit (discard everything) | `git reset --hard HEAD~1` | Destructive |
| Undo a pushed commit safely | `git revert <sha>` | Creates a new reverting commit |
| Remove a file from staging | `git restore --staged <file>` | |
| Discard working tree changes | `git restore <file>` | Destructive |
| Recover a deleted branch | `git reflog` → `git branch <name> <sha>` | |
| Undo a rebase gone wrong | `git reflog` → `git reset --hard <pre-rebase-sha>` | |
| Find the commit that introduced a bug | `git bisect start` → mark good/bad → `git bisect run` | |

The reflog is your safety net — it records every HEAD movement for ~90 days.

## Key Commands

```bash
# Stage specific hunks (not entire files)
git add -p

# Interactive rebase — squash, reorder, reword last 5 commits
git rebase -i HEAD~5

# Work on a hotfix without stashing feature work
git worktree add ../hotfix-branch hotfix/critical-fix

# Named stash
git stash push -m "WIP: auth"

# Apply a specific commit from another branch
git cherry-pick <sha>
```

## Pull Request Rules

**As author:**
- Keep PRs under 400 lines of diff. Large PRs get rubber-stamped.
- Write a clear description: what, why, how to test.
- Self-review your own diff before requesting review.
- Never mix refactoring with behaviour changes in the same PR.

**As reviewer:**
- Review for correctness first, design second, clarity third.
- Distinguish blocking from non-blocking: prefix with `blocking:`, `suggestion:`, or `nit:`.
- Time-box reviews to within 4 hours of the request.

## .gitignore Essentials

Never commit: `.env`, `*.key`, `*.pem`, API tokens, passwords.

If you accidentally commit a secret: use `git filter-repo --path .env --invert-paths`, then rotate the exposed credentials immediately.

Always ignore: `node_modules/`, `dist/`, `build/`, `.DS_Store`, `*.log`, `.idea/`, `.vscode/`

## Anti-patterns

| Pattern | Fix |
|---------|-----|
| Committing secrets | `.gitignore` from day one; use `git filter-repo` to scrub; rotate credentials |
| Giant monolithic commits | Commit after each logical change; use `git add -p` |
| Merge commit spaghetti | Set `pull.rebase true`; squash-merge feature branches |
| Force-pushing shared branches | Use `--force-with-lease`; never force-push main |
| Long-lived feature branches | Keep branches 1-3 days; use feature flags for incomplete work |
| Binary files bloating the repo | Use Git LFS for large binaries; ignore build outputs |

## Best Practices

- Commit early, commit often — small atomic commits are easier to review, revert, and bisect.
- Write commit messages for the reader six months from now — explain why, not what.
- Never commit directly to main — always use a branch and PR, even solo.
- Rebase feature branches before merging for a linear, navigable history.
- Protect main: require PR reviews, passing CI, no force-pushes.
- Tag releases: `git tag -a v1.2.0 -m "Release 1.2.0"`.
- Use `.gitattributes` to handle line endings and binary files across platforms.
- Use Husky, pre-commit, or Lefthook to enforce lint/typecheck/test as pre-commit hooks.
