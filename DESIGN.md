# Design System — ActiveLearn

## Product Context
- **What this is:** An AI-powered spaced repetition and concept mapping tool. Claude connects via MCP, tracks your mastery across concepts, and adapts its teaching to your knowledge graph in real time.
- **Who it's for:** Developers and technical learners who want deep, durable understanding — not gamified drills.
- **Space/industry:** Developer tools / edtech. Closest peers: Anki (repetition), Obsidian (knowledge graph), Readwise (contextual review). Distinguished from all of them by the MCP integration and concept-map-first view.
- **Project type:** Full-stack Next.js web app with an MCP server backend.

---

## 1. Creative North Star: "The Intellectual Atelier"

This design rejects the "SaaS-standard" look of heavy borders and neon accents in favor of a sophisticated, high-density environment that mirrors the focused atmosphere of a modern university archive or a premium editorial workspace. It is rooted in the **Academic Minimalist** aesthetic — where data density is treated as a luxury, not a chore.

The design breaks the traditional template feel by prioritizing **Tonal Layering** over structural lines. Off-whites and bone-greys create a layout that feels carved out of a single piece of fine paper rather than assembled from blocks.

**Subagent design voice (Claude, independent):** *"A research lab that reads its own notes at 3am — warm, obsessive, slightly overclocked."* This is the energy to capture.

**Key differentiator vs. the market:**
- Anki / Duolingo: cold or gamified. Not this.
- Notion / Linear: cold minimal (grayscale). Not this.
- Obsidian / Readwise: blank-canvas / invisible. Not this.
- ActiveLearn: warm + deliberate + technical. That gap is ours.

---

## 2. Colors

The palette is a sophisticated blend of warm neutrals (`#fbf9f1`) and deep, carbon-toned primaries (`#2b2220`). High contrast, easy on the eyes for long-form technical focus.

### The "No-Line" Rule
**Do not use 1px solid borders to define sections.** Define boundaries through background color shifts instead.

- **The Alternative:** Move from `surface` to `surface-container-low` to distinguish sections.
- **Hierarchy:** Importance conveyed through lightness. Top-layer interactive elements use `surface-container-lowest` (#ffffff).
- **Ghost Border Fallback:** If a border is required for accessibility, use `outline-variant` at **15% opacity max**.

### Surface Hierarchy ("Stack of paper" model)
| Layer | Token | Hex | Usage |
|-------|-------|-----|-------|
| Base | `surface` | `#fbf9f1` | Main app background |
| Section | `surface-container` | `#f0eee6` | Large functional areas |
| Content | `surface-container-low` | `#f6f4ec` | Secondary cards, lists |
| Action | `surface-container-lowest` | `#ffffff` | Active cards, inputs, modals, panels |

### Full Token Reference
```
--color-primary:                  #2b2220   (carbon — authority, mastered state)
--color-on-primary:               #ffffff
--color-primary-container:        #413735
--color-surface:                  #fbf9f1   (warm cream — base)
--color-surface-dim:              #dcdad2
--color-surface-bright:           #fbf9f1
--color-surface-container-lowest: #ffffff
--color-surface-container-low:    #f6f4ec
--color-surface-container:        #f0eee6
--color-surface-container-high:   #eae8e0
--color-surface-container-highest:#e4e3db
--color-on-surface:               #1b1c17
--color-on-surface-variant:       #4e4543
--color-outline:                  #807572
--color-outline-variant:          #d1c3c1
--color-secondary:                #5b4ac8   (indigo — partial mastery, focus ring)
--color-secondary-container:      #8e7fff
--color-on-secondary:             #ffffff
--color-error:                    #ba1a1a
```

### Live Accent (Sparingly)
```
--color-live: #00ff94
```
Use ONLY for states where Claude is actively writing to the learning graph — a node being updated in real time, a session in progress. Never as a decorative color. The warmth of the rest of the palette makes this feel electric, not neon. Maximum 5% usage across any screen.

### Grain Texture
Apply a very subtle paper grain over the surface background — 2-3% opacity SVG noise filter. Not visible at a glance; felt subconsciously. The difference between parchment and plastic.

### Glassmorphism (Nodes + Overlays)
- Floating concept map nodes: semi-transparent surface with `backdrop-blur: 12px`
- Ambient shadow: `rgba(27,28,23,0.04)` at 24px blur — not a shadow, a depth glow
- Primary buttons: subtle gradient from `#2b2220` → `#413735` for material depth

---

## 3. Typography

Three-font system. Each has a distinct role. Do not mix roles.

### Font Stack
| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Display / Hero | **Fraunces** (serif) | 700 regular, 300 italic | Landing page hero headlines, course titles in large contexts. Loaded from Google Fonts. |
| UI / Body | **Inter** | 300–600 | All app content, descriptions, form labels, navigation |
| Labels / Data / Code | **Geist Mono** | 400–600 | All uppercase labels, status chips, data values, debug-style metadata, code snippets |

### Why This Stack
- Fraunces: editorial gravitas. No other developer tool uses a display serif — it immediately distinguishes the landing page. Pairs the warm palette with academic authority.
- Inter: reliable, high-legibility at small sizes. Right for dense app UI.
- Geist Mono: the signature of precision. Makes labels feel like instrument readings, not decorative text.

### Scale
```
Display (lg):    Fraunces 52–60px / -0.025em / lh 1.04 — hero headlines
Display (md):    Fraunces 28–36px / -0.02em  / lh 1.1  — course page title
Headline:        Inter    24px    / -0.01em  / lh 1.3  — section headers
Body (lg):       Inter    15px    / 0        / lh 1.7  — landing page copy
Body (md):       Inter    14px    / 0        / lh 1.65 — app content
Body (sm):       Inter    13px    / 0        / lh 1.6  — secondary content
Label (lg):      Geist Mono 11px  / +0.05em  / normal  — data values
Label (sm):      Geist Mono 9-10px / +0.1em  / uppercase, +0.12em — status chips, badges
```

### Signature Typographic Elements
- **Uppercase tracked labels:** `font-family: Geist Mono, monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600`. Used for every badge, category label, and metadata field. Archival feel.
- **Italic Fraunces for contrast:** The display scale mixes weight-700 and weight-300-italic in the same headline (e.g., "Learn what your code *is trying to teach you.*"). The contrast between authority and softness is intentional.

---

## 4. Elevation & Depth (Ambient Tonalism)

No traditional drop shadows. Depth through stacking.

- **The Layering Principle:** A white card (`surface-container-lowest`) on bone-grey (`surface-container-low`) creates natural lift.
- **Ambient Shadows:** For floating elements: `box-shadow: 0 4px 24px rgba(27,28,23,0.04)`. It shouldn't look like a shadow — it should look like depth.
- **Node Glow (Live State):** `box-shadow: 0 0 8px rgba(0,255,148,0.12)`, animated from `0.12` to `0.28` opacity over 3s. Breathing, not pulsing.

---

## 5. Components

### Buttons
- **Primary:** `#2b2220` background, `#ffffff` text. `border-radius: 6px`. Subtle gradient: `linear-gradient(180deg, #2b2220, #413735)`. No shadow.
- **Secondary (Ghost):** `surface-container-lowest` background. Ghost Border: `border: 1px solid rgba(209,195,193,0.25)`. `border-radius: 6px`.
- **Tertiary:** Pure text. Geist Mono, uppercase, tracked. No background.

### Cards & Lists
**No divider lines.** Separate list items with spacing (0.6rem). In tables, alternating `surface-container-low` tints instead of horizontal rules.

### Concept Map Nodes
| State | Style |
|-------|-------|
| Mastered | `#2b2220` background, `#ffffff` text. Carbon fill. |
| Partial | `#ffffff` background, `#5b4ac8` border (1.5px). Indigo ring. |
| Unseen | `#f6f4ec` background, `rgba(128,117,114,0.35)` dashed border (1.5px, dasharray 4 3). |
| Active / Live | `#ffffff` background, `rgba(0,255,148,0.45)` border. Green dot (5px circle, `#00ff94`). Breathing glow animation. |
| Selected | Indigo ring: `box-shadow: 0 0 0 3px rgba(91,74,200,0.3)`. |

Node structure: `border-radius: 6px`. Geist Mono labels inside. Show mastery score + review count inline as metadata.

### Chips (Status Badges)
- **Rectangular** — `border-radius: 2px`. Never pill shape.
- Geist Mono, 9-10px, uppercase, `letter-spacing: 0.1em`, weight 600.
- Mastered: `background: #2b2220; color: #ffffff`
- Partial: `background: rgba(91,74,200,0.12); color: #5b4ac8`
- Unseen: `background: #eae8e0; color: #4e4543; border: 1px dashed rgba(128,117,114,0.35)`
- Live: `background: rgba(0,255,148,0.12); color: #00b368`

### Concept Panel (Right Panel)
**Critical layout rule:** The concept panel opens to the RIGHT of the concept map and is the only scrollable element on the course page. The page itself must NOT scroll vertically.

```
CourseDetailClient layout:
  <div className="flex flex-col h-[calc(100vh-{nav+padding})] overflow-hidden">
    <Tabs className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <TabsContent className="flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-row gap-4 h-full">
          <ConceptMap className="flex-1 min-w-0" />      {/* fills remaining width */}
          <div className="w-96 shrink-0 h-full overflow-y-auto">  {/* scrolls */}
            <ConceptPanel />                              {/* no max-h, no overflow */}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </div>
```

ConceptPanel `aside` element: `h-full` (or no explicit height). Remove `max-h-[50vh]` and `overflow-y-auto` — those belong on the wrapper div, not the component itself. The panel fills the full height of the flex row. Only the wrapper div scrolls.

Panel width: `w-96` (384px). Background: `surface-container-lowest`. `border-radius: 8px`. Ambient shadow: `box-shadow: 0 2px 16px rgba(27,28,23,0.05)`.

The divider between map and panel: no visible border. Use the natural contrast between `surface-container-low` (map background) and `surface-container-lowest` (panel background).

---

## 6. Public Landing Page

The `/` route must be a **public landing page** accessible before authentication. Currently it redirects directly to `/login`, which means no user can understand what the product does or how to set it up before signing in.

**Route change:** `app/page.tsx` should render a landing page component. Authenticated users see a "Go to courses" CTA instead of "Sign in."

### Landing Page Sections (in order)

#### Navigation Bar
- Left: `ActiveLearn` in Fraunces 700, 17px
- Right: mono uppercase nav links (`Docs`, `Sign In` button primary)
- Optional: debug-style session ticker in top-right: `kc_loaded: 47  recall_due: 3  streak: 12d` — shown as a small Geist Mono element with dark background. Functional as marketing: it immediately communicates that this tool has state and memory.
- Height: 56px. `surface` background. Bottom: subtle `rgba(209,195,193,0.2)` line (the one border exception).

#### Hero Section
- **Full-viewport or near-full (min-height: 520px)**
- **Background:** An SVG or canvas rendering of a concept map graph — actual nodes in mastered/partial/unseen/live states, with edges. Not an illustration. Not a screenshot. The product itself, embedded as a background element at 15-20% opacity.
- **Headline (Fraunces 700, 52px, -0.025em):**
  > "Learn what your code"
  > *is trying to teach you.* (weight 300, italic, on-surface-variant color)
- **Subtext (Inter, 15px):** "ActiveLearn connects to Claude via MCP. Every session, Claude tracks what you know, fills the gaps, and schedules review automatically."
- **CTAs:** `[Sign in with GitHub]` (primary button) + `[Download System Prompt]` (ghost/tertiary)
- **Eyebrow above headline:** Geist Mono label in secondary purple — "MCP-Connected Learning"

#### How It Works (3 steps)
Grid of 3 columns. Large number in Fraunces (weight 300, large, `outline-variant` color) anchors each step.

1. **Install the MCP server** — Copy the JSON config block (shown inline in a dark `#2b2220` code block with green highlights for key values)
2. **Load the system prompt** — "Copy System Prompt" button inline
3. **Start a session with Claude** — Explanation of the I-Do/We-Do/You-Do arc

Section background: `surface-container-low`. Top border: `rgba(209,195,193,0.2)`.

#### System Prompt Download
Full-width section. Card with the prompt text preview (truncated, readable), two actions: `[Copy to Clipboard]` and `[Download .txt]`. This must be accessible without authentication.

**The system prompt** should be stored in a public API route or static file: `GET /api/system-prompt` returns the prompt text. The download button hits this endpoint.

#### Features (optional — only if space allows)
4-column grid of brief feature descriptions. No icon circles (AI slop). Just label + 1-2 sentences.
- Spaced repetition
- Concept mapping
- I-Do / We-Do / You-Do arc
- Real-time MCP sync

### Login Page Updates
- Add a back link: "← Back to activelearn.com" below the sign-in button
- Replace "Learning Hub" headline with "Sign in to your learning graph" (Fraunces)
- Add "MCP-Connected Learning" eyebrow (Geist Mono, secondary color)
- Keep GitHub OAuth as the only auth method

---

## 7. Do's and Don'ts

### Do
- Use white space as structure. If a section feels cluttered, increase padding before adding a border.
- Use `surface-container` shifts for hover states in tables and lists.
- Keep typography tight and dense. The "Academic" feel comes from structured, high-density information.
- Use Geist Mono for all data, metadata, labels, and inline code.
- Use `#00ff94` ONLY for live/active states. Never decoratively.
- Use Fraunces for hero headlines and course titles at large sizes. Inter for everything else in the app.

### Don't
- **Don't use 1px solid black or grey lines** to separate content. Use tonal background shifts.
- **Don't use standard blue for links.** Use `secondary` (#5b4ac8) or underlined `primary` text.
- **Don't use rounded corners larger than `8px`** except for full-pill badges. Soft bubbles conflict with the precise, academic nature of this system.
- **Don't add gamification elements** — streaks displayed as achievements, dopamine animations, progress bars with celebration states. This is not Duolingo.
- **Don't use gradients as backgrounds or hero fills.** The concept map graph IS the hero visual.
- **Don't use emojis** in UI text or status labels.
- **Don't use `max-h` on the ConceptPanel aside.** Height is governed by the flex parent.

---

## 8. Spacing & Grid

**4px-base micro-grid. 8px rhythm for component internals. 16-32px for section padding.**

Asymmetrical macro-layout: sidebar metadata can align differently from main content, creating editorial tension. Top-level margins: 3.5rem (56px) for section breathing room.

```
2xs:  2px   — micro gaps (node metadata)
xs:   4px   — tight component gaps
sm:   8px   — component internal padding
md:   16px  — standard component padding
lg:   24px  — section sub-item spacing
xl:   32px  — intra-section spacing
2xl:  48px  — section top/bottom padding
3xl:  56px  — major section padding (landing page)
4xl:  80px  — hero lateral padding
```

---

## 9. Animation & Motion

**Minimal-functional** within the app. **Intentional** on the landing page.

- **Transitions:** `transition-colors` and `transition-opacity` only. No movement except where it communicates meaning.
- **Concept map:** standard React Flow pan/zoom. No choreography.
- **Live node breathing:** `animation: breathe 3s ease-in-out infinite` — opacity of glow from 0.12 → 0.28.
- **Panel open (future):** expand from node rightward — `cubic-bezier(0.16, 1, 0.3, 1)`, 280ms. Map viewport shifts left to keep selected node visible.
- **Duration scale:** micro (50-100ms), short (150-250ms), medium (250-400ms)
- **Easing:** enter = `ease-out`, exit = `ease-in`, move = `ease-in-out`

---

## 10. Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Added Fraunces as display font for landing page + large course titles | Distinguishes from every other dev tool (all grotesque sans). Academic gravitas without pretension. |
| 2026-03-29 | Added Geist Mono as label/data/code font (replacing Inter for those roles) | Labels read as instrument readings, not decorative text. More precise than Inter at small uppercase sizes. |
| 2026-03-29 | Added `#00ff94` live accent for active MCP states | The warmth of the palette makes cold green feel electric, not neon. Subagent recommendation. |
| 2026-03-29 | Landing page hero: embedded concept map graph as background element | Only visual that immediately explains the product. No illustrations, no gradient blobs. Completely different from every competitor's hero. |
| 2026-03-29 | ConceptPanel: remove `max-h-[50vh]`, height governed by flex parent | Panel fills full height. Only the wrapper div scrolls. Page itself does not scroll. |
| 2026-03-29 | Public landing page at `/` — auth flow updated | Previously `/` redirected immediately to `/login`. No user could understand the product before signing in. |
| 2026-03-29 | System prompt accessible without auth (`GET /api/system-prompt`) | Developers should be able to download and evaluate the prompt before committing to GitHub OAuth. |
| 2026-03-29 | Grain texture (2-3% opacity) over surface background | Differentiates warm cream from "Notion clone" feel. Suggests physical paper rather than digital white. |
