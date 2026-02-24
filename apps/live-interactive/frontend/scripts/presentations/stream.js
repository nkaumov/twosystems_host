export function connectPresentationStream({ onCreated, onDeleted, onError }) {
  const stream = new EventSource("/api/realtime/presentations/stream", {
    withCredentials: true
  });

  stream.addEventListener("presentation.created", (event) => {
    const payload = JSON.parse(event.data);
    onCreated(payload);
  });

  stream.addEventListener("presentation.deleted", (event) => {
    const payload = JSON.parse(event.data);
    onDeleted(payload);
  });

  stream.onerror = () => {
    onError();
  };

  return () => {
    stream.close();
  };
}
