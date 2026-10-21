# FlowCV Manager

**Your resumes. Your versions. One click to the original FlowCV PDF.**

[![Tests](https://github.com/LucaXTech/flowcv-manager/actions/workflows/tests.yml/badge.svg)](https://github.com/LucaXTech/flowcv-manager/actions/workflows/tests.yml)
[![Windows Installer](https://github.com/LucaXTech/flowcv-manager/actions/workflows/windows-installer.yml/badge.svg)](https://github.com/LucaXTech/flowcv-manager/actions/workflows/windows-installer.yml)

FlowCV Manager is a **free, local Windows desktop companion for [FlowCV](https://flowcv.com)**. Keep as many *local* resume versions as you like, organize them by employer and job title, edit and duplicate them, then restore your chosen version to FlowCV and download the **original FlowCV-generated PDF**.

**English and Italian UI:** Switch with the `EN / IT` control in the top bar. The app remembers your preference. Your resume data and JSON content are never translated by the language switch.

> **Independent, unofficial project.** Not affiliated with or endorsed by FlowCV. Uses undocumented web endpoints; changes to FlowCV can break compatibility. Your FlowCV plan's online-resume limit still applies: the application replaces the selected online resume, not the limit.

## Features

- **Unlimited local resume versions** — name, company, role, notes, search and filter.
- **FlowCV JSON import / export** — prepare targeted resumes with ChatGPT, then import complete FlowCV-compatible files.
- **Edit locally** — profile, sections, entries, visibility, full JSON, snapshots, recycle bin.
- **Publish & download PDF** — one click uploads the selected resume to your **existing** FlowCV account, verifies the content, publishes the online page and downloads the authentic FlowCV PDF.
- **No repeated prompts** — publishing is intentionally confirmation-free and **overwrites** the selected online resume. No automatic remote backup: keep a local master version.
- **Persistent session** — FlowCV cookie stored encrypted via Windows DPAPI; reconnect when expired. The app cannot automatically read cookies from your personal Edge profile.
- **Windows desktop app** — launcher, desktop/Start shortcuts, installer and Inno Setup packaging.

## Installation (Windows)

### Standalone Windows installer (recommended)

Open [Actions → Windows Installer](https://github.com/LucaXTech/flowcv-manager/actions/workflows/windows-installer.yml), choose the latest successful run and download the `FlowCV-Manager-Windows-Installer` artifact. Extract the ZIP and run `FlowCV-Manager-Setup-0.6.3.1.exe`.

The installer bundles Node.js, needs no separate Node installation, installs for the current user without admin rights, and creates Desktop and Start Menu shortcuts. **A successful build is not the same as a Windows field test; review the release and test the installer before trusting it for important work.** The installer is not digitally signed.

### Source / ZIP installation

Download the repository ZIP and run `Installa-FlowCV.cmd` (requires **Node.js 22+** and Edge or Chrome). Program files install to `%LOCALAPPDATA%\Programs\FlowCV Manager`. Resume library and session persist in `Documents\FlowCV-Local-Manager` across app updates and uninstalls.

## Quick start

1. Launch **FlowCV Manager** from your desktop shortcut.
2. Under **Connection & settings**, choose **Open FlowCV in my Edge** and sign in normally.
3. If a valid session is not stored, copy only the `flowcvsidapp` **Value** from Edge DevTools → Application → Cookies → `https://app.flowcv.com`, paste it in the Manager and click **Connect account**. You can alternatively import a saved Flowcv-MCP CLI session.
4. Import a FlowCV JSON resume, assign a name, employer and position, or pull the current online resume into your local library.
5. Choose a saved version → **Publish & download PDF**. This replaces the selected online FlowCV resume, may make its public link available, and downloads the PDF.

The Manager serves its UI on `http://127.0.0.1:8765` (loopback only) and talks to FlowCV using HTTPS. It is not a remote multiuser service. The browser password / HTTPS indicators are unrelated to FlowCV's authenticated HTTPS endpoint.


## Privacy & security

- Your resume data and encrypted session stay on your computer. Never commit `Documents\FlowCV-Local-Manager`, cookie values, `*.dpapi`, private JSON, personal photos or debug logs.
- A FlowCV session cookie grants access to your account; do not paste it in GitHub Issues or public chats.
- Local writes are protected by a per-session app token; Windows DPAPI uses CurrentUser.
- Confirm you selected the correct online resume before using the one-click replace/publish action.

## Developer notes

- Source: `FlowCV-Local-Manager/`; tests: `FlowCV-Local-Manager/tests/`.
- GitHub workflows run tests on Windows and Linux and build the Inno Setup installer on Windows.
- UI translations: `FlowCV-Local-Manager/i18n.js` (English dictionary + Italian originals). No remote translation service.

## Credits & licensing

Copyright © LucaXTech, **MIT** (see [`LICENSE`](LICENSE)).

Inspired by [amirwebd3v/Flowcv-MCP](https://github.com/amirwebd3v/Flowcv-MCP), which is not bundled into this application. This project is **not affiliated with, supported by or endorsed by FlowCV**, or by the author of the upstream project.
