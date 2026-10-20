# FlowCV Manager

Local Windows CV library for [FlowCV](https://flowcv.com), with JSON imports, versioning, and one-click restore, publishing, and download through the original FlowCV PDF renderer.

Not affiliated with or endorsed by FlowCV.

## Install on Windows

**Development / ZIP install:** extract the ZIP and double-click `Installa-FlowCV.cmd`. It creates a desktop shortcut and a Start Menu shortcut, without administrator privileges. Requires Node.js **22+** and Microsoft Edge or Google Chrome. `Installa-FlowCV.ps1` installs program files under `%LOCALAPPDATA%\Programs\FlowCV Manager`.

**Standalone `.exe` installer (recommended):** the repository includes an Inno Setup source and a GitHub Actions workflow that bundles an official Node.js runtime with the desktop application. Download the generated `FlowCV-Manager-Setup-0.6.2.exe` artifact from **Actions → Windows Installer**. It creates Desktop and Start Menu shortcuts, installs per user (no administrator rights), stops any previous Manager process before replacing files, and **does not require separate Node.js installation**. The binary must still be built by GitHub Actions and verified on Windows; it is not included in this source ZIP.

Your resumes, history and encrypted session stay in `Documents\FlowCV-Local-Manager`. Updating or uninstalling the program does **not** delete your archive.

## Publishing on GitHub

1. Create an **empty** public repository named `flowcv-manager` under your own account. Do not add an auto-generated README or license; both are included here.
2. Push this source directory (not your local CV data directory). GitHub Actions runs the cross-platform tests.
3. Open **Actions → Windows Installer → Run workflow** to build the standalone installer executable. Download the build artifact, inspect it on Windows, and only then publish a GitHub Release.
4. Never add session cookies, private resumes, or logs to issues, pull requests, or release archives.

## Login / cookie handling

Click **Apri FlowCV nel mio Edge** in **Connessione e impostazioni**. The Manager opens your ordinary Microsoft Edge profile, where Google sign-in works normally. **No remote debugging, browser automation or separate login profile is used.**

The Manager cannot automatically extract an HTTP-only login cookie from Edge's existing browser profile. After signing in, open Edge DevTools (`F12` → Application → Cookies → `https://app.flowcv.com`), copy only the **Value** for `flowcvsidapp`, paste it in the Manager's **Sessione FlowCV** field and click **Collega account**. Your session is verified and stored encrypted with Windows DPAPI. You do not need to repeat this after every launch: only when FlowCV revokes or expires the session.

If the FlowCV CLI has a current cookie already saved, use **Alternativa: importa dalla CLI** instead. Never share a session cookie in chat or on GitHub.

## Working with CVs

- Import JSON produced by ChatGPT, add a name/company/position.
- Edit or duplicate saved versions locally without altering your master version.
- Press **Pubblica e scarica PDF** on a selected version: FlowCV's single online resume is replaced, verified, made available on the public web, and its real PDF is downloaded.
- This operation is **intentionally confirmation-free**, as requested by the user. It overwrites the online resume and does not automatically back it up. Keep your master JSON in the local archive.
- The Manager is served on `http://127.0.0.1:8765` and communicates with FlowCV over HTTPS.

## Security, scope and credits

Never commit `Documents\FlowCV-Local-Manager`, `*.dpapi`, cookies, CV JSON exports, personal photos or emails. Session cookies grant account access; do not paste them in GitHub issues. Credential material is encrypted using Windows DPAPI (CurrentUser).

Inspired by [amirwebd3v/Flowcv-MCP](https://github.com/amirwebd3v/Flowcv-MCP); **FlowCV Manager is independently packaged and does not vendor the upstream source**. The original repository had no explicit LICENSE file when this project was reviewed. This project is not affiliated with the upstream author or with FlowCV.

See `FlowCV-Local-Manager/README.md` for troubleshooting and development details.
