// ─── WebSocket client registry ────────────────────────────────────────────────
// Replaces lib/sse.js. Same push API so callers need no changes beyond
// swapping the require path.
//
// HOW TO USE (from any route):
//   const { wsPush } = require('../lib/ws');
//   wsPush(targetUserId, 'notification', { type: 'like' });

const wsClients = new Map(); // userId → Set<WebSocket>

const wsAdd = (userId, socket) => {
  if (!wsClients.has(userId)) wsClients.set(userId, new Set());
  wsClients.get(userId).add(socket);
};

const wsRemove = (userId, socket) => {
  wsClients.get(userId)?.delete(socket);
};

const wsPush = (userId, event, data) => {
  const clients = wsClients.get(userId);
  if (!clients?.size) return;
  const msg = JSON.stringify({ event, data });
  clients.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      try { ws.send(msg); } catch {}
    }
  });
};

module.exports = { wsAdd, wsRemove, wsPush };
