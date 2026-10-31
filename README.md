# Amadeus Persona

<img src="assets/market-icon.png" width="80" alt="Amadeus persona logo">

[简体中文](README.zh-CN.md) · [Detailed configuration](REFERENCE.md) · [Issues](https://github.com/jeskoky-pixel/amadeus-persona/issues)

One core identity and reusable Scene styles, injected as independent System Prompt sections.

Target package: **`@fg-lab/amadeus-persona@1.2.0`**. Tested runtime baseline: official DSH Desktop **0.2.1-rc.3**. MIT licensed.

## Release status

Productization candidate. Public npm and GitHub Release publication are pending release gates and npm account authorization. A version in this README is not evidence of publication. See [publishing policy](docs/PUBLISHING.md).

## What you can do

- Edit one shared SOUL core identity and any number of reusable STYLE cards, with versions and backups.
- Select a default style for one Workspace and override individual Sessions or trusted QQ Scenes; choose inherit, core-only or disabled when appropriate.
- Update persona at a later model assembly without changing the Agent Preset or rebuilding an existing Session. Ongoing tool calls are not interrupted.
- Use the bilingual console's library, bindings and diagnostics; inspect conflicts and final System Prompt visibility.

Example: keep the same core identity for a project, use a concise style in a work Session and a conversational style in an authorized QQ group. Scene members share that Scene style, not private memory from other Scenes.

Persona creates neither a new model nor new tool permissions. Other Workspaces and subagents are excluded by default. A persona edit can affect request-series or prompt-cache reuse; long conversation context may still influence wording. A configured card is not proof of final injection: use diagnostics.

## Install and configure

Install the prebuilt `.tgz` with the official DSH plugin manager into your selected Profile. No local source build is required. Follow [installation instructions](docs/INSTALL_V1_2.md); do not copy configuration into a running Profile by hand.

Open the Persona console, bind one Workspace, save your own core card and optionally create styles and bindings. An empty install imposes no persona.

The other Amadeus plugins are optional. Install only the integrations you need.

## Interface

![Amadeus Persona interface](docs/screenshots/product-release-20261031.png)

This is a recorded interface screenshot, not evidence that every real platform capability passed the current release gate. See the detailed reference and verification reports for limitations.

## Upgrade and recovery

Back up user data before upgrading. Code, persistent user data and recovery backups are separate. Disable stops functionality; uninstall is intended to retain external data. Restoring old code alone does not reverse a database migration.

- [Upgrade policy](docs/UPGRADE_POLICY.md)
- [Data migration and recovery](docs/DATA_MIGRATION.md)
- [Release checklist](docs/RELEASE_CHECKLIST.md)
- [Full configuration and limitations](REFERENCE.md)

## Ecosystem and license

[Amadeus project](https://github.com/jeskoky-pixel/Amadeus-dsh) · [MIT license](LICENSE)
