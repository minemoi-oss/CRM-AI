---

name: skill-builder
description: Use when creating reusable Codex skills/instructions, improving an existing skill, designing an agent workflow, or auditing instruction quality.
---

# Skill Builder — Codex

## Purpose

This skill helps Codex design, improve, and audit reusable agent instructions and development workflows.

The objective is to create instructions that are:

* clear;
* deterministic where possible;
* easy to maintain;
* safe;
* testable;
* adapted to the repository;
* understandable by another developer or AI agent.

Treat a skill as a reusable **SOP for an AI coding agent**.

Instead of explaining the same workflow repeatedly, document the procedure once and allow Codex to follow it consistently.

---

# Mode 1 — Build a New Skill

Before creating files, understand what the user actually wants.

Do not immediately generate an architecture when important requirements are unknown.

However, do not ask questions whose answers can already be found in:

* the user's request;
* repository files;
* existing documentation;
* existing agent instructions;
* configuration files;
* related skills.

Inspect the repository first when appropriate.

## Phase 1 — Discovery

Gather enough information to understand:

1. Goal
2. Trigger
3. Workflow
4. Inputs
5. Outputs
6. Dependencies
7. Guardrails
8. Integration with the repository

Continue until the workflow is sufficiently clear to implement safely.

### 1. Goal

Determine:

* What should the skill accomplish?
* What problem does it solve?
* Who or what will use it?
* What is explicitly outside its scope?

Suggest a concise name when necessary.

Prefer:

```text
lowercase-kebab-case
```

Example:

```text
database-auditor
api-builder
frontend-reviewer
security-check
```

---

### 2. Trigger

Determine when Codex should use the skill.

Collect realistic examples such as:

```text
Audit the backend architecture.

Check this API for security problems.

Create a CRUD module for customers.
```

Avoid overly broad triggers.

Bad:

```text
Use when coding.
```

Better:

```text
Use when reviewing FastAPI endpoints, services,
repositories, database access, or API architecture.
```

---

### 3. Workflow

Define exactly what Codex should do.

Prefer explicit numbered steps.

Example:

```text
1. Inspect the relevant repository files.
2. Identify the architecture currently used.
3. Check existing conventions before modifying code.
4. Determine the smallest required change.
5. Implement the change.
6. Run relevant tests or validation.
7. Review the diff.
8. Report what changed.
```

For every important step determine whether Codex should:

* inspect files;
* search the codebase;
* edit code;
* run commands;
* run tests;
* inspect logs;
* ask the user;
* stop because confirmation is required.

Avoid vague instructions such as:

```text
Make sure everything works.
```

Prefer:

```text
Run the tests related to the modified module.
If they fail, inspect the failure before making additional changes.
```

---

### 4. Inputs and Outputs

Explicitly document required inputs.

Possible inputs:

* repository files;
* user request;
* configuration;
* environment variables;
* database schema;
* API specification;
* logs;
* tests;
* documentation.

Define expected outputs.

Possible outputs:

* modified source files;
* migration;
* tests;
* audit report;
* implementation plan;
* documentation;
* terminal commands.

Never invent missing repository information when it can be inspected.

---

### 5. Dependencies

Identify dependencies before implementation.

Examples:

```text
Python
FastAPI
SQLAlchemy
PostgreSQL
Alembic
React
TypeScript
npm
pytest
```

Also identify external services or APIs.

Secrets must never be hardcoded.

Use environment variables or the project's existing secret-management mechanism.

---

### 6. Guardrails

Document dangerous or undesirable behavior.

Examples:

* Do not delete user data without explicit authorization.
* Do not expose secrets.
* Do not commit `.env`.
* Do not rewrite unrelated modules.
* Do not change public API contracts unnecessarily.
* Do not introduce dependencies without a reason.
* Do not silently modify database schemas.
* Do not disable security checks simply to make tests pass.
* Do not assume a command succeeded; inspect its result.
* Do not claim tests passed unless they were actually executed.

Prefer the smallest change that solves the requested problem.

---

# Phase 2 — Confirm the Design

For substantial or ambiguous skills, summarize the proposed design before implementation.

Use:

```markdown
# Skill Summary: [name]

## Goal
[one sentence]

## Trigger
[when this skill should be used]

## Workflow
1. ...
2. ...
3. ...

## Inputs
- ...

## Outputs
- ...

## Dependencies
- ...

## Guardrails
- ...

## Files
- ...
```

Ask for confirmation only when the remaining ambiguity could materially change the implementation.

For small, explicit, low-risk tasks, proceed directly.

---

# Phase 3 — Build

## Step 1 — Inspect Existing Instructions

Before creating a new skill, inspect the repository for existing agent instructions and related workflows.

Look for relevant files such as:

```text
AGENTS.md
README.md
CONTRIBUTING.md
docs/
scripts/
tests/
```

Also inspect existing skills or instruction directories if the repository uses them.

Do not duplicate an existing workflow if it can reasonably be extended.

---

## Step 2 — Determine Scope

Decide whether the instruction is:

### Task Skill

Used to perform a specific operation.

Examples:

* create an API endpoint;
* audit authentication;
* generate a migration;
* review a pull request.

### Reference Skill

Provides rules or conventions Codex should follow while working.

Examples:

* backend architecture conventions;
* API design standards;
* frontend style guide;
* security requirements.

---

## Step 3 — Write the Skill

Recommended structure:

```markdown
# [Skill Name]

## Purpose

## When to Use

## Context to Inspect

## Workflow

## Validation

## Output Format

## Guardrails
```

Keep instructions concise.

Prefer actionable commands over explanations.

Bad:

```text
Security is very important.
```

Good:

```text
Before modifying authentication code, inspect the existing
JWT creation, validation, password hashing, and protected-route
dependencies.
```

---

# Repository Awareness

Codex should understand the repository before changing it.

Before significant implementation:

1. inspect the directory structure;
2. locate relevant files;
3. inspect existing implementations;
4. identify project conventions;
5. inspect related tests;
6. inspect dependency/configuration files;
7. only then modify code.

Do not create duplicate architecture simply because the user described a desired pattern.

Reuse existing abstractions whenever appropriate.

---

# Coding Rules

When modifying code:

1. Make the smallest coherent change.
2. Preserve existing architecture unless redesign was requested.
3. Follow existing naming conventions.
4. Avoid unrelated refactors.
5. Keep functions focused.
6. Handle errors explicitly.
7. Add or update tests when appropriate.
8. Run relevant validation after editing.

Before considering the task complete, inspect the resulting diff.

Check for:

* accidental file changes;
* debug code;
* dead code;
* exposed secrets;
* unnecessary dependencies;
* broken imports;
* inconsistent formatting.

---

# Validation

Never treat implementation as complete simply because code was written.

Use the strongest validation available in the project.

Possible checks:

```text
unit tests
integration tests
type checking
linting
build
database migration validation
API tests
frontend build
```

Example workflow:

```text
1. Implement.
2. Run targeted tests.
3. Fix failures caused by the change.
4. Run broader validation when justified.
5. Inspect the final diff.
6. Report remaining limitations.
```

Never fabricate validation.

If a test could not be executed, say so.

---

# Error Handling

If a command fails:

1. Read the error.
2. Identify the likely cause.
3. Inspect relevant code/configuration.
4. Make a targeted correction.
5. Run the command again.

Do not randomly modify multiple files hoping the problem disappears.

After repeated failures, stop and explain:

* what failed;
* what was attempted;
* what evidence was found;
* what information is still missing.

---

# User Confirmation

Request explicit confirmation before destructive or high-impact operations when appropriate.

Examples:

```text
Deleting significant data
Dropping database tables
Resetting migrations
Replacing major architecture
Overwriting important configuration
Removing large amounts of code
```

Normal reversible coding edits generally do not require confirmation when they are directly requested.

---

# Output Format

After implementation, give the user a concise report.

```markdown
## Completed

[Short description]

### Changed

- `path/file.py` — [change]
- `path/file.tsx` — [change]

### Validation

- [command] — PASS
- [command] — PASS

### Remaining

- [anything still requiring attention]
```

Do not claim something is production-ready merely because it runs locally.

---

# Mode 2 — Audit an Existing Skill

When asked to audit a skill, read the complete relevant skill/instruction file first.

Never audit a file you have not inspected.

## Scope Audit

Check:

* Is the goal clear?
* Is the trigger clear?
* Is the scope narrow enough?
* Are exclusions documented?
* Does another existing skill already cover this responsibility?

## Workflow Audit

Check:

* Are steps numbered?
* Are actions explicit?
* Does the agent know which files to inspect?
* Are validation steps present?
* Are failure paths defined?
* Are confirmation points defined?

## Repository Audit

Check:

* Are paths accurate?
* Does the workflow match the actual repository?
* Does it reuse existing architecture?
* Does it reference existing tests and scripts?
* Does it avoid unnecessary duplication?

## Safety Audit

Check:

* Are secrets protected?
* Are destructive operations guarded?
* Are database changes handled carefully?
* Are external side effects controlled?
* Does the agent avoid claiming success without verification?

## Quality Audit

Check:

* Could another agent follow the instructions without hidden context?
* Are instructions actionable?
* Are vague phrases removed?
* Is unnecessary explanation removed?
* Are outputs predictable?
* Are errors handled explicitly?

---

# Audit Output

Use:

```markdown
# Skill Audit: [name]

## Score
[X/10]

## Critical Issues

1. ...
2. ...

## Improvements

1. ...
2. ...

## Good Practices Already Present

- ...
- ...

## Recommended Changes

[Concrete modifications]

## Verdict

READY
```

Possible verdicts:

```text
READY
NEEDS IMPROVEMENT
NOT READY
```

---

# Core Principles

## Inspect before editing

Never assume repository structure when Codex can inspect it.

## Evidence before conclusions

Do not report a bug as fixed until there is evidence.

## Small changes over rewrites

Prefer targeted modifications unless redesign is explicitly required.

## Code handles deterministic work

Use code, tests, scripts, and tooling for deterministic operations.

Use the model primarily for:

* reasoning;
* planning;
* interpretation;
* debugging;
* architecture decisions.

## Never hide uncertainty

If information is missing, say what is unknown.

## Never invent success

Never claim:

```text
Tests passed.
Migration works.
API works.
Build succeeded.
```

unless the corresponding validation was actually executed successfully.

---

# Recommended Project Integration

For a repository using Codex extensively, maintain project-level agent instructions describing:

```text
Architecture
Directory structure
Coding conventions
Testing commands
Database rules
Security rules
Available skills/workflows
Definition of done
```

Individual skills should contain specialized workflows rather than repeating all global project rules.

The result should follow this hierarchy:

```text
Project instructions
        ↓
Specialized skills/workflows
        ↓
Repository inspection
        ↓
Implementation
        ↓
Tests / validation
        ↓
Final report
```

This keeps Codex predictable while avoiding duplicated instructions.
