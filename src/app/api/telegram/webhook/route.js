import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
  } catch (e) { /* best-effort — a failed confirmation reply shouldn't break the save itself */ }
}

function truncate(s, n) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Telegram already parses URLs out of the message for us (entities), which
// is far more reliable than regex-guessing — it correctly handles
// "text_link" entities too, where the visible text is a label like
// "Anatomy" and the real URL lives in entity.url, not in the text itself.
// A message can carry several distinct links (e.g. one book link per
// subject line), so this returns all of them, not just the first.
function extractLinks(message) {
  const text = message.text || message.caption || "";
  const entities = message.entities || message.caption_entities || [];
  const links = [];
  for (const e of entities) {
    if (e.type === "text_link" && e.url) {
      links.push({ text: text.slice(e.offset, e.offset + e.length) || null, url: e.url });
    } else if (e.type === "url") {
      const url = text.slice(e.offset, e.offset + e.length);
      links.push({ text: url, url });
    }
  }
  if (!links.length) {
    const match = text.match(/https?:\/\/[^\s]+/);
    if (match) links.push({ text: match[0], url: match[0] });
  }
  return links.slice(0, 12);
}
function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return null; }
}

// Splits the message body into alternating text/link segments using
// Telegram's exact entity offsets — so a link lands precisely on the word
// that was actually clickable in the original message (e.g. "Anatomy"),
// instead of the note showing a wall of plain text with a disconnected
// row of link buttons bolted on top. Returns null if there are no links,
// so the client can just render the plain body as before in that case.
function buildBodySegments(message) {
  const text = message.text || message.caption || "";
  const entities = (message.entities || message.caption_entities || [])
    .filter((e) => e.type === "url" || e.type === "text_link")
    .sort((a, b) => a.offset - b.offset);
  if (!entities.length) return null;

  const segments = [];
  let cursor = 0;
  for (const e of entities) {
    if (e.offset < cursor) continue; // overlapping entity, skip rather than corrupt the slice
    if (e.offset > cursor) segments.push({ type: "text", value: text.slice(cursor, e.offset) });
    const label = text.slice(e.offset, e.offset + e.length);
    const url = e.type === "text_link" ? e.url : label;
    segments.push({ type: "link", value: label, url });
    cursor = e.offset + e.length;
  }
  if (cursor < text.length) segments.push({ type: "text", value: text.slice(cursor) });
  return segments;
}

/**
 * POST /api/telegram/webhook — Telegram calls this on every message sent
 * to the bot. Two things can happen:
 *   1. "/start <code>" — the person just tapped the deep link generated
 *      by Notes -> Connect Telegram. Redeems the one-time code and links
 *      this chat_id to their account.
 *   2. Anything else, from an already-linked chat — saved as a note.
 * Always returns 200 quickly, even on internal errors, per Telegram's
 * webhook contract (a non-200 makes it retry the same update repeatedly).
 */
export async function POST(req) {
  // Telegram round-trips the secret set during setWebhook on every call —
  // this is what stops a stranger from POSTing fake updates at this URL
  // and writing notes into arbitrary accounts.
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update;
  try { update = await req.json(); } catch (e) { return NextResponse.json({ ok: true }); }

  const message = update.message;
  if (!message) return NextResponse.json({ ok: true }); // ignore edited_message, callback_query, etc.

  const chatId = message.chat.id;
  const supabase = createAdminClient();
  const text = (message.text || "").trim();

  /* ---------- linking: "/start <code>" ---------- */
  if (text.startsWith("/start")) {
    const code = text.replace("/start", "").trim().toUpperCase();
    if (!code) {
      await sendMessage(chatId, "Hi! Open Notes → Connect Telegram in the app to get a code, then send /start <code> here.");
      return NextResponse.json({ ok: true });
    }
    const { data: codeRow } = await supabase.from("telegram_link_codes").select("*").eq("code", code).eq("used", false).maybeSingle();
    if (!codeRow) {
      await sendMessage(chatId, "That code isn't valid or has already been used — generate a fresh one from Notes → Connect Telegram.");
      return NextResponse.json({ ok: true });
    }
    await supabase.from("telegram_links").upsert(
      { user_id: codeRow.user_id, telegram_chat_id: chatId, telegram_username: message.from?.username || null, linked_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    await supabase.from("telegram_link_codes").update({ used: true }).eq("code", code);
    await sendMessage(chatId, "✅ Linked! Forward any post or message here and it'll show up in your Notes.");
    return NextResponse.json({ ok: true });
  }

  /* ---------- everything else: this chat must already be linked ---------- */
  const { data: link } = await supabase.from("telegram_links").select("*").eq("telegram_chat_id", chatId).maybeSingle();
  if (!link) {
    await sendMessage(chatId, "This chat isn't linked to a Notes account yet. Open Notes → Connect Telegram in the app to get a code, then send /start <code> here.");
    return NextResponse.json({ ok: true });
  }

  if (text === "/start") return NextResponse.json({ ok: true }); // already linked, nothing to do

  const bodyText = message.text || message.caption || "";
  const hasMedia = !!(message.photo || message.video || message.document || message.voice || message.audio || message.sticker || message.animation);
  if (!bodyText && !hasMedia) return NextResponse.json({ ok: true }); // e.g. a bare command with nothing to save

  // Bot API 7.0+ uses forward_origin; older payloads use the
  // forward_from / forward_from_chat / forward_sender_name trio. Cover
  // both since we don't control which API version Telegram is running.
  const origin = message.forward_origin || null;
  const forwardedFromLabel =
    origin?.sender_user?.first_name ||
    origin?.sender_user_name ||
    origin?.chat?.title ||
    message.forward_sender_name ||
    message.forward_from?.first_name ||
    message.forward_from_chat?.title ||
    null;

  const title = forwardedFromLabel ? `Forwarded from ${forwardedFromLabel}` : (truncate(bodyText, 60) || "Telegram message");
  const finalBody = bodyText || "[Media message — open the original in Telegram to view the attachment]";
  const links = extractLinks(message);
  const bodySegments = buildBodySegments(message);

  const row = {
    user_id: link.user_id,
    title,
    body: finalBody,
    color: "amber",
    tag: "Telegram",
    pinned: false, archived: false, trashed: false,
    source: "telegram",
    source_meta: {
      chat_title: message.chat.title || null,
      from_username: message.from?.username || null,
      forwarded_from: forwardedFromLabel,
      message_id: message.message_id,
      has_media: hasMedia,
      links: links.length ? links : null,
      body_segments: bodySegments, // preferred for display — links inline at their real position
      // kept for anything reading the old singular shape
      link: links[0]?.url || null,
      link_domain: links[0] ? domainOf(links[0].url) : null,
    },
  };

  const { error } = await supabase.from("notes").insert(row);
  await sendMessage(chatId, error ? "⚠️ Couldn't save that — try again in a bit." : "📝 Saved to Notes.");

  return NextResponse.json({ ok: true });
}
