// Gemeinsame Einstellungen für Host und Teams.
window.TQ = {
  // Präfix für die PeerJS-ID des Hosts (muss auf dem öffentlichen PeerJS-Server eindeutig sein).
  PEER_PREFIX: "teamquiz-q7x3-",
  peerOptions: {
    debug: 1,
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
        // Optional: TURN-Server eintragen, falls Mobilfunk/Firewall direkte Verbindungen blockiert, z.B.
        // { urls: "turn:DEIN-TURN-SERVER:3478", username: "...", credential: "..." }
      ]
    }
  },
  LETTERS: ["A", "B", "C", "D"],
  esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
};
