// Verbindungsschicht über Firebase Realtime Database.
// Stellt eine PeerJS-kompatible Schnittstelle bereit (new Peer(id) = Host, new Peer() = Client,
// peer.connect(id), conn.send/on("open"|"data"|"close"|"error"), …), damit der Rest des Quiz unverändert bleibt.
// Es gibt keine Direktverbindungen zwischen Geräten – alles läuft über Firebase (Port 443).
//
// Datenmodell:  peers/{hostId}/host            {owner, ts}     – Host ist online (onDisconnect: entfernt)
//               peers/{hostId}/clients/{cid}   {ts}            – verbundene Clients (onDisconnect: entfernt)
//               peers/{hostId}/in/{cid}/{push} {j}             – Nachrichten Client → Host
//               peers/{hostId}/out/{cid}/{push}{j}             – Nachrichten Host → Client
(() => {
  firebase.initializeApp(TQ.firebaseConfig);
  const db = firebase.database();
  const TS = firebase.database.ServerValue.TIMESTAMP;
  const rand = () => Math.random().toString(36).slice(2, 12);
  const pack = m => ({ j: JSON.stringify(m) });
  const unpack = v => { try { return JSON.parse(v.j); } catch { return null; } };

  // Verbindungsstatus zu Firebase (gemeinsam für alle Instanzen)
  let fbOnline = false;
  const onlineListeners = new Set();
  db.ref(".info/connected").on("value", s => { fbOnline = !!s.val(); onlineListeners.forEach(f => f(fbOnline)); });

  class Emitter {
    constructor() { this._h = {}; }
    on(e, f) { (this._h[e] = this._h[e] || []).push(f); return this; }
    off(e, f) { if (this._h[e]) this._h[e] = this._h[e].filter(x => x !== f); return this; }
    emit(e, ...a) { (this._h[e] || []).slice().forEach(f => { try { f(...a); } catch (err) { console.error(err); } }); }
  }

  // ---------- Host-seitige Verbindung zu einem Client ----------
  class HostConn extends Emitter {
    constructor(base, cid) {
      super();
      this.peer = cid; this.open = true;
      this._in = db.ref(`${base}/in/${cid}`);
      this._out = db.ref(`${base}/out/${cid}`);
      this._onIn = this._in.on("child_added", s => { const m = unpack(s.val() || {}); s.ref.remove(); if (m) this.emit("data", m); });
      setTimeout(() => this.emit("open"), 0);
    }
    send(m) { if (this.open) this._out.push(pack(m)); }
    _close(cleanup) {
      if (!this.open) return;
      this.open = false;
      this._in.off("child_added", this._onIn);
      if (cleanup) { this._in.remove(); this._out.remove(); }
      this.emit("close");
    }
    close() { this._close(true); }
  }

  // ---------- Client-seitige Verbindung zum Host ----------
  class ClientConn extends Emitter {
    constructor(peer, hostId) {
      super();
      this.peer = hostId; this.open = false; this._p = peer; this._closed = false;
      const base = `peers/${hostId}`, cid = peer.id + "-" + rand(); // pro Verbindung eindeutig
      this._hostRef = db.ref(`${base}/host`);
      this._me = db.ref(`${base}/clients/${cid}`);
      this._in = db.ref(`${base}/in/${cid}`);
      this._out = db.ref(`${base}/out/${cid}`);
      this._onHost = this._hostRef.on("value", s => {
        const v = s.val();
        if (this._closed) return;
        if (!v) {                                  // Host nicht (mehr) da
          if (this.open) this._close();
          else if (!this._reported) { this._reported = true; peer.emit("error", { type: "peer-unavailable" }); }
          return;
        }
        if (this.open && this._owner && v.owner !== this._owner) { this._close(); return; } // Host neu gestartet
        if (!this.open) {
          this._owner = v.owner;
          this._out.remove().then(() => {
            if (this._closed) return;
            this._me.onDisconnect().remove();
            this._in.onDisconnect().remove();
            this._me.set({ ts: TS });
            this._onOut = this._out.on("child_added", m => { const d = unpack(m.val() || {}); m.ref.remove(); if (d) this.emit("data", d); });
            this.open = true;
            this.emit("open");
          });
        }
      });
      // Firebase-Verbindung verloren → Verbindung als geschlossen melden (Quiz verbindet automatisch neu)
      this._onNet = on => { if (!on && this.open) this._close(); };
      onlineListeners.add(this._onNet);
    }
    send(m) { if (this.open) this._in.push(pack(m)); }
    _close() {
      if (this._closed) return;
      this._closed = true;
      const wasOpen = this.open;
      this.open = false;
      this._hostRef.off("value", this._onHost);
      if (this._onOut) this._out.off("child_added", this._onOut);
      onlineListeners.delete(this._onNet);
      this._me.remove(); this._me.onDisconnect().cancel();
      if (wasOpen) this.emit("close");
    }
    close() { this._close(); }
  }

  // ---------- Peer (Host oder Client) ----------
  class Peer extends Emitter {
    constructor(id, opts) {
      super();
      if (typeof id === "object" || id === undefined) { opts = id; id = null; }
      this._isHost = !!id;
      this.id = id || rand();
      this.open = false; this.destroyed = false; this.disconnected = false;
      this._conns = new Map();
      setTimeout(() => this._start(), 0);
    }
    _start() {
      if (this.destroyed) return;
      this._onNet = on => {
        if (this.destroyed) return;
        if (on) {
          if (this._isHost) this._claim();
          if (this.disconnected || !this.open) { this.disconnected = false; this.open = true; this.emit("open", this.id); }
        } else if (this.open) { this.disconnected = true; this.emit("disconnected"); }
      };
      onlineListeners.add(this._onNet);
      if (this._isHost) this._listenClients();
      if (fbOnline) this._onNet(true);
      // Falls Firebase gar nicht erreichbar ist
      this._failT = setTimeout(() => { if (!this.open && !this.destroyed) this.emit("error", { type: "network" }); }, 12000);
    }
    // Host: Raum beanspruchen (neue Sitzung → alte Daten verwerfen)
    _claim() {
      const base = db.ref(`peers/${this.id}`);
      if (!this._owner) {
        this._owner = rand();
        base.child("in").remove(); base.child("out").remove(); base.child("clients").remove();
      }
      base.child("host").onDisconnect().remove();
      base.child("host").set({ owner: this._owner, ts: TS });
    }
    _listenClients() {
      const base = `peers/${this.id}`;
      const cref = db.ref(`${base}/clients`);
      this._onAdd = cref.on("child_added", s => {
        const cid = s.key;
        if (this._conns.has(cid)) return;
        const c = new HostConn(base, cid);
        this._conns.set(cid, c);
        this.emit("connection", c);
      });
      this._onRem = cref.on("child_removed", s => {
        const c = this._conns.get(s.key);
        if (c) { this._conns.delete(s.key); c._close(true); }
      });
      this._cref = cref;
    }
    connect(hostId) { return new ClientConn(this, hostId); }
    reconnect() { /* Firebase verbindet automatisch neu */ }
    destroy() {
      if (this.destroyed) return;
      this.destroyed = true; this.open = false;
      clearTimeout(this._failT);
      onlineListeners.delete(this._onNet);
      if (this._isHost) {
        if (this._cref) { this._cref.off("child_added", this._onAdd); this._cref.off("child_removed", this._onRem); }
        db.ref(`peers/${this.id}/host`).remove();
        this._conns.forEach(c => c._close(false));
      }
    }
  }

  window.Peer = Peer;
})();
