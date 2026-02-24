const clientsByUserId = new Map();

function addClient(userId, res) {
  const key = String(userId);
  const clients = clientsByUserId.get(key) || new Set();
  clients.add(res);
  clientsByUserId.set(key, clients);
}

function removeClient(userId, res) {
  const key = String(userId);
  const clients = clientsByUserId.get(key);
  if (!clients) {
    return;
  }
  clients.delete(res);
  if (clients.size === 0) {
    clientsByUserId.delete(key);
  }
}

function sendEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function publishToUser(userId, eventName, payload) {
  const clients = clientsByUserId.get(String(userId));
  if (!clients) {
    return;
  }
  for (const client of clients) {
    sendEvent(client, eventName, payload);
  }
}

function startHeartbeat(res) {
  const timer = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 25000);
  return () => clearInterval(timer);
}

module.exports = {
  addClient,
  removeClient,
  sendEvent,
  publishToUser,
  startHeartbeat
};
