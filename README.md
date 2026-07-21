# Shufflow
Shufflow is an AI-native, ADHD-friendly productivity app that helps users stay productive even when attention shifts.

- **Track:** Work & Productivity
- **Demo:** [Live application URL]
- **Demo video:** [Public YouTube URL]
- **Devpost submission:** [Devpost URL]

## Overview

Most productivity tools assume that users select one task, remain focused, and finish it before moving on. Shufflow is designed for a different reality: attention changes, interruptions happen, and people often need to restart to unfinished tasks.

Shufflow breaks complex work into connected steps, preserves task context, and recommends a relevant next action based on factors such as available time, energy, priority, and difficulty.

When a user returns to an interrupted task, Shufflow restores the relevant context so they can continue without reconstructing their previous thought process.

## The problem

Our research identified three recurring difficulties among adults with diagnosed ADHD or strong ADHD indicators:

1. Getting start
2. Restarting after distraction or interruption
3. Maintaining context across multi-step work

Traditional task managers are effective at storing tasks, but they offer limited support during these moments of transition.

Shufflow treats switching and returning as first-class parts of the productivity experience.

## Core features

- AI-assisted breakdown of complex work into manageable steps
- AI-assisted context-aware recommendations for what to do next
- Context preservation across task switches
- Summaries of completed and upcoming work
- Time-aware chimes that support time awareness
- A clean, low-distraction interface and a fidget-inspired interaction system

## OpenAI Build Week contribution

Shufflow is a pre-existing project originally started on September 20, 2025. The original prototype, preliminary user research, and baseline task-management workflow existed before the Build Week submission period.
For OpenAI Build Week, we used GPT-5.6 and Codex to create a substantially new fidget-inspired interaction layer designed around ADHD-friendly task transitions.

### Existing before Build Week

The following existed before the submission period:

- Original Shufflow product concept
- Initial task-management workflow
- Task breakdown, recommendation, and summarisation features
- Preliminary interface and working prototype
- Two rounds of user interviews
- Initial usability survey

### Built during Build Week

The following work was completed during the submission period:

- **[Interaction name]:** [Explain what the user does and how it supports starting, switching, or returning.]
- **[Interaction name]:** [Explain the visible behavior and the problem it addresses.]
- **[Interaction name]:** [Explain the visible behavior and its connection to the user research.]
- **[Technical component]:** [Identify the new component, state logic, animation, accessibility work, or integration.]
- **[Testing work]:** [Identify tests, evaluation, debugging, or performance improvements completed with Codex.]

Evidence of this work is available through:

- **Build Week commit range:** [Link to dated commits]
- **Primary Codex Session ID:** [Session ID obtained through `/feedback`]
- **New or substantially changed files:** [List important files or directories]
- **Before-and-after documentation:** [Link or repository path]

## Why fidget-inspired interaction?

During user interviews, participants described using physical fidget objects as part of their daily routines. This led us to examine the interaction principles behind those objects, including immediacy, repetition, low-friction movement, and sensory feedback.

Our goal was not to place a decorative digital toy inside a productivity app. We wanted to translate useful interaction qualities into actions that could reduce the effort required to begin, switch, and resume work.

Every new interaction was evaluated against one question:

> Does this make it easier to take the next meaningful action without becoming another distraction?

## How GPT-5.6 and Codex were used

GPT-5.6 and Codex played distinct but complementary roles.

### GPT-5.6: research and design coordination

We used GPT-5.6 to:

- Organize background research about common categories of fidget interaction
- Explore the behavioral principles behind different interactions
- Connect those principles to specific stages of the Shufflow user journey
- Compare possible interaction approaches
- Convert qualitative ideas into structured product requirements
- Improve prompts and implementation specifications for Codex

GPT-5.6 helped us broaden and structure the solution space. The founding team reviewed its outputs and decided which ideas were appropriate for Shufflow.

### Codex: engineering implementation

We used Codex to:

- Translate product requirements into implementation steps
- Understand and navigate the existing codebase
- Build the new interaction components
- Connect the new interface to existing task and context state
- Diagnose and resolve implementation issues
- Refine responsive behavior and accessibility
- Create or improve tests
- Document the new functionality

Codex substantially shortened the path from a user-research insight to a working product experience. Work that would normally require repeated handoffs between product design and engineering could be explored and implemented within the same development cycle.

### Decisions retained by the team

Our team remained responsible for the key decisions:

- Supporting intentional switching instead of enforcing continuous focus
- Preserving context before recommending a different task
- Translating fidget principles rather than copying physical objects literally
- Avoiding interactions that increased visual or cognitive noise
- Keeping the user in control of every AI recommendation
- Selecting which generated suggestions and code changes to accept
- Reviewing the final implementation for product fit and technical quality

Our CTO, Liwen Gao, directed the technical implementation and reviewed the code produced or modified with Codex.

## Key product decisions

| Decision | Reason |
|---|---|
| Treat task-switching as a supported transition | Switching can preserve momentum when it is deliberate and context is retained. |
| Prioritize returnability | Users should not need to reconstruct their previous thinking after an interruption. |
| Recommend, rather than automatically switch | The user should remain in control of their workflow. |
| Keep interactions purposeful | A fidget-inspired interface should support action rather than become another distraction. |
| Prefer a few clear actions | Early feedback showed that simplicity mattered more than feature quantity. |

## User research and validation

We conducted two rounds of research with 15 adults with diagnosed ADHD or strong ADHD indicators.

The baseline prototype later received 25 usability-survey responses and achieved a System Usability Scale score of 82.7. Participants particularly valued the shuffle function, AI-assisted task breakdown, and context recovery.

This score relates to **[identify the tested prototype version and date]**. It is an early usability signal and should not be interpreted as clinical evidence or as validation of functionality added after that test.

## Technology

### Current stack

- **Frontend:** [React/Vite/Next.js/other]
- **Language:** [TypeScript/JavaScript/other]
- **Styling and components:** [Tailwind CSS/shadcn/ui/other]
- **Backend:** [Supabase/Node.js/other]
- **Database:** [Supabase/PostgreSQL/other]
- **Authentication:** [Provider]
- **AI services:** [List the runtime AI services and models]
- **Development tools:** GPT-5.6, Codex, Google AI Studio, and Lovable

Development tools are listed separately from runtime services. GPT-5.6 or Codex should not be described as powering the deployed application unless they are actually called at runtime.

## Local setup

### Prerequisites

Install:

- Node.js [required version, preferably from `.nvmrc`]
- npm [required version]
- Git
- Accounts or credentials for [required external services]

### 1. Clone the repository

```bash
git clone [REPOSITORY_URL]
cd shufflow
```

### 2. Install dependencies

```bash
npm install
```

Use `npm ci` instead when installing directly from a committed lockfile:

```bash
npm ci
```

### 3. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Add the required values:

```dotenv
[PUBLIC_BACKEND_URL]=
[PUBLIC_ANON_KEY]=
[SERVER_SIDE_AI_API_KEY]=
```

See `.env.example` for the authoritative list.

Never commit `.env.local` or expose a secret API key through a browser-accessible environment variable. OpenAI and other secret keys must remain on the server.

### 4. Start the development application

```bash
npm run dev
```

Open the local address displayed in the terminal, normally:

```text
http://localhost:5173
```

### 5. Create a production build

```bash
npm run build
```

### 6. Preview the production build

```bash
npm run preview
```

### 7. Run tests

```bash
npm test
```

If the repository uses a different test command, replace this with the exact command from `package.json`.

## Sample data and judging instructions

### Recommended judge experience

The easiest way to evaluate Shufflow is through:

- **Live demo:** [URL]
- **Test email:** [Judging account]
- **Test password:** [Judging password]

The test account should remain free and accessible until the judging period ends.

### Local sample data

[Choose one and delete the other.]

**Option A — automated seed data**

```bash
npm run seed
```

Then sign in using:

```text
Email: [local test email]
Password: [local test password]
```

**Option B — manual sample scenario**

Create a project named `Prepare Build Week submission` with these tasks:

1. Finalize the project description
2. Capture the new interaction demo
3. Verify repository instructions
4. Review the three-minute video
5. Submit the project on Devpost

Assign different priorities, durations, energy levels, and difficulty levels. Start the first task, switch using the new fidget-inspired interaction, and then return to demonstrate context recovery.

### Suggested judging flow

1. Open the sample project.
2. Select or begin a task.
3. Use **[new interaction name]** to indicate that you are stuck or want to switch.
4. Review the AI-recommended next action.
5. Switch to the recommended task.
6. Return to the original task.
7. Observe how Shufflow restores the relevant context.
8. Review the completed and upcoming-work summary.

Expected evaluation time: approximately [number] minutes.

## Project structure

```text
[Replace this tree with the real repository structure.]

src/
├── components/       Reusable interface components
├── features/         Product features and workflows
├── pages/            Application screens
├── services/         AI and backend integrations
├── hooks/            Shared application hooks
├── lib/              Utilities and configuration
└── test/             Automated tests
```

## Known limitations

- The current usability results apply to an early prototype and a limited sample.
- The new fidget-inspired interactions require further testing with a broader group.
- AI recommendations may occasionally require user correction.
- Shufflow is a productivity product and is not a diagnostic or medical-treatment tool.
- [Add current technical limitation.]
- [Add current platform or browser limitation.]

## What we learned

Powerful AI is not enough by itself. The most useful features began with a real user problem and a clear understanding of the moment when assistance was needed.

We also learned that returnability is a core product property. A productivity tool should not only help someone start; it should make it easy to resume after attention moves elsewhere.

Finally, the smallest interaction details can have the greatest effect. Reducing visual noise and presenting a few clear actions often improves the experience more than adding additional features.

## What’s next

We are onboarding early testers and plan to:

- Evaluate the new fidget-inspired interactions
- Measure time to next action and time to resume
- Improve task recommendation transparency
- Expand accessibility testing
- Develop a user-ready release over the next two months

## Team

- **Tianhui [surname] — Cofounder:** [Role]
- **Liwen Gao — CTO:** Technical development and code review
- **[Team member] — [Role]**

## License and third-party materials

Project license: [Link to `LICENSE` or state the applicable terms]

Third-party libraries, assets, APIs, and datasets are used according to their respective licenses and terms. See [dependency or attribution file] for details.
