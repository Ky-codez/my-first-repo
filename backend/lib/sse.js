// ─── Server-Sent Events registry ─────────────────────────────────────────────
// Keeps track of every open notification stream so any route can push a
// real-time event to a specific user (they may have several tabs open).
//
// HOW TO USE:
//   const { ssePush } = require('../lib/sse');
//   ssePush(targetUserId, 'notification', { type: 'like' });

const sseClients = new Map(); // userId → Set<res>

const sseAdd = (userId, res) => {
  if (!sseClients.has(userId)) sseClients.set(userId, new Set());
  sseClients.get(userId).add(res);
};

const sseRemove = (userId, res) => {
  sseClients.get(userId)?.delete(res);
};

const ssePush = (userId, event, data) => {
  const clients = sseClients.get(userId);
  if (!clients?.size) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => { try { res.write(msg); } catch {} });
};

module.exports = { sseAdd, sseRemove, ssePush };
