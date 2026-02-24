This is the start of my life with a coding agent Harness.

### Purpose

Pi-vs-cc is a showcase playground demonstrating how to customize and extend Pi Coding Agent — an open-source alternative to Claude Code. The project progressively demonstrates TUI customization, event hooks, widgets, subagent orchestration, and multi-agent team coordination.

---

### Stack & Tooling

- Runtime: Bun ≥ 1.3.2 (package manager)
- Task runner: just (Justfile-based automation)
- CLI: Pi Coding Agent (open-source alternative to Claude Code)
- Language: TypeScript (extensions via jiti runtime)
- Key library: @mariozechner/pi-coding-agent, @mariozechner/pi-tui, @sinclair/typebox
- Config format: YAML (agents, teams, pipelines), JSON (themes, settings), Markdown (agent personas)

---

### Project Structure

```
pi-vs-cc/
├── extensions/ # 16+ TypeScript extensions (one file = one feature)
├── specs/ # Feature specifications
├── .pi/
│ ├── agents/ # Agent definitions + pi-pi/ subdirectory (meta-experts)
│ ├── agent-sessions/ # Ephemeral session files (gitignored)
│ ├── skills/ # Custom skills (e.g., bowser for browser automation)
│ ├── themes/ # 12 custom color themes (.json)
│ ├── damage-control-rules.yaml # Safety auditing rules
│ └── settings.json # Default workspace settings (theme, prompts)
├── .claude/commands/ # Cross-tool command definitions
├── justfile # 16 tasks for launching extensions
├── THEME.md # Color token conventions (success, accent, warning, dim, muted)
├── TOOLS.md # Built-in tool function signatures
├── COMPARISON.md # Feature-by-feature Claude Code vs Pi comparison
└── RESERVED_KEYS.md # Pi keybinding conventions
```

---

### Key Files & Entry Points

| File | Purpose |
|------------------------------|------------------------------------------------------------------------------------------|
| justfile | Main entry point — 16 recipes launching different extension combos (just pi, just ext-minimal, etc.) |
| .pi/settings.json | Default config: theme (synthwave), prompt dirs |
| .pi/agents/teams.yaml | Multi-agent team definitions (7 teams: full, plan-build, info, frontend, pi-pi, etc.) |
| .pi/agents/agent-chain.yaml | Sequential pipeline workflows (6 pipelines: plan-build-review, scout-flow, etc.) |
| extensions/themeMap.ts | Utility — Auto-applies theme + title based on extension filename |
| THEME.md | Style guide — Defines color roles across all extensions (green for values, cyan for names, yellow for frames) |

---

### Extension Ecosystem (16 extensions organized in 3 tiers)

#### G1 — TUI & UX Customization

1. pure-focus — Removes footer/status line entirely
2. minimal — Compact footer: model name + 10-block context meter 30%
3. cross-agent — Load commands from .claude/, .gemini/, .codex/ dirs
4. purpose-gate — Declare session intent on startup; blocks prompts until answered
5. tool-counter — Rich two-line footer: model/context/tokens/cost + cwd/branch/tool tally
6. tool-counter-widget — Per-tool call counts in live-updating above-editor widget
7. subagent-widget — /sub <task> command spawns background Pi subagents with live progress


#### G2 — Multi-Agent Orchestration & Safety

8. tilldone — Task discipline: define tasks before work, track completion, persistent footer widget
9. agent-team — Dispatcher orchestrator: primary agent delegates to specialists via dispatch_agent tool
10. system-select — /system command to switch agent personas/system prompts
11. damage-control — Real-time safety auditing: blocks dangerous bash patterns + enforces path-based access controls
12. agent-chain — Sequential pipeline: each agent's output feeds to next; /chain command to run

#### G3 — Meta-Agent & Extra

13. pi-pi — Meta-agent: builds Pi extensions using 8 parallel experts (ext-expert, theme-expert, tui-expert, etc.)
14. session-replay — Scrollable timeline overlay of session history
15. theme-cycler — Keyboard shortcuts (Ctrl+X/Q) + /theme command to cycle/pick themes

---

### Agent Architecture

Three orchestration patterns:

1. Subagent Widget — Parallel background agents spawned on-demand (/sub <task>)
2. Agent Teams — Dispatcher primary agent + roster of specialists from .pi/agents/teams.yaml (7 predefined teams)
3. Agent Chains — Sequential pipelines from .pi/agents/agent-chain.yaml (6 workflows: plan-build-review, scout-flow, etc.)

Agent anatomy — Each agent lives in .pi/agents/*.md:

```yaml
---
name: <agent-name>
description: <short role>
tools: read,write,edit,bash,grep,find,ls
---

<system prompt>
```

Special: pi-pi meta-team — 8 expert agents in .pi/agents/pi-pi/ (ext-expert, theme-expert, tui-expert, config-expert, cli-expert, prompt-expert, agent-expert, skill-expert) that build Pi extensions using parallel research with Firecrawl + curl fallback.

---

### Safety & Auditing

damage-control extension intercepts tool calls and enforces:

- Dangerous bash patterns — Regex rules block rm -rf, git reset --hard, aws s3 rm, DROP DATABASE (some with ask: true for confirmation)
- Zero-access paths — .env, ~/.ssh/, *.pem (read/write blocked)
- Read-only paths — System files, lockfiles (write blocked)
- No-delete paths — .git/, Dockerfile, README.md (delete blocked)

---

### Themes & Visual Language

12 custom themes (.pi/themes/) mapped to extensions via themeMap.ts:

- synthwave (minimal, tool-counter) — neon cyberpunk aesthetic
- dracula (agent-team) — rich orchestration
- rose-pine (pi-pi) — warm creative
- everforest (pure-focus, tilldone) — calm distraction-free
- Others: midnight-ocean, ocean-breeze, gruvbox, cyberpunk, catppuccin-mocha, tokyo-night, nord

Color conventions (THEME.md):

- success (green) — Live values (token counts, fills, branch)
- accent (cyan) — Identifiers & secondary metrics
- warning (yellow) — Frames & delimiters []() |
- dim (gray) — Filler & labels
- muted (dim) — Subdued text (CWD, fallbacks)

---

### Workflow: Running Extensions

```bash
# 1. Single extension
pi -e extensions/minimal.ts

# 2. Stacked extensions (compose)
pi -e extensions/minimal.ts -e extensions/theme-cycler.ts

# 3. Via just recipes (auto-loads .env)
just ext-minimal
just ext-agent-team
just open purpose-gate minimal tool-counter-widget

# 4. All in separate terminals
just all
```

---

### Key Comparison: Claude Code vs Pi Agent

| Dimension | Claude Code | Pi Agent |
|----------------|----------------------------------|----------------------------------------------|
| License | Proprietary | MIT (open source) |
| Cost | $20-200/mo or API keys | $0 (BYO API keys) |
| Models | ~6 (Claude family only) | 324+ across 20+ providers |
| System Prompt | ~10K tokens (batteries-included) | ~200 tokens (minimal trust) |
| Tools | 10+ built-in | 4 built-in + opt-in via extensions |
| Sub-agents | Native Task tool (7 parallel) | Via extensions (spawn separate pi processes) |
| Teams | Native lead + workers | Via extension + orchestration |
| Hooks | Shell commands (external) | TypeScript in-process (20+ events) |
| Extensibility | MCP servers, Skills (markdown) | TypeScript extensions w/ full session state |
| Safety | Deny-first permissions + sandbox | YOLO by default + opt-in damage-control |
| Observability | Sub-agents black boxes | Every token visible, session HTML export |

---

### Convention Highlights

- Extensions are independent — No shared state, each file is a complete feature
- Theme mapping is automatic — Extension filename maps to theme via themeMap.ts
- Events are first-class — 20+ Pi hooks (tool_call, input, session_start, agent_end, etc.) vs CC's 7-8
- Tools at the top level — Register custom tools in extension functions, not inside handlers
- Session export — Save branching, forking, history as JSONL + HTML timeline
- Multi-model by design — Switch models mid-session via Ctrl+P or /model command

---

This is a comprehensive experimental playground for building sophisticated multi-agent agentic coding workflows with extensible TUI, safety guardrails, and team orchestration — all without sacrificing transparency or control.
