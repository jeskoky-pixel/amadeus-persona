# Amadeus Persona v0.1 — UI/product report

This records the initial UI implementation slice. The later real Desktop and Edge verification, screenshots, final-assembly probe, and Markdown projections are documented in [VERIFICATION_2026-10-29.md](VERIFICATION_2026-10-29.md). The "unverified" items below describe the earlier slice, not the final candidate.

## Scope and result

This slice implements the owner-authenticated Web Console and the native DSH settings entry for `@amadeus/persona` 0.1.0 against the existing backend JSON API. The five console pages use only real Host JSON data. The supplied prototype's navigation, cards, scene list/detail layout, diagnostics, settings grouping, light/dark variables, and narrow-screen structure were carried forward. All prototype sample personas, fake QQ ids, demo status, and browser-local Persona state were removed.

The initial slice produced no screenshots; the subsequent verification did.

## Delivered surfaces

| Surface | Route | Data and behavior |
|---|---|---|
| Console HTML | `GET /api/amadeus-persona/console` (and `/console/`) | Owner-gated HTML shell; no inline script or style |
| Console CSS | `GET /api/amadeus-persona/console/console.css` | Self-contained responsive/light/dark theme |
| Console JS | `GET /api/amadeus-persona/console/console.js` | Five-page vanilla client using `fetch` and existing API |
| Overview | #overview | Real Workspace, storage health, counts, defaults, warnings, configured bindings |
| Library | #library | Core card, style create/edit/copy/delete, history and rollback, token metadata |
| Bindings | #bindings | Trusted Workspace Sessions and verified QQ Scenes; inherit/core-only/style/disabled, save, reset, remove |
| Diagnostics | #diagnostics | Configured sections, observed callbacks, explicit final-visibility "unverified", sanitized observation detail, capabilities, limitations |
| Settings | #settings | Workspace selection, default style, injection toggle, backup create/list/restore |
| Native DSH settings | `dsh.client` bundle | Health and Workspace summary plus **Open Persona console** only |

All Host data paths already existed in `src/service.js`: `/overview`, `/workspaces`, `/cards`, `/bindings`, `/history`, `/history/rollback`, `/diagnostics`, `/backups`, `/backup`, `/restore`, `/workspace`, `/settings`, `/default-style`, and the card/binding mutation routes. The only service change is an explicit `sections.finalVisibility: 'unverified'` diagnostic field and a clearer note; resolver behavior and storage are untouched.

## Security properties

- Every console asset and JSON request goes through the existing same-origin check and `connection.admit(req)` Owner-principal gate in `src/http.js`. Assets do not bypass authentication.
- POST requests retain the fixed `x-amadeus-persona: 1` marker.
- All console responses carry a strict CSP: `default-src 'none'`, `script-src 'self'`, `style-src 'self'`, `connect-src 'self'`, no inline or external allowances, `frame-ancestors 'none'`, `form-action 'none'`.
- The HTML has no inline script/style or event-handler attributes. The client escapes Host-supplied values before inserting them into markup.
- No external network asset, font, model, or tool is used. LocalStorage is limited to the `amadeus.persona.theme` light/dark preference.
- The binding UI lists only targets from the current bound Workspace's `sessionIds` and the optional verified QQ Host scenes. There is no free-form QQ id field.
- Deleting a style warns about affected bindings and default reset. Removing a binding explains the fallback to inherit without implying Session or QQ permission deletion.
- The native DSH panel reads only `/overview`; it does not edit cards, bindings, backups, or settings.

## UX behavior

- **Optimistic concurrency:** a 409 shows the current Host revision, keeps the unsaved editor/binding draft, and offers "Reload latest, keep draft" or "Reload latest and discard draft". A local DOM-stub smoke run exercised the editor 409 path and confirmed the draft remained after the reload-and-keep action.
- **States:** initial loading card, per-page error banners with retry, empty states for no Workspace, no styles, no bindings, no observations, and no backups.
- **Timing language:** all saves state that they apply at the next model assembly and do not recreate a Session. No zero-token-cost claim is made.
- **Token warnings:** card metadata shows character counts and heuristic token estimates with Host warning thresholds; the editor updates them live.
- **Final visibility:** the console distinguishes configured sections, callback invocation, and final prompt visibility. "Unverified" is the default and is not presented as success.
- **Theme and responsive layout:** light/dark CSS variables and the prototype's narrow-screen breakpoints are preserved without external dependencies.

## Automated validation

Commands run in this workspace:

- `npm test` (runs `node test/run.js`): **35 tests, 35 pass, 0 fail**.
- `npm run build:client`: generated `src/client.js` from `src/client-panel.js`.
- `npm pack --dry-run --cache .npm-cache`: **exit 0**; tarball summary is recorded below.

Coverage added or updated:

- Owner-only HTML/CSS/JS asset routes, same-origin rejection, strict CSP header, no inline script/style, no external URLs, and no fake prototype identities.
- LocalStorage usage restricted to the theme key.
- Exact generated DSH client bundle parity with `src/client-panel.js`; settings-section registration; only `/overview` fetch; no editing endpoints.
- Package manifest fields (`main`, `./client` export, `dsh.client`, files, build script, DSH engine range).
- Five-page API route references, 409/conflict controls, all card/binding/settings/backup mutations, and the no-free-form-QQ-id text.
- Service data shapes consumed by the pages: Workspace sessions, verified QQ scenes, token metadata, binding trust status, diagnostics configured/callback/final fields, history, backup/restore.

Temporary local smoke evidence (not part of the committed test suite): a Node DOM-stub harness loaded the real `console.js`, rendered overview/library/bindings/diagnostics/settings against mocked API payloads, toggled the theme, opened the style editor, exercised a 409 save conflict, and confirmed the draft survived the "keep draft" reload. It is not a browser and did not exercise real CSS/layout.

### Package dry-run

Final tarball after adding this report:

- filename: `amadeus-persona-0.1.0.tgz`
- total files: 25
- package size: 81.0 kB
- unpacked size: 341.0 kB
- key contents: `src/console/*`, `src/client.js`, `src/client-panel.js`, `scripts/build-client.mjs`, tests, manifest, README, and this report.

The exact `npm pack --dry-run` output is the authoritative record if the size differs by a few bytes after a later edit.

## Explicit unverified boundaries

- **No real DSH Desktop run.** The native `settings.section` bundle was verified structurally against the installed DSH 0.2.1-rc.3 pattern and the plugin's own build output, but it was not loaded into a running Desktop profile. Real client-loader compatibility, slot rendering, and popup behavior remain unverified.
- **No real browser run.** A headless Edge launch was blocked by the execution sandbox. The console was not visually inspected in Edge/Chromium in this environment; light/dark, responsive layout, and CSS rendering are unverified as a visual experience. No screenshots were fabricated.
- **No real `connection.admit`/Owner peer.** Authorization tests use a fake Owner/guest/rejected Connection. The real DSH Owner principal shape and admission status codes were not exercised.
- **No real Workspace registry, Session headers, or QQ Host.** Workspace membership, subagent flags, QQ trusted Scene mappings, and stale-binding behavior use test doubles.
- **No final System Prompt verification.** The Host contract does not prove final Section visibility. The console reports it as unverified; callback invocation alone is not treated as final injection.
- **No tool/preset/permission/model verification.** The tests do not compare the final tool list, tool-call behavior, preset state, model quality, or KV-cache cost with and without Persona.
- **No real backup/restore in a profile.** Backup and restore were tested against isolated temporary directories, not a live DSH data directory.
- **No installer or publish step.** No DSH profile, existing four-plugin repository, Git remote, commit, publish, or Release was touched. The package remains private.

## Changed files

- `package.json` — client export, DSH client manifest, file list, build script.
- `src/http.js` — console asset routes, strict CSP, content types.
- `src/console-assets.js` — shipped HTML/CSS/JS asset loading.
- `src/console/index.html`, `src/console/console.css`, `src/console/console.js` — five-page console.
- `src/service.js` — explicit `finalVisibility: 'unverified'` diagnostic metadata.
- `src/client-panel.js`, `src/client.js` — native DSH settings section and generated bundle.
- `scripts/build-client.mjs` — deterministic client build.
- `test/http.test.js`, `test/console.test.js`, `test/run.js` — asset/auth, client, package, and API-flow tests.
- `README.md` — install, first setup, upgrade/rollback, isolation, limitations.
- `docs/UI_REPORT.md` — this report.

Not modified: `src/store.js`, `src/validation.js`, `src/index.js`, `cordis.patch.yml`, and any external plugin repository.

## Recommended next step

Run an isolated DSH Desktop 0.2.1-rc.3 profile test with the built tarball and real Edge Chromium: verify the native settings card, owner admission through the actual DSH page, five-page light/dark/narrow rendering, real Workspace membership, one real QQ Scene mapping (if QQ is installed), 409 behavior across two windows, backup/restore, and restart persistence. Treat final prompt visibility, tool invariance, model behavior, and token-cache impact as separate measured acceptance items.
