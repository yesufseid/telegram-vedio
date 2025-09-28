let backendWs: WebSocket | null = null;

function connectBackend() {
  backendWs = new WebSocket("wss://aviater-backend.onrender.com");

  backendWs.addEventListener("open", () => {
    console.log("[Admin] Connected to backend");

    // Identify as admin when first connected
    backendWs?.send(JSON.stringify({ type: "ROLE", role: "admin" }));
  });

  backendWs.addEventListener("close", () => {
    console.log("[Admin] Backend WS closed. Reconnecting...");
    setTimeout(connectBackend, 1000);
  });

  backendWs.addEventListener("error", (e) =>
    console.error("[Admin] Backend WS error:", e)
  );

  backendWs.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);
      console.log("[Admin] Message from backend:", msg);

      switch (msg.type) {
        case "WELCOME":
          console.log("[Admin] Registered as admin");
          break;

        case "USER_CONNECTED":
          console.log("[Admin] A user connected:", msg.message);
          break;

        case "USER_MESSAGE":
          console.log("[Admin] User says:", msg.data);
          // you could auto-reply here if you want
          break;

        default:
          console.log("[Admin] Unknown message:", msg);
      }
    } catch (err) {
      console.error("[Admin] Invalid backend message:", event.data);
    }
  });
}

connectBackend();
