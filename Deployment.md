# Deployment (Render) and Local Commands

This file documents the exact Build and Start commands you can use on Render, plus Windows-local commands for testing and debugging.

## Render service settings (paste these into Render)

- Build Command:

  npm install && npm run render:build

  (Alternative, more deterministic when you have a lockfile:)

  npm ci && npm run render:build

- Start Command:

  npm run render:start

  (Alternative: use the helper script `./render.sh` — requires a POSIX shell)

Notes:
- `render:build` and `render:start` are defined in `package.json`.
- Render provides the `$PORT` environment variable during startup; `render:start` runs `next start -p $PORT` so the app will bind to that port.

## Windows (PowerShell) — local test commands

Use these to build and run the production server locally on Windows PowerShell.

1) Install dependencies and build (same as Render):

```powershell
npm install; npm run render:build
```

2) Start the production server on a test port (PowerShell):

```powershell
# $env:PORT sets the PORT for the current process only
$env:PORT=3000; npm run render:start
```

3) If you want to run the start script in a single-step (CMD-style) from PowerShell, you can also use:

```powershell
cmd /c "set PORT=3000 && npm run render:start"
```

## Windows (CMD) — one-liners

In Command Prompt (cmd.exe):

```cmd
set PORT=3000 && npm run render:start
```

This sets `PORT` for the command session and runs the start script.

## Using `render.sh` on Windows

`render.sh` is a small Bash script included in the repo. To run it on Windows you need a POSIX shell environment, for example:
- Git Bash (comes with Git for Windows)
- WSL (Windows Subsystem for Linux)

From PowerShell using Git Bash:

```powershell
bash ./render.sh
```

Or from WSL (from your Linux shell):

```bash
./render.sh
```

## Optional: Windows helper (render.bat)

If you'd like a native Windows batch file to mirror `render.sh`, create a file named `render.bat` with the following content:

```bat
@echo off
if "%PORT%"=="" set PORT=10000
echo Starting app on port %PORT%...
npm run render:start
```

Place `render.bat` in the repo root and call it in PowerShell or CMD as `.
ender.bat`.

## Troubleshooting

- If `next start` fails, ensure you ran a production build with `npm run render:build` first.
- If you get port-in-use errors, choose a different port: e.g. set `$env:PORT=4000`.
- If you see Windows line-ending warnings in Git, it's informational — the repo committed `render.sh` with executable mode set; using `render.bat` or running `bash` avoids CRLF issues.

## Suggested Render settings recap

- Build command: `npm install && npm run render:build`
- Start command: `npm run render:start`
- Environment: Render will supply `$PORT` automatically

---

If you want, I can also add a `render.bat` file to the repo and commit it so Windows users can run `.
ender.bat` without installing Bash.
