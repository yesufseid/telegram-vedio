"use client"
import React, { useEffect, useRef, useState } from "react";

type Message = {
  from: "user" | "system";
  text: string;
};

const AdminDashboard: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState("Disconnected");
  const wsRef = useRef<WebSocket | null>(null);
   const receivedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    function connect() {
      // Avoid creating multiple connections
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
      const ws = new WebSocket("http://localhost:3005");
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("Connected ✅");
        ws.send(JSON.stringify({ type: "ROLE", role: "admin" }));
      };

      ws.onclose = () => {
        setStatus("Disconnected ❌, reconnecting...");
        setTimeout(connect, 1000);
      };

      ws.onerror = (err) => {
        console.error("[Admin WS error]", err);
        setStatus("Error ⚠️");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case "WELCOME":
              console.log("[Admin] Registered as admin");
              break;

            case "USER_CONNECTED":
              setMessages((prev) => [
                ...prev,
                { from: "system", text:msg.data },
              ]);
              break;

            case "USER_MESSAGE":
              setMessages((prev) => [
                ...prev,
                { from: "user", text: msg.data },
              ]);
              break;

            default:
              console.log("[Admin] Unknown msg:", msg);
          }
        } catch (e) {
          console.error("Invalid WS message:", event.data);
        }
      };
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const sendMessage = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type:"ROLE", role:"admin", data:"next" }));
      console.log(JSON.stringify({ type:"ROLE", role:"admin", data:"next" }));

    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "20px auto", fontFamily: "sans-serif" }}>
      <h2>👑 Admin Dashboard</h2>
      <p>Status: {status}</p>

      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          height: "300px",
          overflowY: "auto",
          background: "#f9f9f9",
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: "8px" }}>
            <b>{msg.from === "user" ? "User" : "System"}:</b> {msg.text}
          </div>
        ))}
      </div>

      <div style={{ marginTop: "10px" }}>
        <button className="border-2 border-amber-300 cursor-pointer  " onClick={()=>sendMessage()} style={{ padding: "6px 12px", marginLeft: "5px" }}>
          Next
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
