# App Factory

App Factory manages the lifecycle of Flutter applications: project records, checklists, notes, releases, assets, and local commands such as creating a project, checking the environment, and preparing a build.

The interface runs in the browser. Flutter, the Android SDK, and Xcode stay on your computer. Each installation uses its own Firebase project. Accounts in that project share one workspace.

Licensed under the [MIT License](LICENSE).

## Requirements

- Node.js 20 or newer
- pnpm
- A Firebase project

The local helper also needs the Flutter SDK for project creation, health checks, dependencies, and builds. iOS builds need a Mac with Xcode.

## Set up Firebase

1. Create a Firebase project.
2. Register a web app and copy its configuration.
3. Enable the Email/Password sign-in provider.
4. Create a user in Authentication. The app has no registration screen.
5. Create a Cloud Firestore database.
6. Enable Storage if you want to store images. `pnpm deploy:rules` deploys Storage rules too, and it fails until Storage is set up. Until then, publish Firestore only:

```bash
firebase deploy --only firestore:rules
```

Every signed-in account of that Firebase project can read and write its data. Create only the accounts that should share the workspace.

## Configure this copy

```bash
pnpm install
cp .env.example .env
cp .firebaserc.example .firebaserc
```

On Windows PowerShell, use `Copy-Item` instead of `cp`.

Fill `.env` with the web app configuration. `.env` stays out of Git. The Firebase web API key is not a secret; Authentication and the security rules are what protect the data.

Set your project id in `.firebaserc`. That file is also ignored by Git. Sign in with the Firebase CLI, then deploy the rules:

```bash
firebase login
pnpm deploy:rules
```

## Run

```bash
pnpm dev
pnpm dev:local
```

Open http://localhost:5173 and sign in with the user created in Authentication.

`pnpm dev` starts the web app. `pnpm dev:local` starts the helper at http://127.0.0.1:3847. The helper only accepts the app when it is served from port 5173, and it never listens on a public address. The web app still works if the helper is not running; Flutter commands stay unavailable.

## Scripts

- `pnpm dev` — start the web app
- `pnpm dev:local` — start the local helper
- `pnpm build` — typecheck and production build
- `pnpm test` — run the tests
- `pnpm lint` — ESLint
- `pnpm format` — Prettier
- `pnpm deploy:rules` — deploy Firestore and Storage rules

## Security

Do not commit `.env`, `.firebaserc`, keystores, or signing passwords. The helper only runs a fixed list of operations, and only from this machine.
