# Amadeus Persona v0.1

A standalone DeepSeek Harness (DSH) Host plugin for one trusted Workspace's core persona and reusable scene-style personas. It adds exactly two independent System Prompt sections, an owner-only JSON API, and an owner-authenticated five-page Web Console. It does not register tools, choose or recompose a preset, change runtime context, grant permissions, or replace the existing Amadeus plugins.

## Requirements

- DSH Desktop `0.2.1-rc.3` through the `0.2.x` line (`>=0.2.1-rc.3 <0.3.0`).
- Node.js `>=22.13.0` for development and tests.
- Optional: an installed QQ Host plugin exposing `qq.resolveTrustedSessionScene(sessionId)`. Ordinary DSH Session bindings work without QQ.

No QQ, Memory, Life, or State plugin is required.

## Install

1. Build the package tarball from this repository:

   ```powershell
   npm pack
   ```

2. In DSH Desktop, install the generated `amadeus-persona-0.1.0.tgz` through the official Plugin Manager into the intended isolated profile. Do not hand-merge the bundle patch into a live profile.
3. Restart or reload DSH if the Plugin Manager asks you to.
4. Open **Settings → Amadeus Persona**. The native DSH section only shows Host storage health, the bound Workspace, and an **Open Persona console** button. It does not contain editing controls.
5. The button opens `/api/amadeus-persona/console` in a new tab. That page and every asset and JSON request require the same DSH Owner admission as the settings page.

An empty install writes no Persona file and injects no demo text. Injection stays inactive until a Workspace is bound and a core card is saved.

## First setup

1. **Settings → Bound Workspace**: select one real DSH Workspace by stable id. The old Workspace stops receiving Persona; the new Workspace begins at the next model assembly. No Sessions are deleted or recreated.
2. **Library**: write and save the core persona. Then create style cards. A new style is written only when you save; the console does not prefill sample content.
3. **Settings**: choose the Workspace default style (or core-only) and confirm that Persona injection is enabled.
4. **Bindings**: choose a target from the trusted list (current Workspace Sessions and verified QQ Scenes) and save one explicit mode: inherit, core-only, style, or disabled. The console has no free-form QQ id field.
5. **Diagnostics**: review configured sections and observed callbacks. For an observed live Session, run the explicit final Host assembly check. It reports visible, overridden, or unavailable without returning prompt text. A callback invocation alone is not proof that the text survived the final assembly.
6. **Settings → Backups**: create a backup before a large edit or upgrade.

Persona changes take effect at the next model assembly. Existing Sessions keep their Agent preset, tools, permissions, and history. Do not promise zero token cost: a changed System Prompt can invalidate a cached prefix.

## Data, security and isolation

- Configuration lives in the plugin's own directory, by default `DSH_HOME/amadeus-persona` (fallback `~/.dsh/amadeus-persona`). `persona.json` is the validated transaction source; `SOUL.md` and `styles/{styleId}.md` are atomic Markdown projections for inspection and export. Edit cards through the console so versions, bindings, and backups stay consistent. The owner API never exposes filesystem paths.
- `persona.json` and backups are written atomically with owner-only file modes. Mutations use a global revision and return `409` on a stale writer. The browser retains the draft and offers an explicit reload.
- The console and API are same-origin and require `connection.admit(req)` to resolve the authenticated DSH Owner principal. Loopback alone is not authorization.
- JSON writes require a fixed `x-amadeus-persona: 1` marker as an additional CSRF defense.
- Console assets are served with a strict CSP: no inline script/style, no external origins, same-origin API connections only.
- The browser stores only the light/dark theme preference in LocalStorage. Persona cards, bindings, backups, and status are never browser-authoritative.
- QQ Scene identity is accepted only from the optional QQ Host mapping. Existing group permissions and QQ send behavior stay with QQ.
- Persona never modifies Memory, Life, State, tools, presets, or permissions. Memory's optional persona card is not changed; if conflict status cannot be read through a public Host contract, it remains unverified.
- Only one Workspace is trusted. Other Workspaces receive empty Persona sections.

## Upgrade

1. Create a backup in **Settings → Backups**.
2. Install the newer tarball through the Plugin Manager.
3. Reopen the console and check storage health, the bound Workspace, cards, bindings, and diagnostics.
4. If storage is invalid, injection fails closed; the plugin does not overwrite the corrupt document.

## Rollback

- **Configuration rollback**: use **Settings → Backups → Restore**, type `RESTORE`, and confirm. A pre-restore safety backup is written first and prior history is retained.
- **Plugin rollback**: reinstall the previous tarball through the Plugin Manager, then restore the matching backup if the configuration changed. Do not edit `persona.json` by hand.

## Development and validation

```powershell
node test/run.js          # focused single-process test suite
npm run build:client      # regenerate src/client.js from src/client-panel.js
npm pack --dry-run        # inspect package contents
```

The DSH sandbox may block the piped child-process spawn used by `node --test`; `node test/run.js` imports the same suites in one process.

## Known limitations

- Final System Prompt visibility remains unverified until the Owner runs a final Host assembly check on a live Session. A check can be unavailable when the Agent is not live or another provider fails assembly.
- Token counts are conservative heuristic estimates, not tokenizer-exact.
- QQ Scene editing requires a live trusted QQ Host mapping and current Workspace membership; a stale mapping fails closed.
- The native settings section and five-page Web Console were visually exercised in an isolated DSH Desktop `0.2.1-rc.3` profile with Edge Chromium. Screenshots and the test boundary are in [`docs/VERIFICATION_2026-10-29.md`](docs/VERIFICATION_2026-10-29.md).
- Model behavior, tool-call capability, task quality, and cache cost are not proven by these tests.
- The package is private and unreleased. This repository does not publish, create a Release, or commit changes.

See `docs/UI_REPORT.md` for the UI slice report and explicit verification boundaries.
