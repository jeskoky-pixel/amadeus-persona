# Amadeus Persona v0.1 minimal implementation plan

## Verified host baseline

- Installed DSH CLI is `0.2.1-rc.3`; use the `dsh-v0.2.1-rc.3` source contract, not upstream main.
- `systemPrompt.section()` supports a per-assembly callback, `interpolate: false`, and host-global registration. The actual assembly context is `{ agent, scope: agent, signal? }`; the handoff's `context.agent` example is therefore valid in the Agent path but must be guarded for diagnostics or other callers.
- `workspaceRegistry.get(id).sessionIds` is the authoritative membership list. Session `header.origin === 'subagent'` is the exclusion signal; `parentSession` alone is not.
- QQ's existing optional Host service `qq.resolveTrustedSessionScene(sessionId)` returns a verified Scene for authorized bound QQ Sessions. It throws on unauthorized/stale QQ Sessions. No QQ code change is planned.
- DSH presets lock after the first turn. Persona never selects or recomposes a preset.

## Implementation slices

1. **Backend and storage.** Independent `@amadeus/persona` package; host-level Cordis plugin; one workspace binding; one core card and unlimited style cards; stable IDs, revisions, optimistic concurrency, atomic persistence, history and backup/restore. Empty install has no demo persona and injects nothing until configured.
2. **Resolver and injection.** Verify live Agent Session ID against bound Workspace on every assembly. Reject subagents by trusted origin. Map QQ Sessions through the optional QQ Host service; use stable Scene key including bot identity. A known QQ preset without a verified QQ mapping fails closed. Resolve explicit QQ Scene, explicit ordinary DSH Session, workspace default, core-only or disabled. Register exactly two independent System Prompt sections at host level. Never change tools, presets, runtime context, or permissions.
3. **Owner console.** Serve static assets and JSON API behind DSH `connection.admit(req)` owner admission plus same-origin checks. GUI has overview, card library, scene binding, diagnostics and settings; all writes use revisions. DSH native settings only shows status and console entry. Use the supplied prototype's navigation and visual design, with real Host data and no browser-local authoritative state.
4. **Validation.** Unit tests for resolver, storage, authorization and API; integration with DSH 0.2.1-rc.3 System Prompt; browser tests for editing, binding, conflicts, theme and responsive layout; isolated Desktop Profile tests for main/fork/subagent/QQ scenes/workspace isolation, hot update, restart and disabling. Report any real NapCat or model behavior not actually exercised.

## Safety decisions

- QQ Scene identity is accepted only from `qq.resolveTrustedSessionScene`; preset names can be used only to recognize a QQ Session whose mapping must fail closed, never to grant Scene identity.
- Persona text is administrator configuration, not a model tool or user message. The plugin does not read Memory, State or Life data to construct cards.
- The diagnostic distinguishes configured, assembled and overridden sections. A preset `complete` section may remove ours after assembly, so a callback invocation alone does not prove injection.
- Memory's optional persona card is not modified. If its effective setting cannot be read through a public trusted Host contract, the UI must state that conflict status is unverified and tell the owner what to check rather than claim it is off.
