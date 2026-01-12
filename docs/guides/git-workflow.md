# Git Workflow

> This document describes the PrismaX Git workflow and commit conventions

---

## Branch Strategy

### Main Branches

| Branch    | Description                         | Protection Rules            |
| --------- | ----------------------------------- | --------------------------- |
| `main`    | Main branch, production code        | No direct push, requires PR |
| `develop` | Development branch, latest dev code | No direct push, requires PR |

### Feature Branches

| Branch Type         | Naming Convention        | Example                        |
| ------------------- | ------------------------ | ------------------------------ |
| Feature development | `feature/<description>`  | `feature/add-knowledge-base`   |
| Bug fix             | `fix/<description>`      | `fix/message-render-error`     |
| Hotfix              | `hotfix/<description>`   | `hotfix/critical-security-fix` |
| Refactor            | `refactor/<description>` | `refactor/chat-store`          |
| Documentation       | `docs/<description>`     | `docs/api-documentation`       |

---

## Commit Conventions

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type Categories

| Type       | Description                                |
| ---------- | ------------------------------------------ |
| `feat`     | New feature                                |
| `fix`      | Bug fix                                    |
| `docs`     | Documentation update                       |
| `style`    | Code formatting (no functional changes)    |
| `refactor` | Refactoring (not a new feature or bug fix) |
| `perf`     | Performance optimization                   |
| `test`     | Test related                               |
| `chore`    | Build/tooling related                      |
| `ci`       | CI/CD related                              |

### Scope Categories

| Scope      | Description          |
| ---------- | -------------------- |
| `web`      | Web application      |
| `desktop`  | Desktop application  |
| `ui`       | UI component library |
| `core`     | Core logic           |
| `ai-sdk`   | AI SDK               |
| `database` | Database             |
| `shared`   | Shared utilities     |

### Examples

```bash
# New feature
feat(web): add knowledge base management page

# Bug fix
fix(desktop): resolve window close event handling

# Documentation
docs: update API documentation

# Refactor
refactor(core): simplify message processing logic

# Performance optimization
perf(ui): optimize chat list rendering with virtualization
```

---

## Workflow

### 1. Start New Feature

```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/add-knowledge-base
```

### 2. Development Process

```bash
# Regular commits
git add .
git commit -m "feat(web): add knowledge base list component"

# Keep in sync with develop
git fetch origin
git rebase origin/develop
```

### 3. Complete Feature

```bash
# Push to remote
git push origin feature/add-knowledge-base

# Create Pull Request
# - Target branch: develop
# - Fill in PR description
# - Request Code Review
```

### 4. Code Review

- Requires at least 1 Approve
- All CI checks must pass
- Resolve all review comments

### 5. Merge

```bash
# Use Squash and Merge
# Delete feature branch after merge
```

---

## Pull Request Standards

### PR Title

Follow Commit Message format:

```
feat(web): add knowledge base management
```

### PR Description Template

```markdown
## Summary

Brief description of what this PR does.

## Changes

- Added knowledge base list page
- Implemented document upload functionality
- Added related tests

## Testing

- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing pass

## Screenshots (if UI changes)

[Add screenshots]

## Related Issues

Closes #123
```

---

## Git Hooks

The project uses Husky + lint-staged for pre-commit checks:

### pre-commit

```bash
# Run lint-staged
pnpm lint-staged
```

### commit-msg

```bash
# Validate commit message format
pnpm commitlint --edit $1
```

### lint-staged Configuration

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

---

## Version Release

### Version Number Convention

Follow [Semantic Versioning](https://semver.org/):

- `MAJOR.MINOR.PATCH`
- `1.0.0` -> `1.0.1` (Patch: Bug fix)
- `1.0.0` -> `1.1.0` (Minor: New feature, backward compatible)
- `1.0.0` -> `2.0.0` (Major: Breaking changes)

### Release Process

```bash
# 1. Create release branch
git checkout develop
git checkout -b release/v1.0.0

# 2. Update version number
pnpm changeset version

# 3. Update CHANGELOG
# Auto-generated

# 4. Commit
git add .
git commit -m "chore: release v1.0.0"

# 5. Merge to main
git checkout main
git merge release/v1.0.0

# 6. Tag
git tag v1.0.0
git push origin v1.0.0

# 7. Merge back to develop
git checkout develop
git merge main
```

---

## Common Commands

```bash
# View commit history
git log --oneline --graph

# Amend last commit
git commit --amend

# Interactive rebase
git rebase -i HEAD~3

# Stash current changes
git stash
git stash pop

# Discard uncommitted changes
git checkout -- .

# Revert committed changes (creates new commit)
git revert <commit-hash>

# Reset to a commit (use with caution)
git reset --hard <commit-hash>
```
