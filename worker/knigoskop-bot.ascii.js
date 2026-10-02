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
// \u0411\u043e\u0442 \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440\u043e\u043c \u043a\u0430\u043d\u0430\u043b\u0430, \u0438\u043d\u0430\u0447\u0435 Telegram \u043d\u0435 \u043f\u043e\u043a\u0430\u0436\u0435\u0442 \u0435\u043c\u0443 \u043f\u043e\u0434\u043f\u0438\u0441\u0447\u0438\u043a\u043e\u0432.

const TTL = 30 * 24 * 3600; // \u0441\u0441\u044b\u043b\u043a\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u0436\u0438\u0432\u0451\u0442 30 \u0434\u043d\u0435\u0439; \u043f\u043e\u0434\u043f\u0438\u0441\u043a\u0430 \u0432\u0441\u0451 \u0440\u0430\u0432\u043d\u043e \u043f\u0435\u0440\u0435\u043f\u0440\u043e\u0432\u0435\u0440\u044f\u0435\u0442\u0441\u044f \u043f\u0440\u0438 \u0432\u0445\u043e\u0434\u0435

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/tg' && req.method === 'POST') return await onUpdate(req, env);
      if (url.pathname === '/verify') return await onVerify(url, env);
      if (url.pathname === '/setup') return await onSetup(url, env);
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

async function onUpdate(req, env) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== (await hookSecret(env))) {
    return new Response('forbidden', { status: 403 });
  }
  const u = await req.json();
  const msg = u.message, cb = u.callback_query;
  const from = msg ? msg.from : cb ? cb.from : null;
  const chat = msg ? msg.chat.id : cb ? cb.message.chat.id : null;
  if (!from || !chat) return new Response('ok');
  if (cb) await api(env, 'answerCallbackQuery', { callback_query_id: cb.id });
  if (msg && !(msg.text || '').startsWith('/start') && !/\u0434\u043e\u0441\u0442\u0443\u043f|\u0438\u0433\u0440/i.test(msg.text || '')) {
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
      ? '\u0411\u043e\u0442 \u2014 \u0430\u0434\u043c\u0438\u043d\u0438\u0441\u0442\u0440\u0430\u0442\u043e\u0440 \u043a\u0430\u043d\u0430\u043b\u0430 ' + env.CHANNEL + '. \u0412\u0441\u0451 \u0433\u043e\u0442\u043e\u0432\u043e.'
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
