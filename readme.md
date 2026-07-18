Fylo — An AI-native Developer Artifact & Knowledge Vault

**Tagline:**
Store, organize, preview, search and intelligently retrieve development artifacts using AI workflows.

**Project Fits into:**
- Developer Tools
- Productivity

---

## Architecture Overview

Fylo consists of two main parts:
1. **Backend Server**: Express/Node application that handles upload plans, strategy decisions (duplicate reuse, chunked, compression), metadata indexing (with Prisma & PostgreSQL), and Telegram media channel coordination.
2. **CLI client (`fylo`)**: Node-based command-line interface that allows developers to upload, query, sync, and catalog project builds from local directories or CI/CD pipelines.

---

## Installing the CLI

To compile and link the CLI client:
```bash
cd cli
npm install
npm run build
npm link
```

---

## CLI Usage Guide

### 1. Authentication
* **Standard Interactive Flow:**
  ```bash
  fylo login <token>
  ```
* **CI/CD Non-Interactive Flow:** Set the `FYLO_API_KEY` (or `FYLO_TOKEN`) environment variable. The client automatically picks it up to authenticate all operations.

### 2. Configuration Settings
Show, set, or read configurations:
```bash
fylo config show
fylo config set apiUrl http://localhost:5000/api
fylo config get apiUrl
```

### 3. Uploading Artifacts
Upload files as tracked developer artifacts:
```bash
fylo upload release.zip --project my-app --version 1.0.0 --env production --tags release,stable
```

### 4. Directory Synchronization
Compare local folders against remote vaults and upload only changed files. Can automatically clean up obsolete remote files:
```bash
fylo sync ./dist --name app-builds --delete --yes
```

---

## Production & Automation Workflows

### Environment Variables
Configure the client dynamically in stateless pipeline runners:
* `FYLO_API_URL`: Endpoint path (e.g. `http://localhost:5000/api`).
* `FYLO_API_KEY` / `FYLO_TOKEN`: Secure connection authentication token.
* `FYLO_JSON`: Force standard outputs to return structured JSON.
* `NO_COLOR`: Disables all colored decorations and spinners.
* `FYLO_PROJECT` / `FYLO_VERSION` / `FYLO_COMMIT` / `FYLO_BRANCH` / `FYLO_ENV` / `FYLO_TAGS`: Automated build metadata attributes.

### JSON Output Mode
Pass `--json` or set `FYLO_JSON=true` to pipe structured JSON to `stdout` for downstream processing:
```bash
FILE_ID=$(fylo upload app.zip --json | jq -r '.id')
```

For comprehensive GitHub Actions, GitLab CI/CD, and pipeline workflow recipes, refer to the [CI/CD Integration Guide](file:///C:/Users/pc/.gemini/antigravity/brain/9ad66303-dab5-4f45-a881-15048df90296/artifacts/ci_cd_integration.md).