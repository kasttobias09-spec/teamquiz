// Gemeinsame Einstellungen für Host und Teams.
window.TQ = {
  // Firebase-Projekt (öffentliche Web-Konfiguration – kein Geheimnis)
  firebaseConfig: {
    apiKey: "AIzaSyA5iJX0IAgJxU8GyppCxSZr-u3i1ePFwgs",
    authDomain: "teamquiz-2820e.firebaseapp.com",
    databaseURL: "https://teamquiz-2820e-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "teamquiz-2820e",
    storageBucket: "teamquiz-2820e.firebasestorage.app",
    messagingSenderId: "848820588792",
    appId: "1:848820588792:web:5786a641a50bece59fab0d"
  },
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

