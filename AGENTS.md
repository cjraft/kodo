# Kodo Engineering Guardrails

## Project Positioning

`kodo` is a serious coding agent project, not a demo CLI.
All implementation decisions must optimize for:

1. Clear architectural boundaries
2. Low coupling and high cohesion
3. Stable extension points
4. Maintainability under long-term iteration
5. Testability and replaceability

Temporary convenience is not a valid reason to weaken structure.

## Core Principles

1. Every module must have a single primary responsibility.
2. Cross-layer access must happen through explicit interfaces.
3. DRY applies to behavior and architecture, not only duplicated lines.
4. No hidden globals for runtime behavior, configuration, or state.
5. New code must fit an existing boundary or introduce a new explicit one.
6. Readability is a design constraint, not a polish pass.

## Architecture Practice

When responsibilities begin to mix, fix the boundary instead of adding more conditionals,
fallback chains, or helper patches. File splits must serve architectural clarity; thin files
that do not create a meaningful boundary should be merged.

## Readability Rules

1. If a file requires readers to mentally simulate multiple branches, fallback chains, and value sources at once, it must be split.
2. Prefer one level of abstraction per function. Parsing, normalization, validation, and assembly should not be mixed in the same block.
3. If a module starts carrying multiple unrelated default values, fallback rules, or normalization branches, extract them into focused helpers or sibling files.
4. "Works" is not sufficient. A file that is correct but hard to read should still be refactored.
5. Configuration code must optimize for traceability: a reader should quickly answer where a value comes from, how it is normalized, and where it is consumed.
6. Public APIs of core modules and non-obvious methods must have comments. The comment must explain intent, contract, or key constraints — not restate the signature.
7. Comments explain why, not what. If a comment is needed to describe what the code does, the code itself should be made clearer instead.
8. TODOs must reference a concrete decision, constraint, or known tradeoff — not serve as vague reminders or deferred explanations.

## Layering Rules

Each layer owns its own rules, defaults, validation, and assembly logic.
Higher layers may orchestrate lower layers but must not silently take over lower-layer decisions.

### UI Layer

Responsibilities: Ink rendering, user interaction, view state projection, hook-based consumption of agent state.

Must not: construct agent dependencies, read environment variables, create providers or tool registries, assemble model input or prompt context, own run loop orchestration.

### Agent Layer

Responsibilities: session lifecycle, run lifecycle, event pipeline, orchestration of provider / tools / context / stores.

Must not: read config directly from env or argv, contain UI logic, contain provider-specific wire protocol details.

### LLM Layer

Responsibilities: model client abstraction, provider integration, provider/model normalization, provider-specific compatibility handling.

Must not: read `process.env`, own session state, perform runtime orchestration, depend on UI concerns.

### Context Layer

Responsibilities: `UserView` and `APIView`, context assembly, context budgeting and compaction, summary and evidence selection.

Must not: render UI, perform store persistence directly unless through a dedicated store interface, embed provider transport details.

### Store Layer

Responsibilities: session persistence, artifact persistence, context persistence, serialization and recovery.

Must not: contain business decisions, contain UI state transitions, read environment variables.

### Tool Layer

Responsibilities: one tool, one capability, input validation, execution, normalized output with a standard result/error contract.

Must not: orchestrate runs, call the provider directly, update UI state directly.

## Dependency Direction

Allowed:

```
UI -> Agent -> LLM / Context / Tool / Store
Agent -> Context
Agent -> Store
```

Forbidden: `LLM -> Agent`, `Store -> UI`, `Tool -> UI`, `Tool -> Agent`, `Context -> UI`.

Shared types must live in stable boundary modules.
Circular dependencies are architectural failures, not harmless warnings.

## Configuration

1. Bootstrap is the sole entry point for external inputs (env, CLI args, user directories). It produces typed config objects; business modules consume config, never raw sources.
2. Config has three distinct concerns — reading sources, normalizing values, and domain assembly — and these must not be collapsed into one place.
3. Each domain owns its own defaults, validation rules, and config shape. The bootstrap composition layer orchestrates; it does not own domain logic. _(e.g. LLM provider defaults belong in the LLM config module, not in a central bootstrap file.)_
4. Prefer mature libraries for commodity config concerns (CLI parsing, env validation, schema validation) over handwritten parsers.

## Build vs Buy

1. Do not handwrite infrastructure code that a stable, well-scoped library already solves well.
2. Introduce a library only when it clearly reduces bespoke code, improves correctness, or improves readability.
3. Do not keep custom implementations once a library replacement is adopted, unless the remaining wrapper provides clear project-specific value.
4. Wrappers around third-party libraries must stay thin and project-oriented.

## Agent API Rules

1. The agent's public API must reflect its own lifecycle semantics: session management, run control, and event subscription.
2. An API shaped around a UI interaction pattern — such as one that conflates receiving input with streaming output back — is a sign that UI concerns have leaked into the agent boundary.
3. Events must be session-scoped and run-scoped. The UI binds to agent state through stable hooks or controllers, not inline event handlers inside view components.

## State And Event Rules

1. Internal mutable state must not be exposed by reference.
2. Public state must be returned as read models, immutable snapshots, or derived view models.
3. Runtime events and persisted records must be distinct concepts.
4. Domain types, persistence types, provider IO types, and UI view models must not collapse into one shared catch-all type layer.

## Token Budget Rules

1. Token budget is a first-class architectural concern, not an afterthought.
2. The Context layer owns budget calculation and enforcement. Assembly must be rejected or compacted before it exceeds the configured limit, not after.
3. Budget limits come from typed config, never hardcoded inside context or LLM modules.
4. The Agent layer owns the compaction decision: whether to summarize, truncate, or surface an error. Context layer only enforces the contract.
5. Every context assembly must be observable: emitted token counts must be traceable per run.

## LLM Failure And Retry Rules

1. Transport-level failures (retriable: network timeouts, rate limits, transient server errors) are handled by the LLM layer. Retry policy comes from config.
2. Semantic failures (non-retriable: context too long, malformed response, unexpected stop reason) are handled by the Agent layer.
3. All LLM errors must propagate as typed failures. Raw provider exceptions must not leak across layer boundaries.
4. Retry state must not be held in global or module-level variables. Each run gets its own retry context.
5. Failures that exhaust retry budget must emit a structured run-scoped error event, not silently terminate.

## Observability Rules

1. Key operations (LLM calls, tool calls) must produce structured, observable records. A reader must be able to reconstruct what happened, with what inputs, and with what outcome — including the run it belongs to, latency, and result status.
2. `console.log` is not acceptable for production observability. Use a structured logger with level control.
3. A trace identifier must propagate from bootstrap through the full run lifecycle and appear in all structured log entries.
4. Sensitive values (API keys, user secrets) must never appear in logs or emitted events.

## Security Constraints

1. Tool results re-entering the context pipeline must be treated as untrusted input. Prompt injection via tool output is a real attack surface.
2. Tools with side effects (file writes, shell execution) must have their permission scope declared in config and enforced at registration time, not at call time.
3. Credentials and secrets must never enter the context pipeline, be stored in artifacts, or appear in log entries. The context assembly layer is responsible for this boundary.

## Naming Rules

1. Directory names describe bounded contexts, not implementation details.
2. File names describe responsibility, not vague role labels.
3. Avoid redundant qualification in names — a file's location already provides context. _(e.g. `llm/client.ts` is clearer than `llm/llm-client.ts`.)_
4. Avoid generic files such as `utils.ts`, `helpers.ts`, or `manager.ts` unless their scope is truly bounded and explicit.

## File And Directory Rules

1. Product code belongs in `src/`.
2. Tests belong in `tests/`, mirroring the product structure.
3. `index.ts` files may aggregate exports but must not contain business logic.
4. Files should generally stay under 300 lines; when they exceed that, responsibilities must be reviewed.
5. New directories must have a clear architectural purpose.

## Testing Rules

1. Each boundary module must have focused tests.
2. Tests must validate behavior and contracts, not implementation trivia.
3. Provider, store, tool, and agent orchestration behavior must all be independently testable.
4. Unit tests mock the LLM layer at the boundary interface. Real provider calls must not appear in unit tests.
5. Integration tests that require LLM responses must use fixture/replay mode (recorded responses). Live LLM calls in CI must be explicitly opted in and isolated.
6. Smoke tests are useful, but they do not replace unit and boundary tests.

## Anti-Patterns

The following are not allowed:

1. UI constructing runtime dependencies
2. Modules reading env ad hoc outside bootstrap
3. Broad god classes that hold orchestration, state, and IO together
4. Mutable state objects leaking across boundaries
5. Fallback logic hidden deep inside infrastructure modules
6. Copy-paste branching instead of introducing the right abstraction
7. Comments used to excuse weak layering instead of fixing it
8. Token budget enforced only at the LLM call site rather than during context assembly
9. LLM provider exceptions propagating as untyped errors across layer boundaries
10. Tool results trusted as safe input without sanitization before context re-entry

## Review Steps

After completing any meaningful change, work through the following steps in order.

**Step 1 — Architecture**

- Does the change fit within an existing layer boundary, or does it introduce a justified new one?
- Is the dependency direction preserved? No forbidden cross-layer calls introduced?
- Did coupling increase? If so, is there a cleaner boundary to restore?
- Is runtime behavior driven by typed config rather than scattered constants or env reads?

**Step 2 — Code Quality**

- Does the change introduce duplication — in logic, defaults, or structure — that should be unified?
- Is there code added that is not required by the current requirement? Remove it.
- Does each function operate at one level of abstraction? No mixed parsing, validation, and assembly in the same block?
- Is the result easy to trace for a new maintainer, or does it require mentally simulating multiple branches to follow?

**Step 3 — Agent-Specific Concerns**

- Are token budget, retry policy, and observability handled at the correct layer?
- Do any new tool results re-enter the context pipeline without sanitization?
- Are credentials or secrets kept out of context, logs, and artifacts?

**Step 4 — Lint**

Run the linter and resolve all errors before proceeding.

**Step 5 — Tests**

- Are new behaviors covered by tests under `tests/`, aligned to the changed module?
- Do tests validate contracts and behavior, not implementation details?
- If LLM responses are involved, are they mocked at the layer boundary or using fixture replay?
- Run the Unit Test and resolve all errors before proceeding.
