# Telegram → Notes — setup guide

This feature is **admin-only**, locked down at the database level (RLS),
not just hidden in the UI — only the account matching `ADMIN_EMAIL` can
generate a link code or connect Telegram at all.

## 1. Run the migration

`supabase/migrations/017_telegram_notes.sql` in Supabase's SQL Editor.

## 2. Create the bot

1. In Telegram, message **@BotFather**.
2. `/newbot` → give it a name and a username (must end in `bot`, e.g.
   `suher_notes_bot`).
3. BotFather replies with a **token** — looks like `123456:ABC-DEF...`.
   Keep this secret, never commit it or put it in `NEXT_PUBLIC_` anything.
4. Note the bot's **username** too (without the @) — that one's fine to
   be public.

## 3. Set environment variables in Vercel

Project → Settings → Environment Variables:

| Name | Value | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | the token from BotFather | server-only, secret |
| `TELEGRAM_WEBHOOK_SECRET` | any random string you make up (e.g. `openssl rand -hex 20`) | server-only, secret — just has to match what you register in step 4 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key | server-only, secret — bypasses RLS, guard this like a password |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | the bot's username, no @ | public — just used to build the "Open in Telegram" deep link button |

Redeploy after adding these (env var changes need a new deploy to take
effect).

## 4. Register the webhook with Telegram

One-time step, run from your own machine's terminal (replace the
bracketed values):

```bash
curl "https://api.telegram.org/bot[TELEGRAM_BOT_TOKEN]/setWebhook" \
  -d "url=https://getstudying.vercel.app/api/telegram/webhook" \
  -d "secret_token=[TELEGRAM_WEBHOOK_SECRET]"
```

Use the exact same `TELEGRAM_WEBHOOK_SECRET` value you put in Vercel.
You should get back `{"ok":true,"result":true,...}`.

To sanity-check it's registered: `curl "https://api.telegram.org/bot[TELEGRAM_BOT_TOKEN]/getWebhookInfo"`

## 5. Connect from the app

1. Log in as the admin account, go to Notes.
2. "Connect Telegram" → Generate code.
3. Tap "Open in Telegram" (or manually message the bot `/start CODE`).
4. Bot replies "✅ Linked!" — you're done.

## How to actually save things

**From a DM, channel post, or group message:** forward it to the bot,
same motion as forwarding to Saved Messages. It shows up in Notes within
a second or two, tagged "Telegram", amber-colored so it's visually
distinct at a glance.

**Important caveat about group chats:** by default, Telegram bots only
see messages that mention them or reply to them in a group — not every
message — even after the bot is added to the group. **Forwarding
directly to the bot's private chat always works regardless of this
setting** and is the reliable way to do it. If you want the bot to see
everything in a specific group without forwarding, you'd need to turn
off "Group Privacy" for the bot via @BotFather → your bot → Bot Settings
→ Group Privacy → Turn off, then add it to the group — but forwarding to
DM is simpler and doesn't require that.

## What gets saved

- Text messages → the text, as the note body.
- Photos/videos/documents with a caption → the caption becomes the body.
- Photos/videos/documents with no caption → a placeholder note pointing
  you back to Telegram, since Notes is text-only right now — the actual
  media file itself isn't downloaded or stored.
- If the message was forwarded from someone/somewhere, the note title
  becomes "Forwarded from [name]" automatically.

## Disconnecting

Notes → Connect Telegram (now showing "connected") → Disconnect. The bot
stops saving anything until you reconnect with a fresh code.
