# PASSETS

An IELTS speaking and writing workspace that turns sentence practice into reusable vocabulary assets. Built with HTML, CSS, native JavaScript and Lucide icons. Guest practice needs no build step, package installation or application framework. Optional account synchronization uses the separate Node.js API documented in [server/README.md](server/README.md).

**Live site:** https://jerryyy-hu.github.io/passets/

## Run

Open `index.html` directly in a modern browser. An internet connection is needed for CDN assets and AI requests. For a stable storage origin and microphone support, use the hosted HTTPS site or a local static server:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Then open http://127.0.0.1:4173. Browser storage is scoped to the origin; moving between a local file, localhost and GitHub Pages does not automatically transfer practice data. Export and import a backup to move data.

## Connect an AI provider

Open the settings button in the upper-right corner. Defaults:

| Setting | Default |
| --- | --- |
| Base URL | `https://api.deepseek.com/v1` |
| Model | `deepseek-flash` |
| API Key | Empty; enter your own key in the browser |

Click **Test connection**, then **Save settings**. An endpoint ending in `/chat/completions` is accepted as well. Remote providers must use HTTPS and support browser CORS requests, OpenAI-compatible chat completions and JSON object output. Local HTTP endpoints are accepted on loopback addresses.

API requests are sent directly to the configured provider. Keys are stored in the browser's localStorage, never embedded in the source or exported backups. This is a personal frontend application: localStorage is not an encrypted secret vault. AI output is rendered as escaped text, never evaluated as code or HTML. CDN scripts execute within the page, as with other CDN-based frontends.

## Practice workflow

- **Home and focus:** the homepage provides one entry into practice, mode selection and a compact progress summary. Practice uses a centered, single-column surface for the current question, answer and review. Topic and strategy controls live in a slide-out preferences panel. Returning home pauses the timer and preserves the draft; entering practice resumes an unfinished answer or draws a fresh random question. On narrow screens, focusing the answer opens a compact viewport-aware layout that keeps the question and input above the software keyboard. Browser Back/Forward and direct `#practice` links are supported.
- **Appearance:** the upper-right theme picker offers Paper, Sage, Mist, Dusk and Graphite, each with separate day and night palettes. The adjacent sun/moon button changes appearance; selected controls and saved words have distinct semantic colors. The choice persists across reloads and applies to the entire workspace, feedback and dialogs. Switching themes preserves the active answer element and its text selection. Existing light/dark preferences remain compatible.
- **Motion:** a sliding indicator follows Writing/Speaking selection; preferences, vocabulary and history slide in from the right. Theme choices and page navigation use brief transitions. Functional reading and typing surfaces remain stable. Pointer-driven entries take about 360 ms with deceleration, exits about 300–320 ms with acceleration, and mode indicators 380 ms; keyboard actions update immediately.
- **Question bank:** 72 curated questions across six topics, plus AI additions saved into the bank. New practice draws randomly and excludes completed question keys across modes. The bank browser marks completed items; review mode explicitly reuses prior material. AI authoring is an explicit action, rather than a background requirement for ordinary bank draws.
- **Custom selects:** topics, strategy, new/review selection and vocabulary sorting use web popovers with pointer feedback, arrows, Home/End, Enter, Escape and type-ahead selection. Native select UI is hidden.
- **Writing:** a 90-second wall-clock timer, browser spell-check and live word/character counts. **Speaking:** a 20-second timer and Web Speech API dictation, when supported by the browser. The first focus or input starts the timer; pause and reset are available. Reaching zero gives a visual warning and an optional sound without discarding or submitting the answer.
- Choose one of six fixed topics or supply a custom topic. Modes and topics retain separate unfinished questions and drafts in the shared active queue.
- **AI authoring strategies:** **A — Consolidate:** use one or two saved vocabulary terms. **B — Expand:** exclude all saved terms from the reference and introduce new collocations. **C — Mix:** use a saved term plus at least one new collocation; an empty bank starts with new vocabulary. AI-generated questions are validated against these constraints before entering the queue.
- When the current topic/mode/strategy has at most one unfinished question, prefetch one more in the background. Requests are deduplicated per practice context. Errors are visible and retryable; failed questions are not inserted and provider errors never become invented AI feedback.
- Self-assessed answers can subsequently receive AI grading, including from archived history, without discarding the answer or self-rating. Submit with the button, **Ctrl+Enter**, or **Cmd+Enter**. AI returns validated half-band scores, target-use feedback, an upgraded sentence, specific grammar corrections and vocabulary suggestions. A single-sentence band estimate is educational feedback, not an official IELTS score.
- Without an API key, curated local questions and self-assessment are available. Local material is finite and is never relabelled as AI output. Creating new custom-topic material or authoring new bank-constrained questions requires an AI provider; matching saved terms can also draw from existing bank material. The app reports local question exhaustion instead of silently repeating completed work.
- After AI review, click **Complete and next** to archive. For self-review, first choose a rating, then complete. Archiving immediately removes the attempt from `activeQueue` and adds the answer, feedback, upgraded/reference sentence and completion timestamp to `historyQueue` in one persistent state update.
- History can start a fresh attempt at the front of the queue. The previous completed attempt remains available, with an independent ID and unchanged answer.

## Vocabulary assets

Click an accented vocabulary capsule in hints or review. Entries include `id`, `word`, `pos`, `def`, `example` and `createdAt`; clicking a saved capsule again removes it. Matching is case-insensitive and all visible saved indicators update together. Removal timestamps also synchronize across accounts to prevent stale devices restoring a deleted term. Missing definitions/examples are completed asynchronously with AI. If unavailable, the word remains saved with a visible retry state.

The vocabulary drawer supports live search, newest-first/A–Z sorting and targeted practice. Targeted generation puts a fresh question at the front while retaining the existing draft. Backups contain questions, completed attempts, vocabulary and preferences. The homepage journal opens the original answer, self-rating, AI scores, corrections and suggested vocabulary. Import merges by ID without overwriting existing unfinished answers. API settings are excluded.

## Word-level comparison

`core.js` implements dynamic-programming LCS. Longest matching preset collocations are tokenized as atomic phrases, including hyphenated terms. Remaining differences are individual words, never a whole-sentence replacement blob. Identical tokens are green, removed content words are red and struck through, replacement content words use the theme accent and are clickable. Function words and punctuation remain visible in neutral styling for grammatical context but are excluded from the replacement vocabulary bank.

## Persistence and accessibility

Guest practice state uses `passets.workspace.v1`; API settings use `passets.settings.v1`. Account synchronization is currently disabled and its entry is hidden. Current completion tracking applies to this browser's stored profile. The deferred account implementation has isolated `passets.account.<id>.v1` caches and an encrypted GitHub file-store API; it needs a configured and verified host, API origin, repository credential and encryption key before activation. See [the deployment guide](server/README.md). Guest import is an explicit choice in that implementation.

Legacy practice records migrate without losing drafts or history. Draft input, current queue position, hints, review, self-rating and timer deadlines are saved as they change. Refresh restores the same attempt, including reviewed-but-not-yet-archived work. Concurrent tabs synchronize storage updates. Storage failures are reported instead of being presented as successful saves.

Drawers/settings use native modal dialogs with browser focus trapping and Escape support. Theme choices use a native popover with light dismissal. The UI includes five themes with day/night palettes, semantic labels, safe-area padding, dynamic viewport units, 16px mobile inputs, touch press feedback and capability-gated hover styles.

Web Speech API availability, microphone permissions and recognition services depend on the browser/device. Real-phone verification is still needed for microphone behavior, software keyboards, safe-area rendering and touch feel; desktop viewport emulation cannot establish those properties.

## Verification

Core tests use only built-in Node modules:

```sh
node --check core.js
node --check app.js
node --test tests/core.test.cjs tests/account.test.mjs
```

Browser checks use an existing Playwright installation and Microsoft Edge. They do not install dependencies or browsers and never use a production API key:

```sh
# Start a static server first. The default test URL is http://127.0.0.1:4173.
node tests/browser.test.cjs /absolute/path/to/playwright
node tests/refinements.test.cjs /absolute/path/to/playwright
```

Set `PASSETS_URL` to test a different local server or the deployed site. Tests cover homepage entry, browser navigation, timer pausing, reload recovery, archiving, repractice, independent mode drafts, vocabulary deduplication/search/sort, custom topics, targeted generation, API error recovery, keyboard submission and all five persistent themes without replacing the answer or cursor. Geometry checks cover 320, 390, 600, 768, 1024 and 1440 pixel widths. Mocked API tests exercise frontend behavior without claiming provider reliability. Screenshots/results are written to ignored `.local/`.

GitHub Actions runs JavaScript syntax checks and the dependency-free core suite. GitHub Pages serves the repository root on `main`; `.nojekyll` avoids processing the static application.

## Files

| File | Responsibility |
| --- | --- |
| `index.html` | Application shell and native dialogs |
| `styles.css` | Visual system, responsive layouts and motion |
| `core.js` | Queues, validation, local questions, tokenization and LCS |
| `app.js` | UI, AI requests, persistence, timers, dictation and vocabulary |
| `question-bank.js` | Curated sentence bank additions |
| `ui.js` | Custom selectors and mobile keyboard viewport |
| `cloud.js` / `cloud-config.js` | Account isolation, synchronization and public API location |
| `api/` / `server/` | Account API and encrypted GitHub file storage |
| `tests/` | Domain and browser verification |

Reference research included [jsdiff](https://github.com/kpdecker/jsdiff). PASSETS implements its own LCS/tokenization and does not import jsdiff or other application dependencies.

The default refinement suite exercises all ten theme/appearance combinations, the compact keyboard layout, archived AI grading and backup compatibility. Optional account-browser scenarios require `PASSETS_TEST_ACCOUNTS=1`; they are work in progress and not an activation check. Physical phone keyboard, browser panning, microphone and touch behavior still need real-device verification.
