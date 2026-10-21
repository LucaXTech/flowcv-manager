## v0.6.3.1 — Windows source-installer hotfix

- Fix ZIP/`.cmd` installer omitting `i18n.js`. The missing script prevented the UI from initializing, which made saved resumes appear missing and EN/IT unresponsive.
- Validate required static assets on server startup and fail with an explicit installation error instead of displaying an empty application.
- Add regression coverage to ensure the source installer includes every JS/CSS/SVG referenced in `index.html`.
- User resume data and encrypted session remain untouched.

# Changelog

## v0.6.3 — Bilingual interface

- Add a persistent English/Italian UI switch with browser-locale detection.
- Translate controls, status messages and field labels without changing resume JSON or user-defined resume metadata.
- Add English and Italian languages to the Inno Setup installer wizard.
- Use English documentation for public GitHub distribution.

## v0.6.2 — Standalone Windows installer

- Bundle the Node.js 24 Windows runtime and its license inside the GitHub Actions-built installer.
- Prefer bundled Node.js in the Windows launcher and stop commands while retaining compatibility with an existing Node.js installation.
- Exclude local resumes, credentials, sessions, PDFs and runtime artifacts from Git.

## v0.6.1 — Normal Edge login

- Replace automated/debug-browser login with opening FlowCV in the user's regular Microsoft Edge profile.
- Keep manual cookie entry or importing a valid session from the FlowCV CLI.
- Retain Windows DPAPI encryption; never attempt to silently read the user's normal browser cookies.

## v0.6.0 — Local Windows installation

- Add a per-user installer, Desktop and Start Menu shortcuts, and an Inno Setup/GitHub Actions build configuration.
- Add session-connection controls. Automated browser login was later replaced in v0.6.1.

## v0.5.4 — One-click publish and download

- Restore a selected local JSON to the existing FlowCV resume, verify content, publish the web resume when necessary and download the original FlowCV PDF.
- Remove automatic online backups, repeated confirmations and the separate online PDF button.
- Preserve local master and stored versions. Retain the existing online photo when restoring between accounts.

## v0.5.3 — Original PDF download

- Download FlowCV's generated PDF directly via its existing endpoint, with authentication checks and PDF signature validation.

## v0.5.2 — Local browser field handling

- Adjust the masked session input field for the local HTTP interface without disabling browser security settings.

## v0.5.1 — Reliable desktop launcher

- Keep the local server alive when Edge delegates its window to another process.
- Add an explicit stop command and launcher diagnostics.

## v0.5.0 — App-style window and refreshed interface

- Add a single-click Windows desktop launcher and a cleaner resume library interface.
- Open FlowCV links in the normal browser profile, preserving existing website sessions.

## v0.4.1 — Manual version management

- Stop automatically creating online backups during restores.

## v0.4.0 — Organized local archive

- Add local names, employers, roles, notes, search, duplication, recycle bin and a single restore confirmation.

## v0.3.1 — Windows DPAPI fix

- Load the required .NET cryptography assembly for Windows PowerShell DPAPI support.
