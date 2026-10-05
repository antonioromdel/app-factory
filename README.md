# App Factory

App Factory is Antonio's private development platform for managing and automating Flutter mobile application development.

## Main objective

Reduce the repetitive work involved in creating, configuring, developing, testing and publishing Flutter applications.

## Core areas

1. Project management
2. Flutter project generation
3. Firebase management
4. AdMob management
5. Android / Google Play management
6. iOS / App Store management
7. Development checklists
8. Knowledge base
9. Asset generation
10. Release management
11. Local development automation
12. Future store publishing automation

## Architecture

React + TypeScript + Vite
Firebase Authentication
Cloud Firestore
CSS Modules

Future:

React
↓
Local Node.js API
↓
Operating System
↓
Flutter / Dart / Git / Firebase CLI / Fastlane

## Important

This application is private and runs locally.

The data is synchronized through Firebase so it can be accessed from multiple computers.

Only the authorized user should have access.

## Development

```bash
pnpm install
pnpm dev
```

Scripts:

- `pnpm dev` — start the local app
- `pnpm build` — typecheck and production build
- `pnpm lint` — ESLint
- `pnpm format` — Prettier

## Firebase

The web app configuration lives in `.env`, copied from `.env.example`. That file stays out of Git.

Firestore rules are in `firestore.rules`. Only the authorized account can read or write data. Publish that file to Firebase for the restriction to take effect in the project.

## Development philosophy

Keep the application simple, maintainable and understandable.

Do not over-engineer.

Do not introduce dependencies without justification.

Do not use Tailwind CSS.

Do not expose secrets.

Do not execute operating-system commands directly from React.
