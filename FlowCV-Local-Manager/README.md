# FlowCV Manager — Developer and local installation notes

FlowCV Manager is a local Windows application for organizing multiple resume versions and restoring one at a time to an existing FlowCV account. The interface supports **English and Italian**; this preference does not translate or edit resume contents or JSON fields.

For a user-facing overview, see the [repository README](../README.md).

## Install and launch

- Recommended: build or download the **Windows installer** produced by the GitHub Actions `Windows Installer` workflow. It bundles the Node.js runtime, installs per user, and creates Desktop and Start Menu shortcuts. The installer is unsigned and should be verified before public distribution.
- Source distribution: use `Installa-FlowCV.cmd` at the repository root. This path requires Node.js 22+ to be installed separately.
- Program installation directory: `%LOCALAPPDATA%\Programs\FlowCV Manager`.
- User data directory: `%USERPROFILE%\Documents\FlowCV-Local-Manager` (resume library, history, session). Updating or uninstalling the application does not remove these user files.
- The desktop launcher starts a Node.js server bound to `127.0.0.1:8765` and opens Edge or Chrome in app mode. To stop the background server, run `Arresta-FlowCV.cmd`.

## Authentication

1. Use **Open FlowCV in my Edge** to sign in through your normal Edge profile; Google sign-in does not work reliably in automated/debug browsers.
2. If the Manager has no valid session, retrieve only the **Value** of `flowcvsidapp` from Edge DevTools → Application → Cookies → `https://app.flowcv.com` and paste it into the Manager. The alternative option can reuse a valid FlowCV CLI session.
3. The Manager verifies the session and stores it encrypted with Windows DPAPI (CurrentUser). Refresh the cookie if FlowCV expires or revokes it.

The application **cannot silently read cookies from a personal Edge browser profile**. Never publish cookies, DPAPI files, personal CV JSON, photos or logs.

## Workflow and limitations

1. Import a FlowCV-compatible JSON resume or save the current online resume to your local library.
2. Give local versions names, employers, job titles and notes. Keep an untouched master version.
3. Select a local version and choose **Publish & download PDF**. This replaces the current online resume, verifies the restored content, publishes the FlowCV web resume, and downloads FlowCV's own PDF.

**Important:** This one-click operation deliberately requires no confirmation, and it does not create an automatic backup. A public FlowCV page may change. Your FlowCV subscription's online-resume limit still applies. The integration uses undocumented endpoints and can stop working if FlowCV changes its service.

## Testing and source structure

- `server.mjs`: local HTTP server, loopback-only; `bridge.mjs`: session management and FlowCV requests.
- `app.js`, `index.html`, `style.css`, `i18n.js`: user interface, presentation and EN/IT localization.
- `launcher.mjs`, `FlowCV-Manager.vbs`, shortcut scripts: Windows desktop experience.
- `tests/`: local automated coverage; run `node --test FlowCV-Local-Manager/tests/*.test.mjs` from the repository root or use the GitHub Actions workflows.

This is an independent, unofficial project not affiliated with or endorsed by FlowCV. Source is licensed under the repository's MIT license.
