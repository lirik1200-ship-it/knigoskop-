// Knigoskop access bot - deploy copy for Cloudflare. Cyrillic is written as unicode escapes so copy-paste cannot corrupt it.
// Readable source: worker/knigoskop-bot.js
// \u041a\u043d\u0438\u0433\u043e\u0441\u043a\u043e\u043f\u044a \u2014 \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u0438\u0433\u0440\u0435 \u043f\u043e \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0435 \u043d\u0430 Telegram-\u043a\u0430\u043d\u0430\u043b.
// Cloudflare Worker: \u0431\u043e\u0442 (\u0432\u0435\u0431\u0445\u0443\u043a /tg), \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u0434\u043b\u044f \u0441\u0430\u0439\u0442\u0430 (/verify), \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0430 \u0432\u0435\u0431\u0445\u0443\u043a\u0430 (/setup).
//
// \u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438 \u0432\u043e\u0440\u043a\u0435\u0440\u0430 (Settings \u2192 Variables and Secrets):
//   BOT_TOKEN \u2014 \u0441\u0435\u043a\u0440\u0435\u0442, \u0442\u043e\u043a\u0435\u043d \u0431\u043e\u0442\u0430 \u0438\u0437 @BotFather
//   SIGN_KEY  \u2014 \u0441\u0435\u043a\u0440\u0435\u0442, \u043b\u044e\u0431\u0430\u044f \u0434\u043b\u0438\u043d\u043d\u0430\u044f \u0441\u043b\u0443\u0447\u0430\u0439\u043d\u0430\u044f \u0441\u0442\u0440\u043e\u043a\u0430 (\u043f\u043e\u0434\u043f\u0438\u0441\u044c \u0441\u0441\u044b\u043b\u043e\u043a \u0434\u043e\u0441\u0442\u0443\u043f\u0430)
//   CHANNEL   \u2014 \u043f\u0435\u0440\u0435\u043c\u0435\u043d\u043d\u0430\u044f, \u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 @egeminkin
//   GAME_URL  \u2014 \u043f\u0435\u0440\u0435\u043c\u0435\u043d\u043d\u0430\u044f, \u043d\u0430\u043f\u0440\u0438\u043c\u0435\u0440 https://lirik1200-ship-it.github.io/knigoskop-/
//   DAY_ON    \u2014 \u043f\u0435\u0440\u0435\u043c\u0435\u043d\u043d\u0430\u044f, 1 = \u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u0442\u044c \u00ab\u0421\u0446\u0435\u043d\u0443 \u0434\u043d\u044f\u00bb (Cron `0 11,14 * * *` = 14:00 \u0438 17:00 \u041c\u0421\u041a; \u0434\u043d\u0438 \u0438 \u0432\u0440\u0435\u043c\u044f \u0431\u0435\u0440\u0443\u0442\u0441\u044f \u0438\u0437 day.json)
//   IG_ON, IG_USER_ID, IG_TOKEN \u2014 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u0440\u043e\u043b\u0438\u043a\u043e\u0432 \u0432 Instagram (\u0441\u043c. \u0431\u043b\u043e\u043a \u00abInstagram\u00bb \u043d\u0438\u0436\u0435); \u043a\u043e\u043c\u0430\u043d\u0434\u0430 /ig [n] \u2014 \u043f\u0440\u043e\u0431\u043d\u0430\u044f \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f
//   DB        \u2014 \u043f\u0440\u0438\u0432\u044f\u0437\u043a\u0430 D1 (Bindings \u2192 D1 database): \u0430\u043d\u043e\u043d\u0438\u043c\u043d\u0430\u044f \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0438\u0433\u0440\u044b. \u0411\u0435\u0437 \u043d\u0435\u0451 \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u043f\u0440\u043e\u0441\u0442\u043e \u043d\u0435 \u043f\u0438\u0448\u0435\u0442\u0441\u044f
// \u0411\u043e\u0442 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u043e\u043c \u043a\u0430\u043d\u0430\u043b\u0430, \u0438\u043d\u0430\u0447\u0435 Telegram \u043d\u0435 \u043f\u043e\u043a\u0430\u0436\u0435\u0442 \u0435\u043c\u0443 \u043f\u043e\u0434\u043f\u0438\u0441\u0447\u0438\u043a\u043e\u0432.

const TTL = 30 * 24 * 3600; // \u0441\u0441\u044b\u043b\u043a\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u0436\u0438\u0432\u0451\u0442 30 \u0434\u043d\u0435\u0439; \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0430 \u0432\u0441\u0451 \u0440\u0430\u0432\u043d\u043e \u043f\u0435\u0440\u0435\u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u0442\u0441\u044f \u043f\u0440\u0438 \u0432\u0445\u043e\u0434\u0435

export default {
  async scheduled(event, env, ctx) {
    if (String(env.DAY_ON) === '1') ctx.waitUntil(postDay(env, env.CHANNEL));
  },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/tg' && req.method === 'POST') return await onUpdate(req, env, ctx);
      if (url.pathname === '/verify') return await onVerify(url, env);
      if (url.pathname === '/setup') return await onSetup(url, env);
      if (url.pathname === '/hit' && req.method === 'POST') return await onHit(req, env);
      if (url.pathname === '/report' && req.method === 'POST') return await onReport(req, env);
    } catch (e) {
      return new Response('error: ' + e.message, { status: 500 });
    }
    return new Response('\u041a\u043d\u0438\u0433\u043e\u0441\u043a\u043e\u043f\u044a: \u0441\u0435\u0440\u0432\u0435\u0440 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442.');
  },
};

/* ---------- Telegram ---------- */
async function api(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return r.json();
}

async function memberStatus(env, uid) {
  const r = await api(env, 'getChatMember', { chat_id: env.CHANNEL, user_id: uid });
  if (!r.ok) return 'error';
  const s = r.result.status;
  if (s === 'creator' || s === 'administrator' || s === 'member') return 'member';
  if (s === 'restricted' && r.result.is_member) return 'member';
  return 'none';
}

const channelLink = env => 'https://t.me/' + String(env.CHANNEL).replace(/^@/, '');

async function onUpdate(req, env, ctx) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== (await hookSecret(env))) {
    return new Response('forbidden', { status: 403 });
  }
  const u = await req.json();
  const msg = u.message, cb = u.callback_query;
  const from = msg ? msg.from : cb ? cb.from : null;
  const chat = msg ? msg.chat.id : cb ? cb.message.chat.id : null;
  if (!from || !chat) return new Response('ok');
  if (cb) await api(env, 'answerCallbackQuery', { callback_query_id: cb.id });
  if (msg && /^\/preview\b/.test(msg.text || '')) {
    if (!(await isChannelAdmin(env, from.id))) {
      await api(env, 'sendMessage', { chat_id: chat, text: '\u041f\u0440\u043e\u0431\u043d\u044b\u0439 \u043f\u043e\u0441\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d \u0442\u043e\u043b\u044c\u043a\u043e \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430\u043c \u043a\u0430\u043d\u0430\u043b\u0430.' });
      return new Response('ok');
    }
    const n = parseInt((msg.text.split(/\s+/)[1] || ''), 10);
    const res = await postDay(env, chat, n > 0 ? n - 1 : null);
    if (res !== 'ok') await api(env, 'sendMessage', { chat_id: chat, text: res });
    return new Response('ok');
  }
  if (msg && /^\/ig\b/.test(msg.text || '')) {
    // \u043f\u0440\u043e\u0431\u043d\u0430\u044f \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u0432 Instagram: /ig [\u043d\u043e\u043c\u0435\u0440 \u0441\u0446\u0435\u043d\u044b]; \u043e\u0442\u0432\u0435\u0442 \u043f\u0440\u0438\u0434\u0451\u0442 \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435\u043c \u0432 \u044d\u0442\u043e\u0442 \u0447\u0430\u0442
    if (!(await isChannelAdmin(env, from.id))) {
      await api(env, 'sendMessage', { chat_id: chat, text: '\u041f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u0432 Instagram \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0442\u043e\u043b\u044c\u043a\u043e \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430\u043c \u043a\u0430\u043d\u0430\u043b\u0430.' });
      return new Response('ok');
    }
    const n = parseInt((msg.text.split(/\s+/)[1] || ''), 10);
    ctx.waitUntil((async () => {
      const res = await postDay(env, chat, n > 0 ? n - 1 : null, { ig: true });
      await api(env, 'sendMessage', { chat_id: chat, text: 'Instagram: ' + (res === 'ok' ? '\u0440\u043e\u043b\u0438\u043a \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d.' : res) });
    })());
    return new Response('ok');
  }
  if (msg && /^\/stats\b/.test(msg.text || '')) {
    if (!(await isChannelAdmin(env, from.id))) {
      await api(env, 'sendMessage', { chat_id: chat, text: '\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 \u0442\u043e\u043b\u044c\u043a\u043e \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u0430\u043c \u043a\u0430\u043d\u0430\u043b\u0430.' });
      return new Response('ok');
    }
    const n = parseInt((msg.text.split(/\s+/)[1] || ''), 10);
    await api(env, 'sendMessage', { chat_id: chat, text: await statsText(env, n > 0 && n <= 365 ? n : 7), parse_mode: 'HTML' });
    return new Response('ok');
  }
  if (msg &&!(msg.text || '').startsWith('/start') && !/\u0434\u043e\u0441\u0442\u0443\u043f|\u0438\u0433\u0440/i.test(msg.text || '')) {
    await api(env, 'sendMessage', { chat_id: chat, text: '\u041d\u0430\u0436\u043c\u0438\u0442\u0435 /start, \u0447\u0442\u043e\u0431\u044b \u043f\u043e\u043b\u0443\u0447\u0438\u0442\u044c \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u0438\u0433\u0440\u0435 \u00ab\u041a\u043d\u0438\u0433\u043e\u0441\u043a\u043e\u043f\u044a\u00bb.' });
    return new Response('ok');
  }

  const st = await memberStatus(env, from.id);
  if (st === 'member') {
    const token = await makeToken(env, from.id);
    await api(env, 'sendMessage', {
      chat_id: chat,
      text: '\u041f\u043e\u0434\u043f\u0438\u0441\u043a\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430. \u0421\u043f\u0430\u0441\u0438\u0431\u043e!\n\n\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u043a\u043d\u043e\u043f\u043a\u0443, \u0447\u0442\u043e\u0431\u044b \u043e\u0442\u043a\u0440\u044b\u0442\u044c \u00ab\u041a\u043d\u0438\u0433\u043e\u0441\u043a\u043e\u043f\u044a\u00bb. \u0421\u0441\u044b\u043b\u043a\u0430 \u043b\u0438\u0447\u043d\u0430\u044f, \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442 30 \u0434\u043d\u0435\u0439.',
      reply_markup: { inline_keyboard: [[{ text: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0438\u0433\u0440\u0443', url: env.GAME_URL + '#access=' + token }]] },
    });
  } else if (st === 'none') {
    await api(env, 'sendMessage', {
      chat_id: chat,
      text: '\u0418\u0433\u0440\u0430 \u00ab\u041a\u043d\u0438\u0433\u043e\u0441\u043a\u043e\u043f\u044a\u00bb \u043e\u0442\u043a\u0440\u044b\u0442\u0430 \u0434\u043b\u044f \u043f\u043e\u0434\u043f\u0438\u0441\u0447\u0438\u043a\u043e\u0432 \u043a\u0430\u043d\u0430\u043b\u0430 ' + env.CHANNEL + '.\n\n\u041f\u043e\u0434\u043f\u0438\u0448\u0438\u0442\u0435\u0441\u044c \u0438 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u042f \u043f\u043e\u0434\u043f\u0438\u0441\u0430\u043b\u0441\u044f\u00bb.',
      reply_markup: { inline_keyboard: [
        [{ text: '\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f \u043d\u0430 \u043a\u0430\u043d\u0430\u043b', url: channelLink(env) }],
        [{ text: '\u042f \u043f\u043e\u0434\u043f\u0438\u0441\u0430\u043b\u0441\u044f', callback_data: 'check' }],
      ] },
    });
  } else {
    await api(env, 'sendMessage', { chat_id: chat, text: '\u041d\u0435 \u043f\u043e\u043b\u0443\u0447\u0438\u043b\u043e\u0441\u044c \u043f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0443. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437 \u0447\u0435\u0440\u0435\u0437 \u043c\u0438\u043d\u0443\u0442\u0443.' });
  }
  return new Response('ok');
}

async function isChannelAdmin(env, uid) {
  const r = await api(env, 'getChatMember', { chat_id: env.CHANNEL, user_id: uid });
  return r.ok && (r.result.status === 'creator' || r.result.status === 'administrator');
}

/* ---------- \u0441\u0446\u0435\u043d\u0430 \u0434\u043d\u044f: \u0440\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0438 \u0432\u043e\u043f\u0440\u043e\u0441\u044b \u043b\u0435\u0436\u0430\u0442 \u0432 day.json \u0440\u044f\u0434\u043e\u043c \u0441 \u0438\u0433\u0440\u043e\u0439 ---------- */
const HOOKS = ['\u0423\u0437\u043d\u0430\u0451\u0442\u0435 \u044d\u0442\u043e \u043c\u0435\u0441\u0442\u043e?', '\u0413\u0434\u0435 \u043c\u044b \u043e\u043a\u0430\u0437\u0430\u043b\u0438\u0441\u044c?', '\u0418\u0437 \u043a\u0430\u043a\u043e\u0439 \u043a\u043d\u0438\u0433\u0438 \u044d\u0442\u043e\u0442 \u0432\u0438\u0434?', '\u0412 \u043a\u0430\u043a\u0443\u044e \u043a\u043d\u0438\u0433\u0443 \u043c\u044b \u0437\u0430\u0433\u043b\u044f\u043d\u0443\u043b\u0438?', '\u0427\u044c\u044f \u044d\u0442\u043e \u0438\u0441\u0442\u043e\u0440\u0438\u044f?'];
const hiddenDetails = n => {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return `\u0441\u043f\u0440\u044f\u0442\u0430\u043d\u0430 ${n} \u0434\u0435\u0442\u0430\u043b\u044c`;
  return a >= 2 && a <= 4 && (b < 12 || b > 14) ? `\u0441\u043f\u0440\u044f\u0442\u0430\u043d\u044b ${n} \u0434\u0435\u0442\u0430\u043b\u0438` : `\u0441\u043f\u0440\u044f\u0442\u0430\u043d\u043e ${n} \u0434\u0435\u0442\u0430\u043b\u0435\u0439`;
};

// \u0440\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0432 day.json: start \u2014 \u043f\u0435\u0440\u0432\u044b\u0439 \u0434\u0435\u043d\u044c \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0439, schedule \u2014 {\u0434\u0435\u043d\u044c \u043d\u0435\u0434\u0435\u043b\u0438: \u0432\u0440\u0435\u043c\u044f \u043f\u043e \u041c\u043e\u0441\u043a\u0432\u0435}
// (0 = \u0432\u0441, 1 = \u043f\u043d \u2026 6 = \u0441\u0431). Cron \u0441\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u0435\u0442 \u0432 14:00 \u0438 17:00 \u041c\u0421\u041a (`0 11,14 * * *`), \u043f\u043e\u044d\u0442\u043e\u043c\u0443 \u0432\u0440\u0435\u043c\u044f \u2014 \u043e\u0434\u043d\u043e \u0438\u0437 \u044d\u0442\u0438\u0445 \u0434\u0432\u0443\u0445.
const WD = ['\u0432 \u0432\u043e\u0441\u043a\u0440\u0435\u0441\u0435\u043d\u044c\u0435', '\u0432 \u043f\u043e\u043d\u0435\u0434\u0435\u043b\u044c\u043d\u0438\u043a', '\u0432\u043e \u0432\u0442\u043e\u0440\u043d\u0438\u043a', '\u0432 \u0441\u0440\u0435\u0434\u0443', '\u0432 \u0447\u0435\u0442\u0432\u0435\u0440\u0433', '\u0432 \u043f\u044f\u0442\u043d\u0438\u0446\u0443', '\u0432 \u0441\u0443\u0431\u0431\u043e\u0442\u0443'];
const MSK = 3 * 3600e3;
const dayMSK = t => Math.floor((t + MSK) / 864e5);
const weekday = day => (day + 4) % 7; // 1 \u044f\u043d\u0432 1970 \u2014 \u0447\u0435\u0442\u0432\u0435\u0440\u0433
const postTime = (D, day) => (D.schedule || {})[weekday(day)];
// \u043d\u043e\u043c\u0435\u0440 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438 (\u0441 \u043d\u0443\u043b\u044f) \u0434\u043b\u044f \u0434\u0430\u0442\u044b day; -1, \u0435\u0441\u043b\u0438 \u0434\u043e \u0441\u0442\u0430\u0440\u0442\u0430
function postIndex(D, day) {
  let n = -1;
  for (let x = dayMSK(Date.parse(D.start)); x <= day; x++) if (postTime(D, x)) n++;
  return n;
}
function nextPost(D, day) {
  for (let x = day + 1; x <= day + 7; x++) {
    const t = postTime(D, x);
    if (t) return (x === day + 1 ? '\u0437\u0430\u0432\u0442\u0440\u0430' : WD[weekday(x)]) + ' \u0432 ' + t;
  }
  return '\u0432 \u0431\u043b\u0438\u0436\u0430\u0439\u0448\u0438\u0435 \u0434\u043d\u0438';
}

// i \u2014 \u043d\u043e\u043c\u0435\u0440 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438 \u0441 \u043d\u0443\u043b\u044f; \u0431\u0435\u0437 \u043d\u0435\u0433\u043e \u0431\u0435\u0440\u0451\u0442\u0441\u044f \u0441\u0435\u0433\u043e\u0434\u043d\u044f\u0448\u043d\u044f\u044f (\u0434\u043b\u044f \u043f\u0440\u043e\u0431\u043d\u043e\u0433\u043e \u043f\u043e\u0441\u0442\u0430 \u0434\u043e \u0441\u0442\u0430\u0440\u0442\u0430 \u2014 \u043f\u0435\u0440\u0432\u0430\u044f)
async function postDay(env, chat, i, opts) {
  const D = await (await fetch(env.GAME_URL + 'day.json?' + Date.now())).json();
  const now = Date.now(), today = dayMSK(now);
  if (i == null) {
    if (chat === env.CHANNEL) {
      const t = postTime(D, today), hour = new Date(now + MSK).getUTCHours();
      if (!t || parseInt(t, 10) !== hour) return '\u0421\u0435\u0439\u0447\u0430\u0441 \u043d\u0435 \u0432\u0440\u0435\u043c\u044f \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438';
    }
    i = postIndex(D, today);
    if (i < 0) {
      if (chat === env.CHANNEL) return '\u0421\u0446\u0435\u043d\u044b \u0434\u043d\u044f \u0435\u0449\u0451 \u043d\u0435 \u043d\u0430\u0447\u0430\u043b\u0438\u0441\u044c';
      i = 0;
    }
  }
  const d = D.days[i % D.days.length];
  if (opts && opts.ig) return postInstagram(env, d, i, 5); // \u043a\u043e\u043c\u0430\u043d\u0434\u0430 /ig: \u0442\u043e\u043b\u044c\u043a\u043e Instagram
  const caption =`\ud83d\udd0e <b>\u0421\u0426\u0415\u041d\u0410 \u0414\u041d\u042f \u00b7 \u2116 ${i + 1}</b>\n` +
    `<i>\u0438\u0437 <a href="${env.GAME_URL}">\u00ab\u041a\u043d\u0438\u0433\u043e\u0441\u043a\u043e\u043f\u0430\u00bb</a>, \u043c\u043e\u0435\u0439 \u0438\u0433\u0440\u044b \u043f\u043e \u0440\u0443\u0441\u0441\u043a\u043e\u0439 \u043b\u0438\u0442\u0435\u0440\u0430\u0442\u0443\u0440\u0435</i>\n\n` +
    `<b>${HOOKS[i % HOOKS.length]}</b>\n` +
    '\u041f\u0430\u043d\u043e\u0440\u0430\u043c\u0430 \u043f\u043e\u0432\u043e\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u043f\u043e \u043a\u0440\u0443\u0433\u0443, \u043f\u0440\u0438\u0441\u043c\u043e\u0442\u0440\u0438\u0442\u0435\u0441\u044c \u043a \u0434\u0435\u0442\u0430\u043b\u044f\u043c. \u041e\u0442\u0432\u0435\u0442 \u0432\u044b\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u0432 \u0432\u0438\u043a\u0442\u043e\u0440\u0438\u043d\u0435 \u043d\u0438\u0436\u0435 \ud83d\udc47\n\n' +
    `\u0412 \u0438\u0433\u0440\u0435 \u0437\u0434\u0435\u0441\u044c ${hiddenDetails(d.spots)} \u0438\u0437 \u0442\u0435\u043a\u0441\u0442\u0430. \u0421\u043a\u043e\u043b\u044c\u043a\u043e \u043d\u0430\u0439\u0434\u0451\u0442\u0435 \u0432\u044b?\n\n` +
    `#\u0441\u0446\u0435\u043d\u0430_\u0434\u043d\u044f #\u043a\u043d\u0438\u0433\u043e\u0441\u043a\u043e\u043f #${d.grade}\u043a\u043b\u0430\u0441\u0441`;
  const reply_markup = { inline_keyboard: [[{ text: '\ud83d\udd2d \u041d\u0430\u0439\u0442\u0438 \u0434\u0435\u0442\u0430\u043b\u0438 \u0432 \u0438\u0433\u0440\u0435', url: env.GAME_URL + '?s=' + d.id + '&day=' + (i + 1) }]] };
  const media = env.GAME_URL + 'img/day/' + d.id;
  // \u0440\u043e\u043b\u0438\u043a-\u043f\u0435\u0442\u043b\u044f \u043f\u043e \u043a\u0440\u0443\u0433\u0443 \u043f\u0430\u043d\u043e\u0440\u0430\u043c\u044b; \u0435\u0441\u043b\u0438 Telegram \u0435\u0433\u043e \u043d\u0435 \u043f\u0440\u0438\u043d\u044f\u043b \u2014 \u043e\u0431\u044b\u0447\u043d\u0430\u044f \u043a\u0430\u0440\u0442\u0438\u043d\u043a\u0430
  let post = await api(env, 'sendAnimation', { chat_id: chat, animation: media + '.mp4', caption, parse_mode: 'HTML', reply_markup });
  if (!post.ok) post = await api(env, 'sendPhoto', { chat_id: chat, photo: media + '.jpg', caption, parse_mode: 'HTML', reply_markup });
  if (!post.ok) return '\u041f\u043e\u0441\u0442 \u043d\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d: ' + post.description;
  const poll = await api(env, 'sendPoll', {
    chat_id: chat,
    question: '\u0418\u0437 \u043a\u0430\u043a\u043e\u0433\u043e \u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u044d\u0442\u0430 \u0441\u0446\u0435\u043d\u0430?',
    options: d.options.map(text => ({ text })),
    type: 'quiz',
    correct_option_id: d.correct,
    explanation: `${d.explanation} \u0421\u043b\u0435\u0434\u0443\u044e\u0449\u0430\u044f \u0441\u0446\u0435\u043d\u0430 \u0432\u044b\u0439\u0434\u0435\u0442 ${nextPost(D, today)}.`.slice(0, 200),
    is_anonymous: true,
  });
  let res = poll.ok ? 'ok' : '\u041e\u043f\u0440\u043e\u0441 \u043d\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d: ' + poll.description;
  // \u0442\u043e \u0436\u0435 \u0440\u0430\u0441\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0438 \u0442\u043e\u0442 \u0436\u0435 \u0440\u043e\u043b\u0438\u043a, \u043d\u043e \u0432\u0435\u0440\u0442\u0438\u043a\u0430\u043b\u044c\u043d\u044b\u0439 \u0438 \u0441 \u0433\u043e\u043b\u043e\u0441\u043e\u043c, \u0443\u0445\u043e\u0434\u0438\u0442 \u0432 Instagram
  if (chat === env.CHANNEL && String(env.IG_ON) === '1') {
    const ig = await postInstagram(env, d, i, 24);
    if (ig !== 'ok') res += ' \u00b7 ' + ig;
  }
  return res;
}

/* ---------- Instagram: Reels \u0447\u0435\u0440\u0435\u0437 Graph API ----------
   \u041f\u0435\u0440\u0435\u043c\u0435\u043d\u043d\u044b\u0435 \u0432\u043e\u0440\u043a\u0435\u0440\u0430: IG_ON=1, IG_USER_ID (\u0447\u0438\u0441\u043b\u043e \u2014 id \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0433\u043e \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430 Instagram),
   IG_TOKEN (\u0441\u0435\u043a\u0440\u0435\u0442 \u2014 \u0431\u0435\u0441\u0441\u0440\u043e\u0447\u043d\u044b\u0439 \u0442\u043e\u043a\u0435\u043d \u0441\u0442\u0440\u0430\u043d\u0438\u0446\u044b Facebook, \u043a \u043a\u043e\u0442\u043e\u0440\u043e\u0439 \u043f\u0440\u0438\u0432\u044f\u0437\u0430\u043d \u0430\u043a\u043a\u0430\u0443\u043d\u0442).
   \u0420\u043e\u043b\u0438\u043a \u0431\u0435\u0440\u0451\u0442\u0441\u044f \u0441 \u0441\u0430\u0439\u0442\u0430: img/day/<id>_v.mp4 (9:16, \u0441 \u0433\u043e\u043b\u043e\u0441\u043e\u043c). Instagram \u0441\u0430\u043c \u0441\u043a\u0430\u0447\u0438\u0432\u0430\u0435\u0442 \u0435\u0433\u043e \u043f\u043e \u0441\u0441\u044b\u043b\u043a\u0435. */
const IG_API = 'https://graph.facebook.com/v21.0/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function igCall(env, path, params, get) {
  const q = new URLSearchParams({ ...params, access_token: env.IG_TOKEN });
  const r = await fetch(IG_API + path + (get ? '?' + q : ''), get ? {} : { method: 'POST', body: q });
  return r.json();
}
// tries \u2014 \u0441\u043a\u043e\u043b\u044c\u043a\u043e \u0440\u0430\u0437 \u043f\u043e 5 \u0441 \u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0442\u044c, \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u0430\u043b \u043b\u0438 Instagram \u0432\u0438\u0434\u0435\u043e
async function postInstagram(env, d, i, tries) {
  if (!env.IG_USER_ID || !env.IG_TOKEN) return '\u043d\u0435 \u0437\u0430\u0434\u0430\u043d\u044b IG_USER_ID \u0438 IG_TOKEN';
  const caption = `\u0421\u0426\u0415\u041d\u0410 \u0414\u041d\u042f \u00b7 \u2116 ${i + 1}\n\n${HOOKS[i % HOOKS.length]}\n` +
    `\u041f\u0430\u043d\u043e\u0440\u0430\u043c\u0430 \u043f\u043e\u0432\u043e\u0440\u0430\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044f \u043f\u043e \u043a\u0440\u0443\u0433\u0443, \u043f\u0440\u0438\u0441\u043c\u043e\u0442\u0440\u0438\u0442\u0435\u0441\u044c \u043a \u0434\u0435\u0442\u0430\u043b\u044f\u043c. \u0412 \u0438\u0433\u0440\u0435 \u0437\u0434\u0435\u0441\u044c ${hiddenDetails(d.spots)} \u0438\u0437 \u0442\u0435\u043a\u0441\u0442\u0430.\n\n` +
    '\u0418\u0437 \u043a\u0430\u043a\u043e\u0433\u043e \u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u044d\u0442\u0430 \u0441\u0446\u0435\u043d\u0430? \u041f\u0438\u0448\u0438\u0442\u0435 \u043e\u0442\u0432\u0435\u0442 \u0432 \u043a\u043e\u043c\u043c\u0435\u043d\u0442\u0430\u0440\u0438\u044f\u0445 \ud83d\udc47\n\n' +
    '\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c \u0441\u0435\u0431\u044f \u043c\u043e\u0436\u043d\u043e \u0432 \u0438\u0433\u0440\u0435 \u00ab\u041a\u043d\u0438\u0433\u043e\u0441\u043a\u043e\u043f\u044a\u00bb: \u0441\u0441\u044b\u043b\u043a\u0430 \u0432 \u0448\u0430\u043f\u043a\u0435 \u043f\u0440\u043e\u0444\u0438\u043b\u044f.\n\n' +
    `#\u0441\u0446\u0435\u043d\u0430_\u0434\u043d\u044f #\u043a\u043d\u0438\u0433\u043e\u0441\u043a\u043e\u043f #${d.grade}\u043a\u043b\u0430\u0441\u0441 #\u043b\u0438\u0442\u0435\u0440\u0430\u0442\u0443\u0440\u0430 #\u0435\u0433\u044d #\u0440\u0443\u0441\u0441\u043a\u0430\u044f\u043b\u0438\u0442\u0435\u0440\u0430\u0442\u0443\u0440\u0430`;
  const c = await igCall(env, env.IG_USER_ID + '/media', {
    media_type: 'REELS', video_url: env.GAME_URL + 'img/day/' + d.id + '_v.mp4', caption, share_to_feed: 'true',
  });
  if (!c.id) return '\u043a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440 \u043d\u0435 \u0441\u043e\u0437\u0434\u0430\u043d: ' + (c.error ? c.error.message : JSON.stringify(c));
  for (let k = 0; k < tries; k++) {
    await sleep(5000);
    const s = await igCall(env, c.id, { fields: 'status_code,status' }, true);
    if (s.status_code === 'FINISHED') {
      const p = await igCall(env, env.IG_USER_ID + '/media_publish', { creation_id: c.id });
      return p.id ? 'ok' : '\u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u043d\u0435 \u0443\u0434\u0430\u043b\u0430\u0441\u044c: ' + (p.error ? p.error.message : JSON.stringify(p));
    }
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') return 'Instagram \u043d\u0435 \u043f\u0440\u0438\u043d\u044f\u043b \u0432\u0438\u0434\u0435\u043e: ' + (s.status || s.status_code);
  }
  return '\u0432\u0438\u0434\u0435\u043e \u0435\u0449\u0451 \u043e\u0431\u0440\u0430\u0431\u0430\u0442\u044b\u0432\u0430\u0435\u0442\u0441\u044f, \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u043d\u0435 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u0430';
}

/* ---------- \u0430\u043d\u043e\u043d\u0438\u043c\u043d\u0430\u044f \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u0438\u0433\u0440\u044b (D1): \u0442\u043e\u043b\u044c\u043a\u043e \u0441\u0447\u0451\u0442\u0447\u0438\u043a\u0438 \u043f\u043e \u0434\u043d\u044f\u043c, \u0431\u0435\u0437 \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439 \u0438 \u0430\u0434\u0440\u0435\u0441\u043e\u0432 ---------- */
const EVENTS = ['open', 'start', 'finish', 'print', 'install', 'report'];
let schemaReady = false;
async function db(env) {
  if (!env.DB) return null;
  if (!schemaReady) {
    await env.DB.batch([
      env.DB.prepare('CREATE TABLE IF NOT EXISTS events (day TEXT, ev TEXT, k TEXT, n INTEGER DEFAULT 0, PRIMARY KEY (day, ev, k))'),
      env.DB.prepare('CREATE TABLE IF NOT EXISTS scenes (day TEXT, id TEXT, v INTEGER DEFAULT 0, n INTEGER DEFAULT 0, pl INTEGER DEFAULT 0, dr INTEGER DEFAULT 0, au INTEGER DEFAULT 0, ti INTEGER DEFAULT 0, sp INTEGER DEFAULT 0, PRIMARY KEY (day, id))'),
    ]);
    schemaReady = true;
  }
  return env.DB;
}
const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // \u0434\u0435\u043d\u044c \u043f\u043e \u041c\u043e\u0441\u043a\u0432\u0435
const corsH = env => ({ 'access-control-allow-origin': new URL(env.GAME_URL).origin, 'content-type': 'application/json' });
const num = (v, max) => Math.max(0, Math.min(max, Math.round(+v || 0)));

async function countEvent(env, ev, k) {
  const D = await db(env); if (!D) return;
  await D.prepare('INSERT INTO events (day, ev, k, n) VALUES (?, ?, ?, 1) ON CONFLICT (day, ev, k) DO UPDATE SET n = n + 1').bind(today(), ev, k).run();
}

async function onHit(req, env) {
  let b; try { b = JSON.parse(await req.text()); } catch (e) { return new Response('bad', { status: 400 }); }
  const ev = String(b.ev || ''), k = String(b.k || '');
  if (!/^[\w-]{1,24}$/.test(k)) return new Response('bad', { status: 400 });
  const D = await db(env); if (!D) return new Response('off', { headers: corsH(env) });
  if (ev === 'view' || ev === 'ans') {
    const a = ev === 'ans';
    await D.prepare('INSERT INTO scenes (day, id, v, n, pl, dr, au, ti, sp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (day, id) DO UPDATE SET ' +
      'v = v + excluded.v, n = n + excluded.n, pl = pl + excluded.pl, dr = dr + excluded.dr, au = au + excluded.au, ti = ti + excluded.ti, sp = sp + excluded.sp')
      .bind(today(), k, a ? 0 : 1, a ? 1 : 0, a ? num(b.pl, 1500) : 0, a ? num(b.dr, 1000) : 0, a ? num(b.au, 1000) : 0, a ? num(b.ti, 1500) : 0, a ? num(b.sp, 20) : 0).run();
  } else if (EVENTS.includes(ev) && ev !== 'report') {
    await countEvent(env, ev, k);
  } else return new Response('bad', { status: 400 });
  return new Response('ok', { headers: corsH(env) });
}

// \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435 \u043e\u0431 \u043e\u0448\u0438\u0431\u043a\u0435 \u0438\u0437 \u0438\u0433\u0440\u044b: \u0443\u0445\u043e\u0434\u0438\u0442 \u0432\u043b\u0430\u0434\u0435\u043b\u044c\u0446\u0443 \u043a\u0430\u043d\u0430\u043b\u0430 (\u043e\u043d \u0434\u043e\u043b\u0436\u0435\u043d \u0445\u043e\u0442\u044f \u0431\u044b \u0440\u0430\u0437 \u043d\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u0431\u043e\u0442\u0443)
async function onReport(req, env) {
  const H = corsH(env);
  let b; try { b = JSON.parse(await req.text()); } catch (e) { return new Response('{"ok":false}', { headers: H }); }
  const id = String(b.id || '').slice(0, 24), text = String(b.text || '').trim().slice(0, 600);
  if (!/^[\w-]+$/.test(id) || text.length < 5) return new Response('{"ok":false}', { headers: H });
  const adm = await api(env, 'getChatAdministrators', { chat_id: env.CHANNEL });
  const owner = adm.ok && adm.result.find(m => m.status === 'creator');
  if (!owner) return new Response('{"ok":false}', { headers: H });
  const msg = '\u26a0\ufe0f \u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435 \u043e\u0431 \u043e\u0448\u0438\u0431\u043a\u0435 \u0432 \u0438\u0433\u0440\u0435\n\n' +
    '\u0421\u0446\u0435\u043d\u0430: \u00ab' + String(b.title || '').slice(0, 120) + '\u00bb (' + id + ')\n' +
    (b.kind ? '\u0413\u0434\u0435 \u043e\u0448\u0438\u0431\u043a\u0430: ' + String(b.kind).slice(0, 40) + '\n' : '') + '\n' + text;
  const r = await api(env, 'sendMessage', { chat_id: owner.user.id, text: msg, reply_markup: { inline_keyboard: [[{ text: '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0441\u0446\u0435\u043d\u0443', url: env.GAME_URL + '?s=' + id }]] } });
  if (r.ok) await countEvent(env, 'report', id).catch(() => {});
  return new Response(JSON.stringify({ ok: !!r.ok }), { headers: H });
}

async function statsText(env, days) {
  const D = await db(env);
  if (!D) return '\u0421\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043a\u0430 \u043d\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0430: \u0432 Cloudflare \u0443 \u0432\u043e\u0440\u043a\u0435\u0440\u0430 \u043d\u0435\u0442 \u043f\u0440\u0438\u0432\u044f\u0437\u043a\u0438 \u0431\u0430\u0437\u044b D1 \u0441 \u0438\u043c\u0435\u043d\u0435\u043c DB.';
  const from = new Date(Date.now() + 3 * 3600e3 - (days - 1) * 864e5).toISOString().slice(0, 10);
  const ev = (await D.prepare('SELECT ev, k, SUM(n) AS n FROM events WHERE day >= ? GROUP BY ev, k').bind(from).all()).results;
  const sc = (await D.prepare('SELECT id, SUM(v) AS v, SUM(n) AS n, SUM(pl) AS pl, SUM(dr) AS dr, SUM(au) AS au, SUM(ti) AS ti, SUM(sp) AS sp FROM scenes WHERE day >= ? GROUP BY id').bind(from).all()).results;
  const E = (e, k) => ev.filter(x => x.ev === e && (k == null || x.k === k || x.k.startsWith(k))).reduce((a, x) => a + x.n, 0);
  const V = sc.reduce((a, x) => a + x.v, 0), N = sc.reduce((a, x) => a + x.n, 0);
  const pc = (a, b) => b ? Math.round(100 * a / b) + '%' : '0%';
  let names = {};
  try { const G = await (await fetch(env.GAME_URL + 'day.json')).json(); names = Object.fromEntries(G.days.map(d => [d.id, d.options[d.correct]])); } catch (e) {}
  const avg = x => (x.pl + x.dr + x.au + x.ti) / x.n;
  const enough = sc.filter(x => x.n >= 3).sort((a, b) => avg(a) - avg(b));
  const line = x => `\u00ab${names[x.id] || x.id}\u00bb: \u0432 \u0441\u0440\u0435\u0434\u043d\u0435\u043c ${Math.round(avg(x))} \u043e\u0447\u043a., \u043e\u0442\u0432\u0435\u0442\u043e\u0432 ${x.n}`;
  const T = sc.reduce((a, x) => a + x.ti, 0) / 1500, A = sc.reduce((a, x) => a + x.au, 0) / 1000, Dr = sc.reduce((a, x) => a + x.dr, 0) / 1000;
  let t = `\ud83d\udcca <b>\u041a\u043d\u0438\u0433\u043e\u0441\u043a\u043e\u043f\u044a \u0437\u0430 ${days} ${days % 10 === 1 && days % 100 !== 11 ? '\u0434\u0435\u043d\u044c' : days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 12 || days % 100 > 14) ? '\u0434\u043d\u044f' : '\u0434\u043d\u0435\u0439'}</b>\n\n` +
    `\u041e\u0442\u043a\u0440\u044b\u0442\u0438\u0439 \u0438\u0433\u0440\u044b: <b>${E('open')}</b> (\u043f\u043e \u0441\u0441\u044b\u043b\u043a\u0435 \u0438\u0437 \u00ab\u0421\u0446\u0435\u043d\u044b \u0434\u043d\u044f\u00bb ${E('open', 'day')}, \u043f\u043e \u0441\u0441\u044b\u043b\u043a\u0435 \u0443\u0447\u0438\u0442\u0435\u043b\u044f ${E('open', 'set')}, \u0441 \u0438\u043a\u043e\u043d\u043a\u0438 \u043d\u0430 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0435 ${E('open', 'app')})\n` +
    `\u041f\u0430\u0440\u0442\u0438\u0439 \u043d\u0430\u0447\u0430\u0442\u043e: <b>${E('start')}</b>, \u0434\u043e\u0438\u0433\u0440\u0430\u043d\u043e \u0434\u043e \u0438\u0442\u043e\u0433\u043e\u0432: <b>${E('finish')}</b> (${pc(E('finish'), E('start') - E('start', 'scene-slide') - E('start', 'hero-slide'))})\n` +
    `\u0418\u0433\u0440 \u043d\u0430 \u0441\u043b\u0430\u0439\u0434\u0435: ${E('start', 'scene-slide') + E('start', 'hero-slide')}, \u00ab\u0423\u0433\u0430\u0434\u0430\u0439 \u0433\u0435\u0440\u043e\u044f\u00bb: ${E('start', 'hero')}\n` +
    `\u0421\u0446\u0435\u043d \u043e\u0442\u043a\u0440\u044b\u0442\u043e: ${V}, \u043e\u0442\u0432\u0435\u0447\u0435\u043d\u043e: ${N} (${pc(N, V)})\n` +
    `\u0412\u0435\u0440\u043d\u043e \u043d\u0430\u0437\u0432\u0430\u043d\u043e \u043f\u0440\u043e\u0438\u0437\u0432\u0435\u0434\u0435\u043d\u0438\u0435: ${pc(Math.round(T), N)}, \u0430\u0432\u0442\u043e\u0440: ${pc(Math.round(A), N)}, \u043d\u0430\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435: ${pc(Math.round(Dr), N)}\n` +
    `\u041b\u0438\u0441\u0442\u043e\u0432 \u0440\u0430\u0441\u043f\u0435\u0447\u0430\u0442\u0430\u043d\u043e: ${E('print')}, \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043e\u043a \u043d\u0430 \u0442\u0435\u043b\u0435\u0444\u043e\u043d: ${E('install')}, \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0439 \u043e\u0431 \u043e\u0448\u0438\u0431\u043a\u0430\u0445: ${E('report')}`;
  const hard = enough.slice(0, Math.min(5, Math.ceil(enough.length / 2))), easy = enough.slice(hard.length).reverse().slice(0, 5);
  if (hard.length) t += '\n\n<b>\u0422\u0440\u0443\u0434\u043d\u0435\u0435 \u0432\u0441\u0435\u0433\u043e</b>\n' + hard.map(line).join('\n');
  if (easy.length) t += '\n\n<b>\u041b\u0435\u0433\u0447\u0435 \u0432\u0441\u0435\u0433\u043e</b>\n' + easy.map(line).join('\n');
  if (!enough.length && N) t += '\n\n\u0422\u0440\u0443\u0434\u043d\u044b\u0435 \u0438 \u043b\u0451\u0433\u043a\u0438\u0435 \u0441\u0446\u0435\u043d\u044b \u043f\u043e\u044f\u0432\u044f\u0442\u0441\u044f, \u043a\u043e\u0433\u0434\u0430 \u043d\u0430 \u043a\u0430\u0436\u0434\u0443\u044e \u043f\u0440\u0438\u0434\u0451\u0442 \u0445\u043e\u0442\u044f \u0431\u044b 3 \u043e\u0442\u0432\u0435\u0442\u0430.';
  return t + '\n\n\u0417\u0430 \u0434\u0440\u0443\u0433\u043e\u0439 \u0441\u0440\u043e\u043a: /stats 30';
}

/* ---------- \u0441\u0430\u0439\u0442 ---------- */
async function onVerify(url, env) {
  const cors = { 'access-control-allow-origin': new URL(env.GAME_URL).origin, 'content-type': 'application/json' };
  const uid = await readToken(env, url.searchParams.get('t') || '');
  if (!uid) return new Response(JSON.stringify({ ok: false, reason: 'invalid' }), { headers: cors });
  const st = await memberStatus(env, uid);
  if (st === 'error') return new Response(JSON.stringify({ ok: false, reason: 'error' }), { headers: cors });
  return new Response(JSON.stringify({ ok: st === 'member', reason: st === 'member' ? '' : 'unsubscribed' }), { headers: cors });
}

async function onSetup(url, env) {
  const lines = [];
  const me = await api(env, 'getMe');
  lines.push(me.ok ? '\u0411\u043e\u0442: @' + me.result.username : '\u0422\u043e\u043a\u0435\u043d \u0431\u043e\u0442\u0430 \u043d\u0435 \u043f\u043e\u0434\u0445\u043e\u0434\u0438\u0442: ' + me.description);
  const hook = await api(env, 'setWebhook', {
    url: url.origin + '/tg', secret_token: await hookSecret(env), allowed_updates: ['message', 'callback_query'],
  });
  lines.push(hook.ok ? '\u0412\u0435\u0431\u0445\u0443\u043a \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d.' : '\u0412\u0435\u0431\u0445\u0443\u043a \u043d\u0435 \u0443\u0441\u0442\u0430\u043d\u043e\u0432\u043b\u0435\u043d: ' + hook.description);
  if (me.ok) {
    const adm = await api(env, 'getChatMember', { chat_id: env.CHANNEL, user_id: me.result.id });
    lines.push(adm.ok && adm.result.status === 'administrator'
      ? '\u0411\u043e\u0442 \u2014 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440 \u043a\u0430\u043d\u0430\u043b\u0430 ' + env.CHANNEL + (adm.result.can_post_messages ? ', \u043c\u043e\u0436\u0435\u0442 \u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u0442\u044c \u043f\u043e\u0441\u0442\u044b. \u0412\u0441\u0451 \u0433\u043e\u0442\u043e\u0432\u043e.' : ', \u043d\u043e \u0431\u0435\u0437 \u043f\u0440\u0430\u0432\u0430 \u00ab\u041f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0439\u00bb \u2014 \u0432\u043a\u043b\u044e\u0447\u0438\u0442\u0435 \u0435\u0433\u043e, \u0438\u043d\u0430\u0447\u0435 \u00ab\u0421\u0446\u0435\u043d\u0430 \u0434\u043d\u044f\u00bb \u043d\u0435 \u0432\u044b\u0439\u0434\u0435\u0442.')
      : '\u0411\u043e\u0442 \u0435\u0449\u0451 \u043d\u0435 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440 \u043a\u0430\u043d\u0430\u043b\u0430 ' + env.CHANNEL + ' \u2014 \u0434\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0435\u0433\u043e \u0432 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u044b.');
  }
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

/* ---------- \u043f\u043e\u0434\u043f\u0438\u0441\u044c \u0441\u0441\u044b\u043b\u043e\u043a ---------- */
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(env, data) {
  const key = await crypto.subtle.importKey('raw', enc.encode(env.SIGN_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
}

async function hookSecret(env) {
  return (await hmac(env, 'webhook')).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
}

async function makeToken(env, uid) {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  return `${uid}.${exp}.${await hmac(env, uid + '.' + exp)}`;
}

async function readToken(env, t) {
  const [uid, exp, sig] = t.split('.');
  if (!uid || !exp || !sig || !/^\d+$/.test(uid) || !/^\d+$/.test(exp)) return null;
  if (+exp < Date.now() / 1000) return null;
  if ((await hmac(env, uid + '.' + exp)) !== sig) return null;
  return +uid;
}
