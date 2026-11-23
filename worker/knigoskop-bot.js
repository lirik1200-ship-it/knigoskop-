// Книгоскопъ — доступ к игре по подписке на Telegram-канал.
// Cloudflare Worker: бот (вебхук /tg), проверка доступа для сайта (/verify), настройка вебхука (/setup).
//
// Настройки воркера (Settings → Variables and Secrets):
//   BOT_TOKEN — секрет, токен бота из @BotFather
//   SIGN_KEY  — секрет, любая длинная случайная строка (подпись ссылок доступа)
//   CHANNEL   — переменная, например @egeminkin
//   GAME_URL  — переменная, например https://lirik1200-ship-it.github.io/knigoskop-/
//   DAY_ON    — переменная, 1 = публиковать «Сцену дня» (Cron `0 11,14 * * *` = 14:00 и 17:00 МСК; дни и время берутся из day.json)
//   IG_ON, IG_USER_ID, IG_TOKEN — публикация роликов в Instagram (см. блок «Instagram» ниже); команда /ig [n] — пробная публикация
//   VK_GROUP  — переменная, id сообщества ВКонтакте (число без минуса), например 243636418
//   VK_TOKEN  — секрет, ключ доступа сообщества (права: сообщения сообщества, управление сообществом)
//   VK_CONFIRM — переменная, строка подтверждения из «Работа с API → Callback API»
//   VK_SECRET — переменная, «Секретный ключ» из настроек Callback API (необязательно, но лучше задать)
//   DB        — привязка D1 (Bindings → D1 database): анонимная статистика игры. Без неё статистика просто не пишется
// Бот должен быть администратором канала, иначе Telegram не покажет ему подписчиков.

const TTL = 30 * 24 * 3600; // ссылка доступа живёт 30 дней; подписка всё равно перепроверяется при входе

export default {
  async scheduled(event, env, ctx) {
    if (String(env.DAY_ON) === '1') ctx.waitUntil(postDay(env, env.CHANNEL));
  },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/tg' && req.method === 'POST') return await onUpdate(req, env, ctx);
      if (url.pathname === '/vk' && req.method === 'POST') return await onVK(req, env, ctx);
      if (url.pathname === '/verify') return await onVerify(url, env);
      if (url.pathname === '/setup') return await onSetup(url, env);
      if (url.pathname === '/hit' && req.method === 'POST') return await onHit(req, env);
      if (url.pathname === '/report' && req.method === 'POST') return await onReport(req, env);
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
      await api(env, 'sendMessage', { chat_id: chat, text: 'Пробный пост доступен только администраторам канала.' });
      return new Response('ok');
    }
    const n = parseInt((msg.text.split(/\s+/)[1] || ''), 10);
    const res = await postDay(env, chat, n > 0 ? n - 1 : null);
    if (res !== 'ok') await api(env, 'sendMessage', { chat_id: chat, text: res });
    return new Response('ok');
  }
  if (msg && /^\/ig\b/.test(msg.text || '')) {
    // пробная публикация в Instagram: /ig [номер сцены]; ответ придёт сообщением в этот чат
    if (!(await isChannelAdmin(env, from.id))) {
      await api(env, 'sendMessage', { chat_id: chat, text: 'Публикация в Instagram доступна только администраторам канала.' });
      return new Response('ok');
    }
    const n = parseInt((msg.text.split(/\s+/)[1] || ''), 10);
    ctx.waitUntil((async () => {
      const res = await postDay(env, chat, n > 0 ? n - 1 : null, { ig: true });
      await api(env, 'sendMessage', { chat_id: chat, text: 'Instagram: ' + (res === 'ok' ? 'ролик опубликован.' : res) });
    })());
    return new Response('ok');
  }
  if (msg && /^\/stats\b/.test(msg.text || '')) {
    if (!(await isChannelAdmin(env, from.id))) {
      await api(env, 'sendMessage', { chat_id: chat, text: 'Статистика доступна только администраторам канала.' });
      return new Response('ok');
    }
    const n = parseInt((msg.text.split(/\s+/)[1] || ''), 10);
    await api(env, 'sendMessage', { chat_id: chat, text: await statsText(env, n > 0 && n <= 365 ? n : 7), parse_mode: 'HTML' });
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
      text: 'Подписка подтверждена. Спасибо!\n\nНажмите кнопку, чтобы открыть «Книгоскопъ» без ограничений. Ссылка личная, работает 30 дней.',
      reply_markup: { inline_keyboard: [[{ text: 'Открыть игру', url: env.GAME_URL + '#access=' + token }]] },
    });
  } else if (st === 'none') {
    await api(env, 'sendMessage', {
      chat_id: chat,
      text: 'Все сцены «Книгоскопа» открыты для подписчиков канала ' + env.CHANNEL + '. Без подписки можно сыграть две сцены в день.\n\nПодпишитесь и нажмите «Я подписался».',
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

/* ---------- ВКонтакте: бот в сообщениях сообщества (Callback API) ----------
   Ученик пишет сообществу → бот проверяет, вступил ли он, и присылает ту же ссылку доступа, что и в Telegram,
   только id с буквой v: v12345.<срок>.<подпись>. Игра проверяет её через /verify, как и телеграмную. */
async function vk(env, method, params) {
  const body = new URLSearchParams({ ...params, access_token: env.VK_TOKEN, v: '5.199' });
  const r = await fetch('https://api.vk.com/method/' + method, { method: 'POST', body });
  return r.json();
}
async function vkMember(env, uid) {
  if (!env.VK_TOKEN || !env.VK_GROUP) return 'error';
  const r = await vk(env, 'groups.isMember', { group_id: env.VK_GROUP, user_id: uid });
  if (r.error) return 'error';
  return r.response === 1 || (r.response && r.response.member === 1) ? 'member' : 'none';
}
const vkGroupLink = env => 'https://vk.ru/club' + env.VK_GROUP;
async function vkSend(env, peer, message, link) {
  const p = { peer_id: peer, random_id: String(Math.floor(Math.random() * 2e9)), message };
  if (link) p.keyboard = JSON.stringify({ inline: true, buttons: [[{ action: { type: 'open_link', link: link.url, label: link.label } }]] });
  return vk(env, 'messages.send', p);
}
async function onVK(req, env, ctx) {
  const u = await req.json().catch(() => ({}));
  if (String(u.group_id) !== String(env.VK_GROUP)) return new Response('ok');
  if (u.type === 'confirmation') return new Response(String(env.VK_CONFIRM || ''));
  if (env.VK_SECRET && u.secret !== env.VK_SECRET) return new Response('ok');
  const uid = u.type === 'message_new' ? u.object && u.object.message && u.object.message.from_id
    : u.type === 'group_join' ? u.object && u.object.user_id : null;
  if (uid > 0) ctx.waitUntil(vkReply(env, uid, u.type === 'group_join'));
  return new Response('ok'); // ВКонтакте ждёт «ok», иначе будет присылать событие снова
}
async function vkReply(env, uid, joined) {
  const st = await vkMember(env, uid);
  if (st === 'member') {
    const token = await makeToken(env, 'v' + uid);
    return vkSend(env, uid, (joined ? 'Спасибо, что вступили в сообщество!' : 'Подписка подтверждена. Спасибо!') +
      '\n\nНажмите кнопку, чтобы открыть «Книгоскопъ» без ограничений. Ссылка личная, работает 30 дней.',
      { url: env.GAME_URL + '#access=' + token, label: 'Открыть игру' });
  }
  if (st === 'none') return vkSend(env, uid, 'Все сцены «Книгоскопа» открыты для участников этого сообщества.\n\n' +
    'Вступите в сообщество по ссылке ' + vkGroupLink(env) + ', затем напишите сюда любое сообщение, и бот пришлёт ссылку на игру.');
  return vkSend(env, uid, 'Не получилось проверить подписку. Напишите ещё раз через минуту.');
}

/* ---------- сцена дня: расписание и вопросы лежат в day.json рядом с игрой ---------- */
const HOOKS = ['Узнаёте это место?', 'Где мы оказались?', 'Из какой книги этот вид?', 'В какую книгу мы заглянули?', 'Чья это история?'];
const hiddenDetails = n => {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return `спрятана ${n} деталь`;
  return a >= 2 && a <= 4 && (b < 12 || b > 14) ? `спрятаны ${n} детали` : `спрятано ${n} деталей`;
};

// расписание в day.json: start — первый день публикаций, schedule — {день недели: время по Москве}
// (0 = вс, 1 = пн … 6 = сб). Cron срабатывает в 14:00 и 17:00 МСК (`0 11,14 * * *`), поэтому время — одно из этих двух.
const WD = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];
const MSK = 3 * 3600e3;
const dayMSK = t => Math.floor((t + MSK) / 864e5);
const weekday = day => (day + 4) % 7; // 1 янв 1970 — четверг
const postTime = (D, day) => (D.schedule || {})[weekday(day)];
// номер публикации (с нуля) для даты day; -1, если до старта
function postIndex(D, day) {
  let n = -1;
  for (let x = dayMSK(Date.parse(D.start)); x <= day; x++) if (postTime(D, x)) n++;
  return n;
}
function nextPost(D, day) {
  for (let x = day + 1; x <= day + 7; x++) {
    const t = postTime(D, x);
    if (t) return (x === day + 1 ? 'завтра' : WD[weekday(x)]) + ' в ' + t;
  }
  return 'в ближайшие дни';
}

// i — номер публикации с нуля; без него берётся сегодняшняя (для пробного поста до старта — первая)
async function postDay(env, chat, i, opts) {
  const D = await (await fetch(env.GAME_URL + 'day.json?' + Date.now())).json();
  const now = Date.now(), today = dayMSK(now);
  if (i == null) {
    if (chat === env.CHANNEL) {
      const t = postTime(D, today), hour = new Date(now + MSK).getUTCHours();
      if (!t || parseInt(t, 10) !== hour) return 'Сейчас не время публикации';
    }
    i = postIndex(D, today);
    if (i < 0) {
      if (chat === env.CHANNEL) return 'Сцены дня ещё не начались';
      i = 0;
    }
  }
  const d = D.days[i % D.days.length];
  if (opts && opts.ig) return postInstagram(env, d, i, 5); // команда /ig: только Instagram
  const caption =`🔎 <b>СЦЕНА ДНЯ · № ${i + 1}</b>\n` +
    `<i>из <a href="${env.GAME_URL}">«Книгоскопа»</a>, моей игры по русской литературе</i>\n\n` +
    `<b>${HOOKS[i % HOOKS.length]}</b>\n` +
    'Панорама поворачивается по кругу, присмотритесь к деталям. Ответ выбирайте в викторине ниже 👇\n\n' +
    `В игре здесь ${hiddenDetails(d.spots)} из текста. Сколько найдёте вы?\n\n` +
    `#сцена_дня #книгоскоп #${d.grade}класс`;
  const reply_markup = { inline_keyboard: [[{ text: '🔭 Найти детали в игре', url: env.GAME_URL + '?s=' + d.id + '&day=' + (i + 1) }]] };
  const media = env.GAME_URL + 'img/day/' + d.id;
  // ролик-петля по кругу панорамы; если Telegram его не принял — обычная картинка
  let post = await api(env, 'sendAnimation', { chat_id: chat, animation: media + '.mp4', caption, parse_mode: 'HTML', reply_markup });
  if (!post.ok) post = await api(env, 'sendPhoto', { chat_id: chat, photo: media + '.jpg', caption, parse_mode: 'HTML', reply_markup });
  if (!post.ok) return 'Пост не отправлен: ' + post.description;
  const poll = await api(env, 'sendPoll', {
    chat_id: chat,
    question: 'Из какого произведения эта сцена?',
    options: d.options.map(text => ({ text })),
    type: 'quiz',
    correct_option_id: d.correct,
    explanation: `${d.explanation} Следующая сцена выйдет ${nextPost(D, today)}.`.slice(0, 200),
    is_anonymous: true,
  });
  let res = poll.ok ? 'ok' : 'Опрос не отправлен: ' + poll.description;
  // то же расписание и тот же ролик, но вертикальный и с голосом, уходит в Instagram
  if (chat === env.CHANNEL && String(env.IG_ON) === '1') {
    const ig = await postInstagram(env, d, i, 24);
    if (ig !== 'ok') res += ' · ' + ig;
  }
  return res;
}

/* ---------- Instagram: Reels через Graph API ----------
   Переменные воркера: IG_ON=1, IG_USER_ID (число — id профессионального аккаунта Instagram),
   IG_TOKEN (секрет — бессрочный токен страницы Facebook, к которой привязан аккаунт).
   Ролик берётся с сайта: img/day/<id>_v.mp4 (9:16, с голосом). Instagram сам скачивает его по ссылке. */
const IG_API = 'https://graph.facebook.com/v21.0/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function igCall(env, path, params, get) {
  const q = new URLSearchParams({ ...params, access_token: env.IG_TOKEN });
  const r = await fetch(IG_API + path + (get ? '?' + q : ''), get ? {} : { method: 'POST', body: q });
  return r.json();
}
// tries — сколько раз по 5 с проверять, обработал ли Instagram видео
async function postInstagram(env, d, i, tries) {
  if (!env.IG_USER_ID || !env.IG_TOKEN) return 'не заданы IG_USER_ID и IG_TOKEN';
  const caption = `СЦЕНА ДНЯ · № ${i + 1}\n\n${HOOKS[i % HOOKS.length]}\n` +
    `Панорама поворачивается по кругу, присмотритесь к деталям. В игре здесь ${hiddenDetails(d.spots)} из текста.\n\n` +
    'Из какого произведения эта сцена? Пишите ответ в комментариях 👇\n\n' +
    'Проверить себя можно в игре «Книгоскопъ»: ссылка в шапке профиля.\n\n' +
    `#сцена_дня #книгоскоп #${d.grade}класс #литература #егэ #русскаялитература`;
  const c = await igCall(env, env.IG_USER_ID + '/media', {
    media_type: 'REELS', video_url: env.GAME_URL + 'img/day/' + d.id + '_v.mp4', caption, share_to_feed: 'true',
  });
  if (!c.id) return 'контейнер не создан: ' + (c.error ? c.error.message : JSON.stringify(c));
  for (let k = 0; k < tries; k++) {
    await sleep(5000);
    const s = await igCall(env, c.id, { fields: 'status_code,status' }, true);
    if (s.status_code === 'FINISHED') {
      const p = await igCall(env, env.IG_USER_ID + '/media_publish', { creation_id: c.id });
      return p.id ? 'ok' : 'публикация не удалась: ' + (p.error ? p.error.message : JSON.stringify(p));
    }
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') return 'Instagram не принял видео: ' + (s.status || s.status_code);
  }
  return 'видео ещё обрабатывается, публикация не выполнена';
}

/* ---------- анонимная статистика игры (D1): только счётчики по дням, без пользователей и адресов ---------- */
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
const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // день по Москве
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

// сообщение об ошибке из игры: уходит владельцу канала (он должен хотя бы раз написать боту)
async function onReport(req, env) {
  const H = corsH(env);
  let b; try { b = JSON.parse(await req.text()); } catch (e) { return new Response('{"ok":false}', { headers: H }); }
  const id = String(b.id || '').slice(0, 24), text = String(b.text || '').trim().slice(0, 600);
  if (!/^[\w-]+$/.test(id) || text.length < 5) return new Response('{"ok":false}', { headers: H });
  const adm = await api(env, 'getChatAdministrators', { chat_id: env.CHANNEL });
  const owner = adm.ok && adm.result.find(m => m.status === 'creator');
  if (!owner) return new Response('{"ok":false}', { headers: H });
  const msg = '⚠️ Сообщение об ошибке в игре\n\n' +
    'Сцена: «' + String(b.title || '').slice(0, 120) + '» (' + id + ')\n' +
    (b.kind ? 'Где ошибка: ' + String(b.kind).slice(0, 40) + '\n' : '') + '\n' + text;
  const r = await api(env, 'sendMessage', { chat_id: owner.user.id, text: msg, reply_markup: { inline_keyboard: [[{ text: 'Открыть сцену', url: env.GAME_URL + '?s=' + id }]] } });
  if (r.ok) await countEvent(env, 'report', id).catch(() => {});
  return new Response(JSON.stringify({ ok: !!r.ok }), { headers: H });
}

async function statsText(env, days) {
  const D = await db(env);
  if (!D) return 'Статистика не подключена: в Cloudflare у воркера нет привязки базы D1 с именем DB.';
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
  const line = x => `«${names[x.id] || x.id}»: в среднем ${Math.round(avg(x))} очк., ответов ${x.n}`;
  const T = sc.reduce((a, x) => a + x.ti, 0) / 1500, A = sc.reduce((a, x) => a + x.au, 0) / 1000, Dr = sc.reduce((a, x) => a + x.dr, 0) / 1000;
  let t = `📊 <b>Книгоскопъ за ${days} ${days % 10 === 1 && days % 100 !== 11 ? 'день' : days % 10 >= 2 && days % 10 <= 4 && (days % 100 < 12 || days % 100 > 14) ? 'дня' : 'дней'}</b>\n\n` +
    `Открытий игры: <b>${E('open')}</b> (по ссылке из «Сцены дня» ${E('open', 'day')}, по ссылке учителя ${E('open', 'set')}, с иконки на телефоне ${E('open', 'app')})\n` +
    `Партий начато: <b>${E('start')}</b>, доиграно до итогов: <b>${E('finish')}</b> (${pc(E('finish'), E('start') - E('start', 'scene-slide') - E('start', 'hero-slide'))})\n` +
    `Игр на слайде: ${E('start', 'scene-slide') + E('start', 'hero-slide')}, «Угадай героя»: ${E('start', 'hero')}\n` +
    `Сцен открыто: ${V}, отвечено: ${N} (${pc(N, V)})\n` +
    `Верно названо произведение: ${pc(Math.round(T), N)}, автор: ${pc(Math.round(A), N)}, направление: ${pc(Math.round(Dr), N)}\n` +
    `Листов распечатано: ${E('print')}, установок на телефон: ${E('install')}, сообщений об ошибках: ${E('report')}`;
  const hard = enough.slice(0, Math.min(5, Math.ceil(enough.length / 2))), easy = enough.slice(hard.length).reverse().slice(0, 5);
  if (hard.length) t += '\n\n<b>Труднее всего</b>\n' + hard.map(line).join('\n');
  if (easy.length) t += '\n\n<b>Легче всего</b>\n' + easy.map(line).join('\n');
  if (!enough.length && N) t += '\n\nТрудные и лёгкие сцены появятся, когда на каждую придёт хотя бы 3 ответа.';
  return t + '\n\nЗа другой срок: /stats 30';
}

/* ---------- сайт ---------- */
async function onVerify(url, env) {
  const cors = { 'access-control-allow-origin': new URL(env.GAME_URL).origin, 'content-type': 'application/json' };
  const uid = await readToken(env, url.searchParams.get('t') || '');
  if (!uid) return new Response(JSON.stringify({ ok: false, reason: 'invalid' }), { headers: cors });
  const st = String(uid)[0] === 'v' ? await vkMember(env, String(uid).slice(1)) : await memberStatus(env, uid);
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
      ? 'Бот — администратор канала ' + env.CHANNEL + (adm.result.can_post_messages ? ', может публиковать посты. Всё готово.' : ', но без права «Публикация сообщений» — включите его, иначе «Сцена дня» не выйдет.')
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
  if (!uid || !exp || !sig || !/^v?\d+$/.test(uid) || !/^\d+$/.test(exp)) return null;
  if (+exp < Date.now() / 1000) return null;
  if ((await hmac(env, uid + '.' + exp)) !== sig) return null;
  return uid[0] === 'v' ? uid : +uid; // v12345 — ВКонтакте, число — Telegram
}
