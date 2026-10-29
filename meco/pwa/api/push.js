/**
 * MECO POWER SUPPLY — Web Push sender (Vercel serverless function)
 * GAS (Code.gs) ayaa halkan u soo dira ogeysiisyada; function-kan ayaa u gudbiya telefoonnada
 * (pop-up, cod leh), xitaa marka app-ku xiran yahay.
 * Furayaasha waxaa lagu beddeli karaa Vercel → Settings → Environment Variables:
 *   VAPID_PUBLIC, VAPID_PRIVATE, PUSH_SECRET
 * Furayaashu waa kuwii hore (Koronto Pay) — sidaas darteed qof kasta oo hore u oggolaaday ogeysiisyada wuu sii helayaa.
 */
const webpush = require('web-push');

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC  || 'BAI6NbCec4VdM7RjGOYqxxa2X2y4D7Z-vwuC9BzU15-0BBG2IP7SXz7XRUS0RLJgIYj_EsTM-llaLzmsDKrPY2o';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE || '18zv3s8xrfLjrFPfVWikOy7CahBtyxTjFgRCACfGIiU';
const PUSH_SECRET   = process.env.PUSH_SECRET   || 'QJiu4v0ubUjkfuwKvDGhil6ZBYMU-wOM';

webpush.setVapidDetails('mailto:admin@meco-power-supply.app', VAPID_PUBLIC, VAPID_PRIVATE);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, service: 'meco-push', publicKey: VAPID_PUBLIC });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST only' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  if (body.secret !== PUSH_SECRET) return res.status(401).json({ ok: false, error: 'bad secret' });

  const msgs = Array.isArray(body.messages) ? body.messages.slice(0, 1000) : [];
  const expired = [];
  let sent = 0, failed = 0;

  const one = async m => {
    if (!m || !m.sub || !m.sub.endpoint) { failed++; return; }
    const payload = JSON.stringify(Object.assign({ title: 'MECO POWER SUPPLY', body: '', url: './' }, m.payload || {}));
    try {
      // urgency 'high' → telefoonku isla markiiba ayuu soo bandhigaa (xitaa Doze mode); TTL 24 saac haddii telefoonku dansan yahay
      await webpush.sendNotification(m.sub, payload, { TTL: 86400, urgency: 'high' });
      sent++;
    } catch (e) {
      failed++;
      if (e && (e.statusCode === 404 || e.statusCode === 410)) expired.push(m.sub.endpoint);
    }
  };

  // 25 isku mar — degdeg, laakiin ma culeysiyo function-ka
  for (let i = 0; i < msgs.length; i += 25) await Promise.all(msgs.slice(i, i + 25).map(one));

  return res.status(200).json({ ok: true, sent, failed, expired });
};
