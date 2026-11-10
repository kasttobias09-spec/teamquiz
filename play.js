(() => {
  const { esc, LETTERS } = TQ;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  let room = (params.get("room") || "").toUpperCase().trim();
  let me = null;           // { teamId, name }
  let peer = null, conn = null, retryTimer = null;
  let st = null;           // letzter Zustand vom Host
  const starts = {};       // idx -> lokaler Startzeitpunkt (performance.now)
  const pending = {};      // idx -> gewählte Antwort (bis der Host bestätigt)
  let stopped = false;

  const storeKey = () => "tq-team-" + room;
  function loadMe() { try { me = JSON.parse(localStorage.getItem(storeKey())); } catch { me = null; } }

  function setConn(on, text) {
    $("conn").className = "conn " + (on ? "on" : "off");
    $("conn").textContent = text || (on ? "verbunden" : "offline");
  }

  // ---------- Join-Formular ----------
  function showJoin(msg) {
    $("view").innerHTML = `<div class="card">
      <h1>Mitspielen</h1>
      ${msg ? `<p style="color:var(--warn)">${esc(msg)}</p>` : ""}
      <p class="muted">Ein Handy pro Team.</p>
      <label class="muted small">Raumcode</label>
      <input id="iRoom" value="${esc(room)}" maxlength="4" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase;letter-spacing:.2em;margin-bottom:.8rem">
      <label class="muted small">Teamname</label>
      <input id="iName" maxlength="24" placeholder="z. B. Die Besserwisser" autocomplete="off" style="margin-bottom:1rem">
      <button class="primary" id="bGo" style="width:100%;font-size:1.2rem">Beitreten</button>
    </div>`;
    if (room) $("iName").focus();
    $("bGo").onclick = () => {
      const r = $("iRoom").value.toUpperCase().trim(), n = $("iName").value.trim();
      if (r.length !== 4) return alert("Bitte den 4-stelligen Raumcode eingeben.");
      if (!n) return alert("Bitte einen Teamnamen eingeben.");
      room = r; history.replaceState(null, "", "?room=" + r);
      loadMe();
      if (!me) me = { teamId: null, name: n };
      me.name = n;
      connect();
    };
  }

  // ---------- Verbindung ----------
  function connect() {
    stopped = false;
    $("view").innerHTML = `<div class="card center"><p>Verbinde mit Raum <b>${esc(room)}</b> …</p></div>`;
    if (!peer || peer.destroyed) {
      peer = new Peer(TQ.peerOptions);
      setConn(false, "Verbinde mit Server…");
      const p0 = peer;
      setTimeout(() => { if (!p0.open && !p0.destroyed) { setConn(false, "Server nicht erreichbar"); diag("Schritt 1 hängt: Vermittlungsserver (0.peerjs.com) antwortet nicht – vermutlich im Netz blockiert."); } }, 10000);
      peer.on("open", openConn);
      peer.on("disconnected", () => { setConn(false, "Netz weg…"); setTimeout(() => { if (!peer.destroyed && peer.disconnected) peer.reconnect(); }, 1500); });
      peer.on("error", e => {
        if (e.type === "peer-unavailable") { setConn(false, "Raum nicht gefunden"); diag("Schritt 2 hängt: Raumcode " + room + " ist nicht online. Ist host.html auf dem Laptop offen und zeigt „● online“? Stimmt der Code?"); }
        else { setConn(false, "Fehler: " + e.type); diag("Schritt 1 hängt: Vermittlungsserver (0.peerjs.com) nicht erreichbar – Fehler „" + e.type + "“. Vermutlich blockiert das Netzwerk ihn."); }
        if (["network", "server-error", "socket-error", "socket-closed"].includes(e.type) && peer.destroyed) peer = null;
        retry();
      });
    } else if (peer.open) openConn();
    else if (peer.disconnected) peer.reconnect();
  }
  function diag(msg) {
    if (st) return; // schon im Spiel – nichts überschreiben
    $("view").innerHTML = `<div class="card"><p>Verbinde mit Raum <b>${esc(room)}</b> …</p><p class="muted small">${esc(msg)}</p><p class="muted small">Neuer Versuch läuft automatisch.</p></div>`;
  }
  function retry() {
    if (stopped) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (conn && conn.open) return;
      if (!peer || peer.destroyed) connect();
      else if (peer.disconnected) peer.reconnect();
      else if (peer.open) openConn();
    }, 2500);
  }
  function openConn() {
    if (conn) { try { conn.close(); } catch {} }
    const c = peer.connect(TQ.PEER_PREFIX + room, { reliable: true });
    conn = c;
    setConn(false, "Server ok – suche Raum…");
    const t = setTimeout(() => {
      if (!c.open) {
        setConn(false, "Direktverbindung blockiert?");
        diag("Schritt 3 hängt: Raum gefunden, aber die Direktverbindung (WebRTC) kommt nicht zustande – vermutlich blockiert das Netzwerk sie.");
        try { c.close(); } catch {} retry();
      }
    }, 10000);
    setTimeout(() => {
      const pc = c.peerConnection;
      if (pc) pc.addEventListener("iceconnectionstatechange", () => { if (!c.open) setConn(false, "Verbindung: " + pc.iceConnectionState); });
    }, 0);
    c.on("open", () => {
      clearTimeout(t);
      setConn(true);
      c.send({ t: "join", teamId: me && me.teamId, name: me && me.name });
    });
    c.on("data", onData);
    c.on("close", () => { if (conn === c) { setConn(false, "getrennt – verbinde neu…"); retry(); } });
    c.on("error", () => retry());
  }

  function onData(d) {
    if (!d || typeof d !== "object") return;
    if (d.t === "welcome") {
      me = { teamId: d.teamId, name: d.name };
      localStorage.setItem(storeKey(), JSON.stringify(me));
      $("team").textContent = d.name;
    } else if (d.t === "reject") {
      stopped = true;
      localStorage.removeItem(storeKey()); me = null;
      try { conn.close(); } catch {}
      setConn(false);
      showJoin(d.reason);
    } else if (d.t === "state") {
      if (d.phase === "open" && d.type === "mc" && starts[d.idx] === undefined) {
        starts[d.idx] = performance.now() - (d.ansMs - d.remainingMs);
      }
      st = d;
      render();
    }
  }

  function answer(k) {
    if (!st || st.phase !== "open" || st.myChoice !== null || pending[st.idx] !== undefined) return;
    pending[st.idx] = k;
    const el = performance.now() - starts[st.idx];
    try { conn.send({ t: "answer", idx: st.idx, choice: k, elapsedMs: el }); } catch {}
    if (navigator.vibrate) navigator.vibrate(30);
    render();
  }

  // ---------- Anzeige ----------
  function render() {
    if (!st) return;
    $("team").textContent = st.name;
    $("sc").textContent = st.score != null ? `${st.score} P · ${st.rank}.` : "";
    $("sc").style.display = st.score != null ? "" : "none";
    const v = $("view");
    if (st.type === "mc") {
      const chosen = st.myChoice !== null ? st.myChoice : pending[st.idx];
      if (st.phase === "show") {
        v.innerHTML = `<div class="card center"><p class="muted">${esc(st.category || "")}</p><h1>Gleich geht's los …</h1><p class="muted">Schaut nach vorne!</p></div>`;
      } else if (st.phase === "open" || st.phase === "closed") {
        const locked = chosen !== undefined && chosen !== null;
        v.innerHTML = `<div class="card"><p class="muted small" style="margin:0 0 .3rem">${esc(st.category || "")}${st.mult > 1 ? " · ×" + st.mult : ""}</p><div class="q">${esc(st.q)}</div></div>
          <div class="pbar"><div id="pb"></div></div>
          <p class="center muted" id="pinfo" style="margin:0"></p>
          <div class="pbtns ${locked || st.phase === "closed" ? "locked" : ""}">
          ${st.a.map((t, k) => `<button class="pbtn c${LETTERS[k]} ${chosen === k ? "sel" : ""}" data-k="${k}" ${locked || st.phase === "closed" ? "disabled" : ""}><span class="letter">${LETTERS[k]}</span><span>${esc(t)}</span></button>`).join("")}
          </div>
          ${locked ? `<p class="center">✅ Antwort <b>${LETTERS[chosen]}</b> ${st.myChoice !== null ? "gespeichert" : "wird gesendet…"}</p>` : st.phase === "closed" ? `<p class="center">⏱ Zeit abgelaufen</p>` : ""}`;
        v.querySelectorAll("[data-k]").forEach(b => b.onclick = () => answer(+b.dataset.k));
        tick();
      } else if (st.phase === "reveal") {
        const ok = st.myChoice === st.correct, none = st.myChoice === null;
        v.innerHTML = `<div class="card center">
          <div class="huge" style="color:${none ? "var(--muted)" : ok ? "var(--ok)" : "var(--bad)"}">${none ? "–" : ok ? "Richtig!" : "Falsch"}</div>
          <p>Lösung: <b>${LETTERS[st.correct]} – ${esc(st.a[st.correct])}</b></p>
          ${st.explain ? `<p class="muted">${esc(st.explain)}</p>` : ""}
          </div>`;
      }
    } else if (st.type === "interactive") {
      v.innerHTML = `<div class="card"><h1>${esc(st.title)}</h1><p>${esc(st.text)}</p>
        ${st.place ? `<p class="huge center" style="color:var(--ok)">${st.place}. Platz!</p>` : ""}</div>`;
    } else if (st.type === "pause") {
      v.innerHTML = `<div class="card center"><h1>☕ Pause</h1><div class="huge" id="pt"></div><p>Ihr seid auf Platz <b>${st.rank}</b> mit <b>${st.score}</b> Punkten.</p></div>`;
      if (st.remainingMs != null) starts.pause = performance.now() + st.remainingMs;
      tick();
    } else if (st.type === "standings") {
      v.innerHTML = `<div class="card center"><h1>📊 Zwischenstand</h1><div class="huge">Platz ${st.rank}</div><p>${st.score} Punkte</p></div>
        <div class="card"><ol>${(st.standings || []).map(x => `<li>${esc(x.name)} – <b>${x.score}</b></li>`).join("")}</ol></div>`;
    } else if (st.type === "end") {
      v.innerHTML = `<div class="card center"><h1>🏆 Endstand</h1><div class="huge">Platz ${st.rank}</div><p>${st.score} Punkte</p></div>
        <div class="card"><ol>${(st.standings || []).map(x => `<li>${esc(x.name)} – <b>${x.score}</b></li>`).join("")}</ol></div>`;
    } else {
      v.innerHTML = `<div class="card center"><h1>${esc(st.title || "Willkommen!")}</h1><p>Ihr seid dabei als <b>${esc(st.name)}</b>.</p><p class="muted">Lasst dieses Fenster offen – die Fragen erscheinen automatisch.</p></div>`;
    }
  }

  function tick() {
    if (!st) return;
    if (st.type === "mc" && (st.phase === "open" || st.phase === "closed") && $("pb")) {
      const el = st.phase === "open" ? performance.now() - starts[st.idx] : st.ansMs;
      const rem = Math.max(0, st.ansMs - el);
      $("pb").style.width = (rem / st.ansMs * 100) + "%";
      $("pb").style.background = rem < 10000 ? "var(--bad)" : "var(--accent)";
      const chosen = st.myChoice !== null ? st.myChoice : pending[st.idx];
      if (chosen === undefined || chosen === null) {
        $("pinfo").textContent = st.phase === "open" && rem > 0
          ? `${Math.ceil(rem / 1000)} s · richtig jetzt: ${st.mult * Math.max(0, st.maxPoints - Math.floor(el / 1000))} P`
          : "Zeit abgelaufen";
      } else $("pinfo").textContent = "";
    }
    if (st.type === "pause" && $("pt")) {
      if (starts.pause) {
        const s = Math.max(0, Math.ceil((starts.pause - performance.now()) / 1000));
        $("pt").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
      } else $("pt").textContent = "";
    }
  }
  setInterval(tick, 250);

  // Bildschirm anlassen, solange die Seite sichtbar ist
  async function wake() { try { if (navigator.wakeLock && document.visibilityState === "visible") await navigator.wakeLock.request("screen"); } catch {} }
  document.addEventListener("visibilitychange", () => { wake(); if (document.visibilityState === "visible" && !stopped && room && me && (!conn || !conn.open)) connect(); });
  wake();

  // ---------- Start ----------
  if (room) loadMe();
  if (room && me && me.teamId) connect(); else showJoin();
})();
