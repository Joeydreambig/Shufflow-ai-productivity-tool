# Shufflow

Shufflow is an ADHD-first focus prototype built around one persistent object system:

**Flow Cube → Task Piece → AI-generated Steps → Focus Session**

Flows are represented as Cubes, tasks as solid or transparent Pieces, and Steps remain the practical execution layer. In Run mode, the current Step can be swiped right to complete or left to skip, while a compact Cube visualizes the remaining focus time.

## Live demo

[Open the published Shufflow demo](https://shufflow-flow-cube-demo.ththz.chatgpt.site/?demo=true)

Append `&reset=1` to reset the prepared Demo Mode data in your browser.

## Core capabilities

- Rotate the standalone Home Cube to enter a Flow, with an accessible button fallback.
- Create, select, and persistently rename Flow Cubes.
- Create tasks from transparent Pieces and edit existing solid Task Pieces.
- Generate structured GPT-4.1 task breakdowns with editable Steps.
- Add, edit, reorder, delete, complete, and estimate time for Steps.
- Focus on one current Step with a Cube countdown, pause, duration controls, and chime.
- Swipe a Step right to complete it or left to skip it without deleting it.
- Swipe the Run surface right for the next recommended task or left for the previous task.
- Save session history and restore exact Task and Step context.
- Persist Flows, tasks, Steps, progress, settings, and sessions in browser storage.

## Technology

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Vite and Nitro
- Zustand persistence
- Zod-validated GPT-4.1 structured responses
- dnd-kit Step reordering
- CSS 3D Cube and Piece interactions
- Cloudflare-compatible production output

## Run locally

Requirements:

- [Bun](https://bun.sh/) (recommended) or Node.js 20+
- An OpenAI API key only when testing live AI features

```bash
git clone https://github.com/YOUR-USERNAME/shufflow.git
cd shufflow
bun install --frozen-lockfile
cp .env.example .env
bun run dev
```

Open the local URL printed by Vite. The real `.env` file is ignored by Git and must never be committed.

Node/npm can also run the project:

```bash
npm install
npm run dev
```

## AI configuration

The server checks these variables in order:

1. `OPENAI_API_KEY` — calls OpenAI directly with `gpt-4.1`.
2. `LOVABLE_API_KEY` — calls the Lovable AI gateway with `openai/gpt-4.1`.

Copy `.env.example` to `.env` and set one value. These are server secrets: do not prefix them with `VITE_`, expose them in client code, or commit them.

Without a configured key, ordinary live-AI requests use the existing error/fallback handling. The prepared Demo Mode breakdown is deterministic and does not require an API key.

## Demo Mode

Start the app on port 4188:

```bash
bun run dev -- --host 127.0.0.1 --port 4188
bun run demo:reset
```

Open the reset URL printed by the second command. Demo Mode backs up the normal local dataset before loading the prepared `Finish PhD thesis chapter` Flow. Restore that backup with:

```text
http://127.0.0.1:4188/?demo=restore
```

Demo and normal data are stored in the current browser's `localStorage`; this repository does not include a database or user account system.

## Validate before publishing

```bash
bun run typecheck
bun run lint
bun run build
```

GitHub Actions runs these checks for every pull request and every push to `main`.

## Production deployment

Cloudflare Workers is the prepared standalone hosting target:

```bash
npx wrangler login
bun run deploy:cloudflare
```

Add the AI key as a server-side Worker secret when live AI is required:

```bash
npx wrangler secret put OPENAI_API_KEY --name shufflow-demo
```

See [Deployment](docs/deployment.md) for output details and [GitHub repository guide](docs/github-repository-guide.md) for the exact upload checklist.

## Project documentation

- [GitHub repository guide](docs/github-repository-guide.md)
- [Three-minute demo script](docs/demo-script-3min.md)
- [Demo recording guide](docs/demo-recording-guide.md)
- [Demo QA checklist](docs/demo-qa-checklist.md)
- [Deployment guide](docs/deployment.md)

## License

No open-source license is included yet. Before inviting reuse or contributions, choose a license and add a `LICENSE` file. A public GitHub repository without a license remains viewable, but reuse rights are not granted automatically.
