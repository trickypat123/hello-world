# Exam Practice

A free, offline-capable past-exam practice tool. No build step, no server, no account —
open `index.html` in a browser (or serve the folder with any static server). Progress is
stored in your browser's localStorage.

## Features

- **Exam library** – search/filter by subject, year and type; best score shown on each card.
- **Sit a paper your way**
  - *Practice*: stopwatch + a **Check answer** button after every question (per part), revealing the answer and worked solution.
  - *Timed practice*: countdown + check as you go.
  - *Exam conditions*: reading time then writing time, no answers shown until you finish, auto-submit when time is up.
  - Fully customisable: timer mode, reading/writing minutes, shuffle, topic filter, MCQ-only / written-only, or just one question.
- **Answer checking** – multiple choice is auto-marked; written answers are auto-matched against accepted answers, otherwise you compare with the model answer and **self-mark** (0…n).
- **Session tools** – question navigator (answered / correct / wrong / flagged), flag for review, pause, per-question time tracking, per-question notes, keyboard shortcuts (← → , F, Ctrl+Enter).
- **Results** – score, time, average time per question, topic breakdown, per-question table, full review with solutions, "retry incorrect".
- **Progress dashboard** – overall %, study time, streak, 14-day activity, topic performance, history, one-click **practise my mistakes** and **drill weakest topic**.
- **Topic practice** – mix questions from every paper by subject/topic (all / not yet attempted / previous mistakes).
- **Bookmarks**, dark mode, LaTeX maths (KaTeX), backup/restore of all data.
- **Import your own papers** as JSON.

## Adding a real past paper (e.g. 2022 Specialist Tech-Free Exam A)

The bundled papers are **original samples**; real VCAA/publisher papers are copyrighted, so they
are not included. Add the ones you have legitimately obtained:

1. Open **Manage → Import exam**, paste JSON (or choose a `.json` file), click **Import**.
2. The format is in [`exams/template.json`](exams/template.json). Tip: paste the paper and
   solutions into an AI assistant and ask it to convert them to that format.

Format summary:

| Field | Notes |
| --- | --- |
| exam: `id, title, subject, year, type, readingMin, writingMin, instructions, questions[]` | `id` must be unique |
| question: `number, topic, text, marks, parts[]` | `text` is the stem |
| MCQ | `options: [...]`, `answer: 0-based index or "A"`, `solution` |
| written | `answer` (shown), `accept: [...]` (strings that auto-mark correct), `solution`, `marks` |
| parts | `parts: [{label, text, marks, answer, accept, solution}]` instead of putting them on the question |

Maths uses `$inline$` and `$$display$$` LaTeX (KaTeX is loaded from a CDN; without internet the raw LaTeX shows).
