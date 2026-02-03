---
name: gitall
description: Run git commands across multiple repositories at once. Quick status checks, batch pulls/pushes, find dirty or ahead repos.
---

# gitall - Multi-Repo Git Operations

Run git commands across all repos in a directory simultaneously.

## Install

```bash
npm i -g gitall-cli
```

## Usage

```bash
# Basic status across all repos
gitall status

# Find repos with uncommitted changes
gitall dirty

# Find repos ahead of remote (need push)
gitall ahead

# Batch operations
gitall pull          # Pull all repos
gitall push          # Push all repos

# Run any git command
gitall run log -1 --oneline
gitall run branch -a
gitall run stash list
```

## When to use

- Managing multiple projects in ~/projects
- Quick health check across all repos
- Batch pulling after break
- Finding which repos have uncommitted work
- Syncing everything before end of day

## Output

```
📦 my-app (main)
   ✓ Clean

📦 another-project (develop)
   M src/index.js
   ?? new-file.txt

📦 third-repo (main)
   ↑2 ahead of origin
```

## Notes

- Scans current directory for subdirectories with `.git`
- Skips non-git directories silently
- Fast parallel execution
- Color-coded output (green=clean, yellow=dirty, blue=ahead)
