# Persona v0.1 — zh-CN / en-US UI localization

## Result

The owner Web Console and the native DSH settings section now support complete
zh-CN and en-US UI copy. zh-CN is the default on a first visit; a manual language
selection switches to en-US independently of the light/dark theme. Persona
runtime behavior, Owner admission, revision/draft handling, bindings, rollback,
and the existing visual layout are unchanged.

## One dictionary source, two generated surfaces

- `src/i18n/catalog.js` is the single authoritative dictionary. It exports
  `CATALOG` (identical key sets for `zh-CN` and `en-US`),
  `DEFAULT_LANGUAGE = 'zh-CN'`, `LANGUAGES`, and a small interpolation helper.
  The catalog currently has 618 keys per language and covers the five console
  pages, every editor/scene/backup/history state, validation, toasts, errors,
  aria-labels and help text.
- `scripts/build-client.mjs` imports that catalog and generates both consumers:
  - `src/client.js` inlines the catalog into the lazy-CJS DSH settings bundle.
  - `src/console/i18n.js` publishes the same catalog as
    `window.__AmadeusPersonaI18n` for the browser console.
- `src/console/index.html` remains the only console HTML shell. It loads
  `/api/amadeus-persona/console/i18n.js` before
  `/api/amadeus-persona/console/console.js` with `defer`, so there is no
  duplicate HTML page tree and no inline script.
- `src/http.js` serves the new dictionary asset through the existing same-origin
  check, DSH Owner admission, and `CONSOLE_CSP`. `src/console-assets.js` reads it
  at module load. No external origin, inline script, inline style, or new network
  destination was added.
- `npm run build:client` regenerates `src/client.js` and
  `src/console/i18n.js`; the test suite verifies both are byte-for-byte in sync
  with the catalog.

## Language selection and persistence

- Console key: `amadeus.persona.language` in `localStorage`; invalid or absent
  values resolve to `zh-CN`. The existing theme key
  (`amadeus.persona.theme`) is unchanged and independent.
- The console top bar has an accessible language `<select>` labeled
  “界面语言 / UI language”. Switching re-renders the current page immediately,
  updates `document.documentElement.lang` and `document.title`.
- The native DSH panel uses the same catalog and key, shows the same language
  selector, and persists only the language preference. Its section label is read
  from the catalog through `readLanguage()`.
- No Persona cards, bindings, revisions, drafts, Workspaces, diagnostics, or
  backups are stored in browser storage. The technical IDs and values rendered
  by the console still come from the authenticated Host JSON API.

## Translation details

- The catalog contains one key set for both languages; a test asserts key and
  placeholder parity.
- All user-visible copy uses `t()` / `tn()`: page titles and subtitles, navigation,
  loading/unavailable states, warnings, editor fields and previews, Scene target
  states and actions, Workspace switch confirmation, diagnostics (configured vs
  callback vs final visibility, sanitized detail, capability boundary,
  limitations), backups/history/restore, conflicts, form validation, success and
  failure toasts, buttons, aria-labels, placeholders and help text.
- Backend error handling is code-driven. Known codes such as
  `PERSONA_AUTH_REQUIRED`, `PERSONA_CONFLICT`, `PERSONA_INVALID`,
  `PERSONA_STORAGE_UNAVAILABLE`, `PERSONA_WORKSPACE_UNAVAILABLE`,
  `PERSONA_QQ_UNAVAILABLE`, and the fixed management/internal/endpoint errors are
  mapped to localized, fixed copy. The raw `payload.error` message is not
  rendered, so Host paths, storage details, Session ids, and prompt bodies cannot
  leak through an error banner.
- Dynamic Host/user values (style names, Workspace titles, ids, dates, counts)
  are still escaped before insertion. Only the trusted static catalog can contain
  small HTML fragments such as `<span class="mono">` for technical identifiers.
- Dates now use the selected UI locale. Technical identifiers such as `SOUL`,
  `STYLE`, `Workspace`, `Session`, `Scene`, `DSH`, `Host`, `QQ`, `Token`,
  `interpolate: false`, and capability flag names remain in English where they
  are contract identifiers, with Chinese explanation in the surrounding copy.

## Native DSH settings panel

`src/client-panel.js` now imports the same generated catalog data at build time.
It localizes the panel title, storage/Workspace metrics, checking/healthy/invalid/
unavailable states, the console button, the security note, the section label,
and Host error fallbacks. It adds a language selector and uses the same
`amadeus.persona.language` key and zh-CN default. It still performs exactly one
`/overview` fetch and never edits cards, bindings, backups, or settings.

## Tests and build

Commands run in this workspace:

- `npm test` (`node test/run.js`): **47 tests, 47 pass, 0 fail**.
- `npm run build:client`: generated `src/client.js` (86,275 bytes) and
  `src/console/i18n.js` (77,407 bytes) from the shared catalog.

Focused checks added or expanded:

- Catalog key/placeholder parity and non-empty values in both languages.
- zh-CN default language and en-US switching/persistence, including that only
  the language and theme keys are written to browser storage.
- Representative page/state/validation/conflict/toast strings in both languages.
- Backend error-code translation with a path/secret leak guard.
- Generated browser dictionary and native bundle consistency with
  `src/i18n/catalog.js`; exactly one console HTML shell; all five pages share the
  generated asset.
- `/console/i18n.js` Owner-gated asset route, content type, strict CSP, HTML
  script order, and guest rejection.
- Existing API, service-shape, diagnostics, backup/restore, and security tests
  remain green.

A separate DOM-stub runtime smoke (not part of the committed suite) loaded the
real generated dictionary and `console.js`, rendered all five pages in zh-CN,
switched to en-US and back, verified theme/language independence, and exercised a
409 conflict with a fake internal path in the Host message; the path never
appeared in the rendered banner.

## Remaining untranslated wording

These are intentional or outside UI-copy translation:

- Product and contract terms: `Amadeus Persona`, `Persona`, `Workspace`,
  `Workspace.sessionIds`, `Session`, `Scene`, `DSH`, `Host`, `Owner`, `QQ`,
  `SOUL`, `STYLE`, `Agent`, `Memory`, `Life`, `State`, `Token`, `JSON`, `API`,
  `LocalStorage`, and CSS/JS identifiers.
- Stable IDs and data values: Workspace/Session/style/backup ids, section names
  (`amadeus:core-persona`, `amadeus:scene-persona`), enum values (`subagent`,
  `unverified`, `visible`, `overridden`, `not_checked`, source/mode values),
  capability keys, and the `interpolate`/`complete` contract fields. These are
  shown as technical identifiers, usually with a Chinese explanation around them.
- Owner-authored card names, descriptions, and body text are content, not UI
  copy, and are not translated.
- A future backend error code without a catalog entry falls back to localized
  fixed status copy (or a localized generic message plus the technical code),
  never to the raw server message.
- The static boot card in `index.html` is zh-CN. A returning en-US visitor may
  see that boot card briefly before the deferred dictionary and console scripts
  render the selected language.
- The native DSH section label is evaluated through `readLanguage()`, but the
  surrounding DSH shell may cache the label until it next asks for it; the panel
  body itself re-renders on selection.

## Scope note

This localization work only edited the contract-owned files for the task. During
the session, concurrent changes appeared in out-of-scope backend/test files
(`src/service.js`, `src/store.js`, `src/validation.js`, `test/helpers.js`,
`test/resolver.test.js`, `test/store.test.js`); they were not made or reverted by
this change. The full suite above passes with those files present.
