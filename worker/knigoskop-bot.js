// Книгоскопъ — доступ к игре по подписке на Telegram-канал.
// Cloudflare Worker: бот (вебхук /tg), проверка доступа для сайта (/verify), настройка вебхука (/setup).
//
// Настройки воркера (Settings → Variables and Secrets):
//   BOT_TOKEN — секрет, токен бота из @BotFather
//   SIGN_KEY  — секрет, любая длинная случайная строка (подпись ссылок доступа)
//   CHANNEL   — переменная, например @egeminkin
//   GAME_URL  — переменная, например https://lirik1200-ship-it.github.io/knigoskop-/
//   DAY_ON    — переменная, 1 = публиковать «Сцену дня» в канал по расписанию (Settings → Triggers → Cron)
// Бот должен быть администратором канала, иначе Telegram не покажет ему подписчиков.

const TTL = 30 * 24 * 3600; // ссылка доступа живёт 30 дней; подписка всё равно перепроверяется при входе

export default {
  async scheduled(event, env, ctx) {
    if (String(env.DAY_ON) === '1') ctx.waitUntil(postDay(env, env.CHANNEL));
  },
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/tg' && req.method === 'POST') return await onUpdate(req, env);
      if (url.pathname === '/verify') return await onVerify(url, env);
      if (url.pathname === '/setup') return await onSetup(url, env);
    } catch (e) {
      return new Response('error: ' + e.message, { status: 500 });
    }
    return new Response('Книгоскопъ: сервер доступа работает.');
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
  if (msg && /^\/preview\b/.test(msg.text || '')) {
    if (!(await isChannelAdmin(env, from.id))) {
      await api(env, 'sendMessage', { chat_id: chat, text: 'Пробный пост доступен только администраторам канала.' });
      return new Response('ok');
    }
    const n = parseInt((msg.text.split(/\s+/)[1] || ''), 10);
    const res = await postDay(env, chat, n > 0 ? n - 1 : null);
    if (res !== 'ok') await api(env, 'sendMessage', { chat_id: chat, text: res });
    return new Response('ok');
  }
  if (msg &&!(msg.text || '').startsWith('/start') && !/доступ|игр/i.test(msg.text || '')) {
    await api(env, 'sendMessage', { chat_id: chat, text: 'Нажмите /start, чтобы получить доступ к игре «Книгоскопъ».' });
    return new Response('ok');
  }

  const st = await memberStatus(env, from.id);
  if (st === 'member') {
    const token = await makeToken(env, from.id);
    await api(env, 'sendMessage', {
      chat_id: chat,
      text: 'Подписка подтверждена. Спасибо!\n\nНажмите кнопку, чтобы открыть «Книгоскопъ». Ссылка личная, работает 30 дней.',
      reply_markup: { inline_keyboard: [[{ text: 'Открыть игру', url: env.GAME_URL + '#access=' + token }]] },
    });
  } else if (st === 'none') {
    await api(env, 'sendMessage', {
      chat_id: chat,
      text: 'Игра «Книгоскопъ» открыта для подписчиков канала ' + env.CHANNEL + '.\n\nПодпишитесь и нажмите «Я подписался».',
      reply_markup: { inline_keyboard: [
        [{ text: 'Подписаться на канал', url: channelLink(env) }],
        [{ text: 'Я подписался', callback_data: 'check' }],
      ] },
    });
  } else {
    await api(env, 'sendMessage', { chat_id: chat, text: 'Не получилось проверить подписку. Попробуйте ещё раз через минуту.' });
  }
  return new Response('ok');
}

async function isChannelAdmin(env, uid) {
  const r = await api(env, 'getChatMember', { chat_id: env.CHANNEL, user_id: uid });
  return r.ok && (r.result.status === 'creator' || r.result.status === 'administrator');
}

/* ---------- сцена дня: расписание и вопросы лежат в day.json рядом с игрой ---------- */
// i — номер дня с нуля; без него берётся сегодняшний (для пробного поста до старта — первый)
async function postDay(env, chat, i) {
  const D = await (await fetch(env.GAME_URL + 'day.json?' + Date.now())).json();
  if (i == null) {
    i = Math.floor((Date.now() - Date.parse(D.start)) / 864e5);
    if (i < 0) {
      if (chat === env.CHANNEL) return 'Сцены дня ещё не начались';
      i = 0;
    }
  }
  const d = D.days[i % D.days.length];
  const photo = await api(env, 'sendPhoto', {
    chat_id: chat,
    photo: env.GAME_URL + 'img/day/' + d.id + '.jpg',
    caption: `Сцена дня № ${i + 1} · ${d.grade} класс\n\n` +
      'Где мы оказались? Угадайте произведение в опросе ниже, а в игре осмотритесь по кругу: в сцене спрятаны детали из текста.',
    reply_markup: { inline_keyboard: [[{ text: 'Осмотреть сцену в игре', url: env.GAME_URL + '?s=' + d.id + '&day=' + (i + 1) }]] },
  });
  if (!photo.ok) return 'Картинка не отправлена: ' + photo.description;
  const poll = await api(env, 'sendPoll', {
    chat_id: chat,
    question: 'Из какого произведения эта сцена?',
    options: d.options.map(text => ({ text })),
    type: 'quiz',
    correct_option_id: d.correct,
    explanation: d.explanation,
    is_anonymous: true,
  });
  return poll.ok ? 'ok' : 'Опрос не отправлен: ' + poll.description;
}

/* ---------- сайт ---------- */
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
  lines.push(me.ok ? 'Бот: @' + me.result.username : 'Токен бота не подходит: ' + me.description);
  const hook = await api(env, 'setWebhook', {
    url: url.origin + '/tg', secret_token: await hookSecret(env), allowed_updates: ['message', 'callback_query'],
  });
  lines.push(hook.ok ? 'Вебхук установлен.' : 'Вебхук не установлен: ' + hook.description);
  if (me.ok) {
    const adm = await api(env, 'getChatMember', { chat_id: env.CHANNEL, user_id: me.result.id });
    lines.push(adm.ok && adm.result.status === 'administrator'
      ? 'Бот — администратор канала ' + env.CHANNEL + '. Всё готово.'
      : 'Бот ещё не администратор канала ' + env.CHANNEL + ' — добавьте его в администраторы.');
  }
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

/* ---------- подпись ссылок ---------- */
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
