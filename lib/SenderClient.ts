
let backendWs: WebSocket | null = null;

function connectBackend() {
  backendWs = new WebSocket("http://localhost:3005");

  backendWs.addEventListener("open", () => {
    console.log("[Sniffer] Connected to backend");

    // Identify as user when first connected
    backendWs?.send(JSON.stringify({ type: "ROLE", role: "user" }));
  });

  backendWs.addEventListener("close", () => {
    console.log("[Sniffer] Backend WS closed. Reconnecting...");
    setTimeout(connectBackend, 1000);
  });

  backendWs.addEventListener("error", (e) =>
    console.error("[Sniffer] Backend WS error:", e)
  );

  backendWs.addEventListener("message", (event) => {
    try {
      const msg = JSON.parse(event.data);
      console.log("[Sniffer] Message from backend:", msg);
      // here you can handle admin messages if needed

      if(msg.data==="next"){ 
        window.location.href = "/verify"; // ✅ works outside React
      }
      
    } catch (err) {
      console.error("[Sniffer] Invalid backend message:", event.data);
    }
  });
}

connectBackend();

export function SenderClient(data: string) {
  if (backendWs && backendWs.readyState === WebSocket.OPEN) {
    backendWs.send(JSON.stringify({ type: "MESSAGE", data }));
  }
}
