# Shufflow
Shufflow is an AI-native, ADHD-friendly productivity app that helps users stay productive even when attention shifts.

- **Track:** Work & Productivity
- **Demo:** [Live application URL]
- **Demo video:** [Public YouTube URL]
- **Devpost submission:** [Devpost URL]

## Overview

Most productivity tools assume that users select one task, remain focused, and finish it before moving on. Shufflow is designed for a different reality: attention changes, interruptions happen, and people often need to return to unfinished tasks.

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
- AI-assisted task breakdown workflow
- Task recommendation and prioritisation logic
- Context preservation concept for interrupted tasks
- Initial web prototype

### Built during Build Week

The following work was completed during the submission period:
- Flow Cube interaction system: Created a fidget-inspired spatial interaction model that represents a user's current workflow state as a manipulable object. Users can interact with the cube to navigate between tasks while maintaining awareness of their current progress and context.

- Swipe-based task transition interaction: Implemented directional gestures where users intentionally swipe right to shuffle to a recommended next task and swipe left to return to the previous task. This reduces accidental switching and keeps the user in control of transitions.

- Adaptive timer and visual feedback system: Redesigned the timer and interaction feedback to remain visible while avoiding interference with task names, step names, and essential workflow information.


## Why fidget-inspired interaction?

During user interviews, participants described using physical fidget objects as part of their daily routines. This led us to investigate interaction principles behind these objects, including:
- Immediate physical feedback
- Simple repetitive actions
- Low cognitive demand
- Small moments of engagement
- Sensory cues that support transitions

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


## Technology

### Current stack

- **Frontend:** React 19, TanStack Start, TanStack Router, Vite 7
- **Language:** TypeScript
- **Styling and components:** Tailwind CSS 4, shadcn/ui-style components, Radix UI, Lucide React, custom CSS 3D animations
- **Backend:** TanStack Start server functions running through Nitro/Cloudflare Workers
- **AI services:** Lovable AI Gateway with google/gemini-3-flash-preview
- **Development tools:** GPT-5.6, Codex, Google AI Studio, and Lovable
