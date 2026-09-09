// Shared flashcards logic — pure functions, no React/Supabase here, so the
// interval/cloze behavior is easy to reason about and reuse between the
// practice engine, the library view, and (eventually) tests.

/* ============================================================
   Cloze parsing
   Syntax: {{c::hidden text}} or {{c::hidden text::hint}} — any number of
   blanks per card, all hidden/revealed together as a single card (no
   Anki-style per-cluster auto-splitting). The optional hint (after a
   second "::") shows in place of the answer while the card is still
   masked — e.g. {{c::mitral::valve type}} shows "[valve type]", not the
   answer, until revealed.
   ============================================================ */

const CLOZE_RE = /\{\{c::(.*?)\}\}/g;

// Splits cloze_text into an array of segments: plain text stays as
// { text }, blanks become { blank: true, text, hint }. Used to render
// both the "front" (blanks masked, hint shown if present) and "back"
// (blanks revealed) states from one source string.
export function parseCloze(clozeText) {
  const segments = [];
  let lastIndex = 0;
  let match;
  CLOZE_RE.lastIndex = 0;
  while ((match = CLOZE_RE.exec(clozeText || "")) !== null) {
    if (match.index > lastIndex) segments.push({ text: clozeText.slice(lastIndex, match.index) });
    const [text, hint] = match[1].split("::");
    segments.push({ blank: true, text, hint: hint || null });
    lastIndex = CLOZE_RE.lastIndex;
  }
  if (lastIndex < (clozeText || "").length) segments.push({ text: clozeText.slice(lastIndex) });
  return segments;
}

export function clozeHasBlanks(clozeText) {
  CLOZE_RE.lastIndex = 0;
  return CLOZE_RE.test(clozeText || "");
}

/* ============================================================
   Re-show interval engine (session-relative, internal only — never
   shown to the user as a visible countdown/timer).

   Again: 1 -> 3 -> 7 -> 15 min, caps at 15 on further repeats
   Hard:  5 -> 10 -> 18 min, caps at 18 on further repeats
   Normal: flat 10 min every time
   Easy: card exits the session (no re-show)
   ============================================================ */

const AGAIN_STEPS_MIN = [1, 3, 7, 15];
const HARD_STEPS_MIN = [5, 10, 18];
const NORMAL_MIN = 10;

function stepMinutes(steps, streak) {
  const idx = Math.min(streak, steps.length - 1);
  return steps[idx];
}

// Advances one card's state after a rating. `state` is this card's entry
// from flashcard_sessions.card_state (or a fresh default if never seen).
// Returns the updated entry — caller is responsible for persisting the
// whole card_state array back to Supabase.
export function rateCard(state, label, now = new Date()) {
  const next = {
    card_id: state.card_id,
    label,
    shown_count: (state.shown_count || 0) + 1,
    again_streak: state.again_streak || 0,
    hard_streak: state.hard_streak || 0,
    due_at: null,
  };

  if (label === "easy") {
    next.again_streak = 0;
    next.hard_streak = 0;
    return next;
  }

  if (label === "again") {
    next.again_streak = (state.again_streak || 0) + 1;
    next.hard_streak = 0;
    const mins = stepMinutes(AGAIN_STEPS_MIN, next.again_streak - 1);
    next.due_at = new Date(now.getTime() + mins * 60000).toISOString();
    return next;
  }

  if (label === "hard") {
    next.hard_streak = (state.hard_streak || 0) + 1;
    next.again_streak = 0;
    const mins = stepMinutes(HARD_STEPS_MIN, next.hard_streak - 1);
    next.due_at = new Date(now.getTime() + mins * 60000).toISOString();
    return next;
  }

  // normal
  next.again_streak = 0;
  next.hard_streak = 0;
  next.due_at = new Date(now.getTime() + NORMAL_MIN * 60000).toISOString();
  return next;
}

export function isCardActive(entry) {
  return entry.label !== "easy";
}

// Among still-active cards, which one is due right now (or has never
// been shown yet)? Never-shown cards always take priority over re-shows,
// then earliest due_at first.
export function nextDueCard(cardState, now = new Date()) {
  const active = cardState.filter(isCardActive);
  const unseen = active.filter((c) => !c.shown_count);
  if (unseen.length) return unseen[0];
  const due = active
    .filter((c) => c.due_at && new Date(c.due_at) <= now)
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
  return due[0] || null;
}

// When nothing is due, when's the soonest it will be?
export function nextDueTime(cardState) {
  const active = cardState.filter(isCardActive).filter((c) => c.due_at);
  if (!active.length) return null;
  return active.reduce((min, c) => (!min || new Date(c.due_at) < new Date(min) ? c.due_at : min), null);
}

export function sessionIsComplete(cardState) {
  return cardState.length > 0 && cardState.every((c) => !isCardActive(c));
}

export function defaultCardEntry(cardId) {
  return { card_id: cardId, label: null, shown_count: 0, again_streak: 0, hard_streak: 0, due_at: null };
}
