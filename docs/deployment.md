# Deployment

The app is a static site. One build, `dist/`, is used two ways:

- published to **Vercel** as a website;
- wrapped by **Tauri** as a desktop app for Windows, macOS or Linux.

There is no server, database or environment variable to set up in either case. The
spreadsheet is read, and the `.docx` built, inside the browser window.

## Prerequisites

- Node.js 20 or later (developed on Node 24)
- npm

Check the build before deploying:

```bash
npm install
npm test
npm run build
```

`npm run build` type-checks the code, then writes `dist/`. Preview that build locally with:

```bash
npm run preview
```

## Vercel

`vercel.json` already sets the framework, the build command and the output folder:

```json
{ "buildCommand": "npm run build", "outputDirectory": "dist", "framework": "vite" }
```

### From the Vercel dashboard

1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Leave the settings as detected and click **Deploy**.

Every later push to the main branch deploys to production, and every other branch gets its
own preview URL.

### From the command line

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production deployment
```

The first run asks you to log in and link the folder to a project.

### Note on the SheetJS dependency

`package.json` installs SheetJS from the SheetJS CDN
(`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`), not from npm. The npm copy is
stuck at 0.18.5, which has two published security advisories. Vercel's build needs to reach
`cdn.sheetjs.com`. If your network blocks it, see
[Troubleshooting](troubleshooting.md#install-fails-on-xlsx).

## Desktop app (Tauri)

The desktop shell is in `src-tauri/`. It opens the same `dist/` in a native window, so it
works fully offline. Fonts are bundled.

### One-time setup

Install Rust and the platform tools Tauri needs. Follow
<https://v2.tauri.app/start/prerequisites/> for your system. On Windows that is:

1. **Microsoft C++ Build Tools**, with the *Desktop development with C++* workload.
2. **WebView2**, already present on Windows 10 (version 1803 and later) and Windows 11.
3. **Rust**, from <https://rustup.rs>.

Check Rust is installed:

```bash
cargo --version
```

### Generate the icons

The repository ships one source icon, `src-tauri/app-icon.png` (512×512). Generate the
platform icon set from it once:

```bash
npm run tauri icon src-tauri/app-icon.png
```

This writes `src-tauri/icons/`, which the bundle config expects.

### Run it in a window during development

```bash
npm run tauri dev
```

This starts the Vite dev server and opens it in a desktop window, reloading on changes.

### Build the installer

```bash
npm run tauri build
```

The first build downloads and compiles the Rust dependencies, which takes several minutes.
Installers land in `src-tauri/target/release/bundle/`:

| System | Output |
| --- | --- |
| Windows | `msi/` and `nsis/` installers |
| macOS | `dmg/` and `macos/` app bundle |
| Linux | `deb/`, `rpm/`, `appimage/` |

Build on the system you are targeting. A Windows installer is built on Windows.

### Window and app settings

Edit `src-tauri/tauri.conf.json`:

| Setting | Current value |
| --- | --- |
| `productName` | Credits Compiler |
| `identifier` | `com.creditscompiler.app` — change to your organisation's reverse domain before distributing |
| `version` | 1.0.0 — keep in step with `package.json` |
| `app.windows[0]` | 1360×900, minimum 720×560 |

### Code signing

Unsigned Windows installers show a SmartScreen warning, and unsigned macOS apps are blocked
by Gatekeeper. For distribution beyond your own machine, set up signing as described in
<https://v2.tauri.app/distribute/sign/windows/> and
<https://v2.tauri.app/distribute/sign/macos/>.

## Releasing a new version

1. Update `version` in both `package.json` and `src-tauri/tauri.conf.json`.
2. Run `npm test` and `npm run build`.
3. Push to deploy the website. Run `npm run tauri build` for new desktop installers.
