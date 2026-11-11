// Gemeinsame Einstellungen für Host und Teams.
window.TQ = {
  // Präfix für die PeerJS-ID des Hosts (muss auf dem öffentlichen PeerJS-Server eindeutig sein).
  PEER_PREFIX: "teamquiz-q7x3-",
  peerOptions: {
    debug: 1,
    config: {
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
        // Relay-Server (TURN) von PeerJS: werden genutzt, wenn keine Direktverbindung möglich ist
        // (iPhone-Hotspot, Mobilfunk, Firewalls). Ohne diese klappt die Verbindung nur sporadisch.
        {
          urls: [
            "turn:eu-0.turn.peerjs.com:3478",
            "turn:us-0.turn.peerjs.com:3478",
            "turn:eu-0.turn.peerjs.com:3478?transport=tcp",
            "turn:us-0.turn.peerjs.com:3478?transport=tcp"
          ],
          username: "peerjs",
          credential: "peerjsp"
        }
        // Optional: eigener TURN-Server, z.B. { urls: "turns:DEIN-SERVER:443", username: "...", credential: "..." }
      ]
    }
  },
  LETTERS: ["A", "B", "C", "D"],
  esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
};

// Diagnose: mit ?relay=1 in der Adresse wird die Verbindung erzwungen über den Relay-Server aufgebaut.
if (/[?&]relay=1/.test(location.search)) window.TQ.peerOptions.config.iceTransportPolicy = "relay";
