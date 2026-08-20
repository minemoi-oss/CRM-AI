# Skill Builder Reference — OpenAI Codex

Technical reference for designing reusable instructions, skills, workflows, and agent behavior for OpenAI Codex.

This document complements `SKILL.md`.

Its purpose is to provide detailed patterns while keeping the main skill concise.

---

# 1. Core Concept

Codex works best when instructions are separated by responsibility.

Use three conceptual layers:

```text
Project Instructions
        ↓
Specialized Skills / Workflows
        ↓
Task-specific User Request
```

## Project Instructions

Project instructions contain rules Codex should understand throughout the repository.

Examples:

* architecture;
* coding conventions;
* testing commands;
* database conventions;
* security requirements;
* directory structure;
* definition of done.

A common project-level instruction file is:

```text
AGENTS.md
```

Depending on the environment and repository, additional documentation may also exist:

```text
README.md
CONTRIBUTING.md
docs/
```

Codex should inspect the repository instead of assuming which instruction files exist.

---

# 2. Project Instructions vs Skills

Use project instructions for rules that apply broadly.

Use specialized skills/workflows for procedures that only matter for a specific task.

Example:

## Project rule

```text
All backend endpoints use the service → repository architecture.
```

This belongs in project-level instructions.

## Specialized workflow

```text
When creating a customer CRUD endpoint:

1. Inspect the model.
2. Inspect the schema.
3. Inspect the repository.
4. Inspect the service.
5. Implement the endpoint.
6. Add tests.
```

This belongs in a specialized skill.

Rule of thumb:

```text
Always relevant → project instructions

Task-specific → skill/workflow
```

Avoid duplicating the same rules in both places.

---

# 3. Recommended Skill Structure

A specialized skill should normally contain:

```markdown
# Skill Name

## Purpose

## When to Use

## Context to Inspect

## Workflow

## Validation

## Output Format

## Guardrails
```

Not every skill needs every section.

Use only what improves reliability.

---

# 4. Purpose

The purpose should answer:

```text
What does this workflow accomplish?
```

Bad:

```text
Helps with backend development.
```

Better:

```text
Audits FastAPI backend modules for architecture,
validation, database access, authentication,
error handling, and test coverage.
```

Keep scope specific.

---

# 5. Trigger Design

Describe when the workflow should be used.

Use natural phrases users might actually write.

Example:

```text
Use when the user asks to:

- audit the backend;
- review FastAPI architecture;
- find architectural problems;
- inspect repository/service separation;
- review backend code quality.
```

Avoid extremely broad triggers.

Bad:

```text
Use when coding.
```

Bad:

```text
Use for Python.
```

Better:

```text
Use when implementing or auditing FastAPI endpoints,
services, repositories, schemas, or SQLAlchemy models.
```

---

# 6. Repository Discovery

Never assume the project structure.

Before making significant changes, inspect the repository.

Recommended sequence:

```text
1. Inspect repository root.
2. Locate project instructions.
3. Locate relevant source files.
4. Locate configuration.
5. Locate tests.
6. Inspect related implementation.
7. Understand conventions.
8. Modify code.
```

Possible files to inspect:

```text
AGENTS.md
README.md
CONTRIBUTING.md
pyproject.toml
requirements.txt
package.json
tsconfig.json
alembic.ini
.env.example
docker-compose.yml
```

Do not read every file automatically.

Read files relevant to the task.

---

# 7. Context Gathering

Before editing a module, gather enough context to understand its relationships.

For example, when modifying a FastAPI endpoint:

```text
route
  ↓
service
  ↓
repository
  ↓
SQLAlchemy model
  ↓
database
```

Also inspect:

```text
Pydantic schemas
dependencies
authentication
tests
migrations
```

when relevant.

Do not modify one layer without checking dependent layers if the change affects their contract.

---

# 8. Search Before Creation

Before creating:

```text
service
repository
component
utility
hook
schema
model
endpoint
script
```

search the repository for an existing equivalent.

Prefer:

```text
reuse
extend
modify
```

before:

```text
duplicate
rebuild
replace
```

unless the existing implementation is unsuitable.

---

# 9. Planning

Planning is useful when:

* several modules will change;
* architecture is affected;
* database migrations are required;
* requirements are ambiguous;
* multiple implementation strategies exist;
* changes have significant risk.

A plan should be actionable.

Example:

```text
1. Inspect Customer model and schemas.
2. Add status field to model.
3. Create Alembic migration.
4. Update response/create schemas.
5. Update repository filtering.
6. Add API filter parameter.
7. Add tests.
8. Run migration validation.
9. Run backend tests.
```

Avoid plans like:

```text
1. Analyze project.
2. Improve code.
3. Test everything.
```

---

# 10. Small Change Principle

Prefer the smallest coherent modification.

Do not refactor unrelated code while solving a specific issue.

Example:

User asks:

```text
Add filtering by invoice status.
```

Do not simultaneously:

```text
rename every repository
replace SQLAlchemy architecture
rewrite authentication
change formatting everywhere
```

unless those changes are necessary.

---

# 11. Deterministic vs Probabilistic Work

Separate reasoning from execution.

Use the model for:

```text
understanding intent
architecture decisions
debugging
reasoning
planning
interpreting errors
```

Use deterministic tools for:

```text
running tests
formatting
linting
database migrations
building
type checking
searching files
executing scripts
```

Conceptually:

```text
AI
↓
decides what should happen

Code / Tools
↓
prove whether it actually works
```

This principle is especially important for reliable agent systems.

---

# 12. Commands

Do not invent project commands without checking configuration when uncertainty exists.

Look for:

```text
package.json
Makefile
pyproject.toml
README.md
scripts/
```

Example Python commands might include:

```bash
pytest
```

or:

```bash
python -m pytest
```

Frontend projects might use:

```bash
npm test
npm run lint
npm run build
```

But inspect `package.json` before assuming those scripts exist.

---

# 13. Validation Hierarchy

Use the strongest practical validation.

Possible validation levels:

```text
Static inspection
        ↓
Syntax / type checking
        ↓
Unit tests
        ↓
Integration tests
        ↓
Build
        ↓
Runtime verification
```

Not every change requires every level.

Choose validation proportional to the change.

---

# 14. Python Validation

Depending on the project, relevant validation may include:

```bash
python -m pytest
```

Possible additional tools:

```text
ruff
mypy
black
pyright
```

Only use tools actually available or intentionally being introduced.

Do not install dependencies simply to validate something unless justified.

---

# 15. React / TypeScript Validation

Possible validation:

```bash
npm run lint
npm run build
```

Potential checks:

```text
TypeScript compilation
ESLint
unit tests
component tests
production build
```

Inspect `package.json` first.

---

# 16. FastAPI Validation

For FastAPI changes, consider:

```text
route registration
request validation
response schema
HTTP status codes
authentication dependencies
service behavior
repository behavior
database interaction
```

For endpoint tests, verify:

```text
success case
invalid input
not found
unauthorized
forbidden
database conflict
```

when relevant.

---

# 17. Database Changes

Database changes require additional caution.

Before modifying schema:

1. Inspect the SQLAlchemy model.
2. Inspect existing migrations.
3. Inspect relationships.
4. Inspect schemas using the field.
5. Inspect repositories/services.
6. Determine migration impact.

Never assume changing a SQLAlchemy model automatically changes PostgreSQL.

Conceptually:

```text
SQLAlchemy Model
       ↓
Alembic Migration
       ↓
PostgreSQL Schema
```

---

# 18. Migration Safety

Before generating or applying a migration, determine whether it:

```text
adds columns
removes columns
changes types
adds constraints
changes foreign keys
modifies relationships
deletes data
```

Destructive migrations require additional caution.

Examples:

```text
DROP TABLE
DROP COLUMN
data reset
migration history reset
```

Do not perform destructive operations casually.

---

# 19. Environment Variables

Secrets must not be hardcoded.

Bad:

```python
SECRET_KEY = "super-secret-key"
```

Prefer environment configuration:

```python
SECRET_KEY = settings.SECRET_KEY
```

Common sensitive values:

```text
database passwords
API keys
JWT secrets
OAuth secrets
access tokens
private keys
```

Do not commit `.env` unless the repository explicitly uses a safe non-secret version.

Prefer:

```text
.env.example
```

for documenting expected variables.

---

# 20. Security Review

For security-sensitive code inspect:

```text
authentication
authorization
password hashing
token validation
input validation
database access
secret handling
CORS
file uploads
external requests
```

Do not weaken security merely to make functionality work.

Bad:

```text
Disable authentication because the endpoint returns 401.
```

Correct approach:

```text
Determine why authentication fails.
```

---

# 21. External APIs

When a workflow uses an external API:

1. Identify required credentials.
2. Identify endpoint.
3. Validate request format.
4. Handle errors.
5. Handle timeout.
6. Handle rate limits when relevant.
7. Avoid leaking credentials.
8. Validate returned data.

Do not assume external responses are trustworthy.

---

# 22. Side Effects

Some operations create side effects:

```text
sending emails
creating records
deleting records
charging payments
deploying
publishing
calling paid APIs
modifying production infrastructure
```

Skills performing these operations should clearly distinguish:

```text
analysis
```

from:

```text
execution
```

Require appropriate confirmation for destructive or financially significant actions.

---

# 23. Tool Usage

Use repository and execution tools deliberately.

Typical operations include:

```text
list files
search text
read files
edit files
run shell commands
inspect git diff
run tests
```

Avoid unnecessary tool calls.

Each call should answer a concrete question or perform a concrete step.

---

# 24. Search Patterns

Search before assuming.

Examples:

```text
Customer
CustomerRepository
create_customer
company_id
JWT
get_current_user
```

Search helps identify:

```text
definitions
usages
dependencies
tests
duplicate implementations
```

After changing a public symbol, search its usages again.

---

# 25. Git Awareness

Before large changes, inspect repository state when available.

Useful information:

```text
current branch
modified files
untracked files
diff
```

Do not overwrite unrelated user modifications.

After implementation inspect the final diff.

Check:

```text
Did I modify only intended files?

Did I accidentally remove code?

Did formatting alter unrelated sections?

Did I expose secrets?

Did I leave debugging statements?
```

---

# 26. User Changes

Treat existing user modifications carefully.

Do not assume every uncommitted change was produced by Codex.

If unrelated modified files exist:

```text
leave them alone
```

unless the requested task requires modifying them.

Do not reset or discard user work without explicit authorization.

---

# 27. Error Handling

When a command fails, use the failure as evidence.

Workflow:

```text
Command
   ↓
Failure
   ↓
Read error
   ↓
Locate responsible layer
   ↓
Inspect relevant files
   ↓
Form hypothesis
   ↓
Make targeted change
   ↓
Run validation again
```

Avoid random edits.

---

# 28. Debugging Pattern

Use:

```text
OBSERVE
↓
LOCALIZE
↓
HYPOTHESIZE
↓
TEST
↓
FIX
↓
VERIFY
```

## Observe

Read the complete relevant error.

## Localize

Determine where the failure occurs.

Example:

```text
frontend
API
service
repository
ORM
database
```

## Hypothesize

Form a concrete explanation.

## Test

Gather evidence.

## Fix

Make the smallest appropriate change.

## Verify

Re-run the failing operation.

---

# 29. Repeated Failures

If several fixes fail, stop making speculative modifications.

Summarize:

```text
What failed

What evidence exists

What was attempted

What changed

What remains unknown
```

Then determine whether additional user input is required.

---

# 30. Output Reporting

After implementation provide a concise report.

Recommended format:

```markdown
## Completed

Added customer status filtering.

### Changed

- `app/repositories/customer.py`
  Added status filtering.

- `app/routes/customers.py`
  Added `status` query parameter.

### Validation

- `python -m pytest tests/customers` — PASS

### Remaining

None.
```

Keep the report proportional to the task.

---

# 31. Never Fabricate Results

Never say:

```text
Tests pass.
```

unless tests actually ran successfully.

Never say:

```text
The endpoint works.
```

if only static code inspection was performed.

Instead say:

```text
Implementation is complete.

Runtime validation was not performed.
```

Precision is more important than sounding confident.

---

# 32. Supporting Files

Large skills can be divided into supporting files.

Example:

```text
skill-name/
│
├── SKILL.md
├── reference.md
├── examples.md
└── scripts/
    └── validate.py
```

Use `SKILL.md` for core execution instructions.

Use `reference.md` for detailed technical rules.

Use `examples.md` for examples.

Use `scripts/` for deterministic helper operations.

Do not duplicate the same information across every file.

---

# 33. Scripts

Use scripts when deterministic processing is preferable to model reasoning.

Examples:

```text
validation
file conversion
schema checks
dependency analysis
report generation
data transformation
```

The skill should explain:

```text
when to run the script
what arguments it receives
what it outputs
what failure means
```

---

# 34. WAT Architecture

For complex agent systems, use the WAT model:

```text
WORKFLOW
   ↓
AGENT
   ↓
TOOLS
```

## Workflow

Defines:

```text
goal
inputs
steps
outputs
edge cases
```

## Agent

Handles:

```text
reasoning
decision making
coordination
ambiguity
```

## Tools

Handle deterministic execution:

```text
database operations
API calls
scripts
file processing
tests
commands
```

The agent should not manually simulate deterministic operations that a tool can perform reliably.

---

# 35. Example WAT Workflow

```text
User:
"Create invoice for customer 42"

        ↓

Agent reads workflow

        ↓

Agent determines required information

        ↓

Tool fetches customer 42

        ↓

Agent validates business requirements

        ↓

Tool creates invoice

        ↓

Tool verifies database result

        ↓

Agent reports outcome
```

This separation improves reliability and debuggability.

---

# 36. Skill Composition

A complex system may use multiple specialized workflows.

Example:

```text
backend-builder
database-auditor
security-review
frontend-builder
test-runner
```

Avoid creating one enormous skill responsible for everything.

Prefer:

```text
small specialized workflows
+
shared project instructions
```

---

# 37. Avoid Instruction Duplication

If a rule already exists globally:

```text
Always use service → repository architecture.
```

do not copy the full explanation into every skill.

Instead say:

```text
Follow the project's backend architecture conventions.
```

Specialized skills should add only task-specific behavior.

---

# 38. Conflict Resolution

When instructions conflict, do not silently choose an arbitrary interpretation.

Consider:

```text
higher-level system constraints
explicit user request
repository instructions
specialized workflow
existing architecture
```

If the conflict materially affects the result and cannot safely be resolved, ask the user.

---

# 39. Context Management

Do not load unnecessary repository content.

Prefer:

```text
search
↓
identify relevant files
↓
read relevant sections
↓
expand only when necessary
```

Instead of:

```text
read entire repository
```

This reduces noise and improves reasoning quality.

---

# 40. Large Tasks

For large tasks:

```text
discover
↓
plan
↓
implement incrementally
↓
validate each meaningful stage
↓
run final validation
↓
inspect diff
```

Avoid generating dozens of files before performing the first validation.

---

# 41. Skill Audit Checklist

## Purpose

* [ ] Clear goal
* [ ] Clear scope
* [ ] Clear trigger
* [ ] Explicit exclusions when necessary

## Context

* [ ] Relevant files identified
* [ ] Repository inspection required
* [ ] Existing architecture considered
* [ ] Existing implementations searched

## Workflow

* [ ] Numbered actionable steps
* [ ] No vague instructions
* [ ] Dependencies identified
* [ ] Failure handling included

## Validation

* [ ] Tests specified
* [ ] Build/lint/type checks included when relevant
* [ ] Runtime validation included when necessary
* [ ] Success cannot be claimed without evidence

## Safety

* [ ] Secrets protected
* [ ] Destructive actions guarded
* [ ] User changes preserved
* [ ] External side effects controlled

## Output

* [ ] Expected result defined
* [ ] Changed files reported
* [ ] Validation reported
* [ ] Limitations reported

---

# 42. Skill Quality Levels

## Weak

```text
Analyze the backend and improve it.
```

Problems:

```text
unclear scope
no workflow
no validation
no output definition
```

## Good

```text
Inspect backend routes, services, repositories,
models, schemas, and tests.

Identify architecture violations.

Make targeted corrections.

Run relevant tests.

Report modified files and remaining issues.
```

## Excellent

Defines:

```text
trigger
scope
repository discovery
ordered workflow
validation commands
failure behavior
guardrails
output format
definition of done
```

---

# 43. Definition of Done

A coding skill should define completion explicitly.

Example:

```text
The task is complete when:

1. Requested behavior is implemented.
2. Existing architecture is respected.
3. Relevant tests pass.
4. Build/type checks pass when applicable.
5. No unrelated files were modified.
6. Final diff was reviewed.
7. Remaining limitations are reported.
```

This prevents premature completion.

---

# 44. Troubleshooting

## Skill Produces Generic Results

Cause:

```text
instructions are too vague
```

Improve:

```text
repository files to inspect
ordered steps
validation
expected output
```

---

## Skill Modifies Too Much

Cause:

```text
scope is too broad
```

Add:

```text
Prefer the smallest coherent change.
Do not refactor unrelated code.
```

---

## Skill Duplicates Existing Code

Cause:

```text
repository search happens too late
```

Add:

```text
Search for an existing implementation before creating a new one.
```

---

## Skill Claims Success Too Early

Add:

```text
Never report success until relevant validation has completed.
```

---

## Skill Gets Lost in Large Repository

Add a discovery phase:

```text
1. Inspect root.
2. Search relevant symbol.
3. Identify owning module.
4. Read related files.
5. Continue from evidence.
```

---

## Skill Breaks Existing Architecture

Require architecture inspection before implementation.

Example:

```text
Before adding a new layer, determine how equivalent
features are implemented elsewhere in the repository.
```

---

# 45. Recommended Codex Project Structure

A mature AI-assisted repository can use:

```text
project/
│
├── AGENTS.md
│
├── README.md
│
├── docs/
│   ├── architecture.md
│   └── security.md
│
├── skills/
│   ├── backend-builder/
│   │   ├── SKILL.md
│   │   └── reference.md
│   │
│   ├── security-review/
│   │   └── SKILL.md
│   │
│   └── database-auditor/
│       └── SKILL.md
│
├── scripts/
├── tests/
└── src/
```

The exact directory structure should follow the project's actual Codex environment and repository conventions rather than being assumed blindly.

---

# 46. Recommended Agent Hierarchy

```text
USER INTENT
     ↓
PROJECT INSTRUCTIONS
     ↓
SPECIALIZED WORKFLOW
     ↓
REPOSITORY INSPECTION
     ↓
AGENT REASONING
     ↓
TOOLS / CODE
     ↓
VALIDATION
     ↓
DIFF REVIEW
     ↓
FINAL REPORT
```

Each layer has a distinct responsibility.

---

# 47. Core Rules

Always follow these principles:

```text
Inspect before editing.

Search before creating.

Understand before refactoring.

Plan before large changes.

Prefer small coherent changes.

Use deterministic tools for deterministic work.

Treat errors as evidence.

Protect secrets.

Preserve unrelated user changes.

Test before claiming success.

Review the diff before completion.

Never fabricate validation.

Report uncertainty explicitly.
```

---

# 48. Relationship With SKILL.md

`SKILL.md` contains the operational workflow.

`reference.md` contains detailed explanations and advanced rules.

The main skill should reference this document when deeper guidance is necessary.

Conceptually:

```text
SKILL.md
│
├── Core instructions
├── Workflow
├── Guardrails
└── Validation
       │
       └── reference.md
            ├── Detailed patterns
            ├── Database safety
            ├── Debugging
            ├── Security
            ├── WAT architecture
            └── Troubleshooting
```

Do not force Codex to consume the entire reference for simple tasks.

Use the reference when the task requires deeper guidance.

---

# 49. Final Principle

A good Codex skill should not attempt to make the AI omniscient.

It should make the AI **predictable**.

The goal is not:

```text
Give Codex more instructions.
```

The goal is:

```text
Give Codex the minimum instructions necessary
to make the correct decisions,
use the correct tools,
validate the result,
and know when it does not have enough information.
```
