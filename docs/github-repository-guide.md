# GitHub repository guide

This project can be imported as a GitHub repository without generated build output, installed dependencies, browser data, or API secrets.

## Files that must be included

| Path                       | Purpose                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/`                     | Application routes, Cube/Piece UI, Step management, persistence, AI server functions, and styles |
| `scripts/`                 | Demo reset helper and Sites packaging helper                                                     |
| `docs/`                    | Demo, QA, deployment, and repository documentation                                               |
| `.github/workflows/ci.yml` | GitHub validation workflow                                                                       |
| `.env.example`             | Safe environment-variable template with no secrets                                               |
| `.gitignore`               | Excludes dependencies, builds, local state, and secrets                                          |
| `package.json`             | Scripts and dependency manifest                                                                  |
| `bun.lock`                 | Reproducible dependency versions                                                                 |
| `vite.config.ts`           | TanStack/Vite build configuration                                                                |
| `tsconfig.json`            | TypeScript configuration                                                                         |
| `eslint.config.js`         | Lint configuration                                                                               |
| `wrangler.jsonc`           | Cloudflare Worker configuration                                                                  |
| `components.json`          | UI component configuration                                                                       |
| `README.md`                | Public project overview and setup instructions                                                   |

The tracked `.lovable/` metadata identifies the original starter configuration. The tracked `.openai/hosting.json` binds this working copy to its existing Sites project; it contains a project identifier, not an API credential. Remove or replace that file if a fork should deploy to a different Sites project.

## Files that must not be uploaded

The `.gitignore` already excludes these:

- `.env` and `.env.*` files containing real keys
- `node_modules/`
- `.output/`, `dist/`, `.vinxi/`, `.nitro/`, and other generated build output
- `.wrangler/` and `.dev.vars`
- logs, local editor state, and operating-system metadata

Do not upload browser `localStorage` exports. Demo data is created by the application at runtime.

## Create the GitHub repository

Create an empty repository on GitHub without generating a README, `.gitignore`, or license, because this project already contains the first two and its license still needs an owner decision.

From the project directory, verify the upload:

```bash
git status
git ls-files
git grep -n -E 'OPENAI_API_KEY=.+|LOVABLE_API_KEY=.+'
```

The final command should return no matches containing a real value. Then connect and push:

```bash
git remote add github https://github.com/YOUR-USERNAME/shufflow.git
git push -u github main
```

If `github` already exists as a remote, update it instead:

```bash
git remote set-url github https://github.com/YOUR-USERNAME/shufflow.git
git push -u github main
```

## Configure GitHub

Recommended repository settings:

1. Add the live demo URL in the repository's **About** section.
2. Add topics such as `adhd`, `productivity`, `react`, `typescript`, `tanstack`, and `gpt-4-1`.
3. Protect `main` and require the **Validate** workflow before merging.
4. Enable Dependabot alerts and secret scanning.
5. Add a license only after choosing the reuse terms you want.

No API key is required by GitHub Actions because CI only type-checks, lints, and builds the application. Add deployment secrets to GitHub only if you later create an automated deployment workflow.

## Import or fork verification

After cloning the GitHub repository into a fresh directory:

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun run build
bun run dev
```

Verify the following in the browser:

- Home Cube rotation and accessible fallback work.
- Flow creation and rename persist after refresh.
- Transparent Pieces create tasks and solid Pieces open tasks.
- AI breakdown works when a server key is configured.
- Steps can be added, edited, reordered, deleted, completed, and skipped.
- In Run mode, Step swipe right completes and Step swipe left skips.
- The compact Cube timer counts down, pauses, and preserves the chime.
- Refresh restores the current Flow, Task, Step, and progress from browser storage.
