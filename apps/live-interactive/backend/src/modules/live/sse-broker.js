const subscribersBySessionId = new Map();
const heartbeatByResponse = new Map();

function sendEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function subscribe(sessionId, res) {
  const key = String(sessionId);
  const clients = subscribersBySessionId.get(key) || new Set();
  clients.add(res);
  subscribersBySessionId.set(key, clients);

  res.write(":ok\n\n");
  const timer = setInterval(() => {
    res.write(`: keepalive ${Date.now()}\n\n`);
  }, 25000);
  heartbeatByResponse.set(res, timer);
}

function unsubscribe(sessionId, res) {
  const key = String(sessionId);
  const clients = subscribersBySessionId.get(key);
  if (clients) {
    clients.delete(res);
    if (clients.size === 0) {
      subscribersBySessionId.delete(key);
    }
  }

  const timer = heartbeatByResponse.get(res);
  if (timer) {
    clearInterval(timer);
    heartbeatByResponse.delete(res);
  }
}

function emit(sessionId, eventName, data) {
  const clients = subscribersBySessionId.get(String(sessionId));
  if (!clients) {
    return;
  }
  for (const client of clients) {
    sendEvent(client, eventName, data);
  }
}

module.exports = {
  subscribe,
  unsubscribe,
  emit,
  sendEvent
};
