# ActiveLearn — Setup Guide

Set this up in under 5 minutes. No terminal. No code.

---

## Step 1 — Create a Claude Project

Go to [claude.ai](https://claude.ai), click **Projects**, then **New Project**.
Name it something like "ActiveLearn — Molecular Biology" (or whatever subject you're studying).

---

## Step 2 — Paste the system prompt

Open the project. Click **Edit project instructions** (or the pencil icon near the top).
Open `activelearn-system-prompt.md`, select all the text below the header line, and paste it in.
Save.

---

## Step 3 — Upload your course materials

In the Project's **Files** section, upload:
- Lecture slides (PDF — must be text-layer, not scanned images)
- Typed notes (markdown, .txt, .docx)
- Course syllabus
- Past exam papers

You don't need everything. Start with one lecture's worth.

---

## Step 4 — Map your first topic

Start a conversation in the Project. Say:

> Map this

ActiveLearn will read your uploaded files, extract all the concepts and their relationships, and show you a summary to review. Edit anything that looks off, then confirm.

It will output a `graph-{topic}.json` file. Upload that to the Project's Files section too.

---

## Step 5 — Start learning

Say "teach me [concept name]" to begin a Socratic session on any concept.

---

## State file — how it works

ActiveLearn tracks your mastery across sessions using a file called `activelearn-state.json`.

**First session:** Say "first session" — ActiveLearn will initialize your state.

**At the end of every session:** ActiveLearn outputs your updated state as a JSON block. Copy it and save it as `activelearn-state.json` on your computer.

**At the start of every session:** Paste the contents of `activelearn-state.json` into the chat. ActiveLearn will load your progress automatically.

That's it. Think of it like a save file.

---

## Commands cheat sheet

| Say this | What happens |
|----------|-------------|
| `map this` (with files uploaded) | Build concept graph from your notes |
| `teach me [concept]` | Socratic teaching session |
| `review` | Spaced repetition review of what's due |
| `show my progress` | Progress report across all topics |
| `what can I learn next?` | List newly unlocked concepts |
| `end session` | Export your updated state file |

---

## Sharing with classmates

Send them this folder (or just the two files: `activelearn-system-prompt.md` and `setup-guide.md`).
They follow the same steps. Their state file is separate from yours.

---

## Troubleshooting

**"I can't extract text from this PDF"** — Your PDF is a scanned image. Export it from the original slides (File → Export as PDF) or use Google Drive to convert it (upload the PDF, right-click → Open with Google Docs).

**"I couldn't parse that state"** — Your JSON got corrupted (usually from a partial copy). Start fresh and say "first session" — you'll rebuild from the new session's progress.

**"I don't have [X] in your concept map"** — Either run "map this" on notes that cover that concept, or ask ActiveLearn to add it manually.
