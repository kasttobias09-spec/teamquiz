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
      if (d.type === "challenge") {
        if (C.idx !== d.idx) { C.idx = d.idx; C.stage = "wait"; C.count = 0; C.holdMs = 0; C.holdStart = null; C.goAt = null; }
        if (d.phase === "open" && !C.goAt) { C.goAt = performance.now() + (d.goInMs || 0); C.stage = d.done ? "done" : "shake"; C.count = 0; C.holdMs = 0; }
        if (d.phase === "show") { C.goAt = null; C.stage = "wait"; C.count = 0; }
        if (C.mode && !d.ready && conn && conn.open) conn.send({ t: "ready", idx: d.idx, mode: C.mode, cam: camLive() });
        if (C.mode && !C.listening) { window.addEventListener("devicemotion", onMotion); C.listening = true; }
      }
      if (d.type !== "challenge" && C.stream) stopCamera();
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

  // ---------- Handy-Challenge (Schütteln + ruhig halten) ----------
  const SHAKE_HI = 14, SHAKE_LO = 6;   // m/s² ohne Schwerkraft
  const STILL_DEFAULT = 0.6;          // darüber = gewackelt (m/s²), pro Challenge über stillMax einstellbar
  const C = { mode: null, listening: false, idx: null, stage: "wait", count: 0, holdStart: null, holdMs: 0, armed: true, wobbleAt: 0, flat: true, lastSent: 0, sentKey: "" };

  // Farbjagd: Farbbereiche (Hue in Grad), Sättigung/Helligkeit müssen deutlich sein
  const COLORS = {
    rot:   { word: "ROTES",  css: "#ff3b3b", hue: h => h <= 14 || h >= 340, minS: .5, minV: .3 },
    blau:  { word: "BLAUES", css: "#3b8cff", hue: h => h >= 190 && h <= 255, minS: .4, minV: .25 },
    gruen: { word: "GRÜNES", css: "#2fbf71", hue: h => h >= 75 && h <= 165, minS: .35, minV: .25 },
    gelb:  { word: "GELBES", css: "#ffd21f", hue: h => h >= 42 && h <= 68, minS: .45, minV: .5 }
  };
  const HIT_FRACTION = .55; // so viel vom Kreis muss die Farbe haben
  const cv = document.createElement("canvas"); cv.width = cv.height = 32;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  function camLive() { return !!(C.stream && C.stream.getVideoTracks().some(t => t.readyState === "live")); }
  async function startCamera() {
    if (camLive()) return true;
    try {
      C.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (!C.video) {
        C.video = document.createElement("video");
        C.video.setAttribute("playsinline", ""); C.video.muted = true; C.video.autoplay = true;
      }
      C.video.srcObject = C.stream;
      C.video.play().catch(() => {});
      return true;
    } catch { C.stream = null; return false; }
  }
  function stopCamera() { if (C.stream) { C.stream.getTracks().forEach(t => t.stop()); C.stream = null; } }
  function colorFraction(col) {
    const v = C.video; if (!v || v.readyState < 2 || !v.videoWidth) return 0;
    const vw = v.videoWidth, vh = v.videoHeight, side = Math.min(vw, vh) * .4;
    cx.drawImage(v, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, 32, 32);
    const d = cx.getImageData(0, 0, 32, 32).data;
    let hit = 0, n = 0;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const dx = x - 15.5, dy = y - 15.5; if (dx * dx + dy * dy > 256) continue;
      const i = (y * 32 + x) * 4, r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn;
      let h = 0;
      if (dl) h = mx === r ? 60 * (((g - b) / dl) % 6) : mx === g ? 60 * ((b - r) / dl + 2) : 60 * ((r - g) / dl + 4);
      if (h < 0) h += 360;
      const sat = mx ? dl / mx : 0;
      n++;
      if (sat >= col.minS && mx >= col.minV && col.hue(h)) hit++;
    }
    return n ? hit / n : 0;
  }

  async function enableSensors() {
    let ok = false;
    try {
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        ok = (await DeviceMotionEvent.requestPermission()) === "granted";
      } else ok = typeof DeviceMotionEvent !== "undefined";
    } catch { ok = false; }
    if (ok) {
      if (!C.listening) { window.addEventListener("devicemotion", onMotion); C.listening = true; }
      // Nur echte Messwerte zählen (Desktop-Browser feuern teils leere Events)
      const got = await new Promise(r => {
        let done = false;
        const h = e => { const g = e.accelerationIncludingGravity, a = e.acceleration; if ((g && g.x != null) || (a && a.x != null)) { if (!done) { done = true; window.removeEventListener("devicemotion", h); r(true); } } };
        window.addEventListener("devicemotion", h);
        setTimeout(() => { if (!done) { done = true; window.removeEventListener("devicemotion", h); r(false); } }, 1500);
      });
      C.mode = got ? "motion" : null;
    } else C.mode = null;
    C.failed = !C.mode;
    C.cam = st && st.needCam ? await startCamera() : false;
    C.camFailed = !!(st && st.needCam && !C.cam);
    if (conn && conn.open && st) conn.send({ t: "ready", idx: st.idx, mode: C.mode || "none", cam: camLive() });
    render();
  }
  function chalRunning() { return st && st.type === "challenge" && st.phase === "open" && !st.done && C.idx === st.idx && C.goAt && performance.now() >= C.goAt && C.stage !== "done"; }
  function onMotion(e) {
    let mag;
    const a = e.acceleration, g = e.accelerationIncludingGravity || {};
    if (a && a.x != null) mag = Math.hypot(a.x, a.y, a.z);
    else if (g.x != null) mag = Math.abs(Math.hypot(g.x, g.y, g.z) - 9.81);
    else return;
    C.flat = g.z != null ? Math.abs(g.z) > 8.8 : true; // max. ca. 25° gekippt
    if (!chalRunning() || C.mode !== "motion") return;
    const now = performance.now();
    if (C.stage === "shake") {
      if (C.armed && mag > SHAKE_HI) { C.count++; C.armed = false; }
      else if (mag < SHAKE_LO) C.armed = true;
      if (C.count >= st.shakes) { C.stage = "hold"; C.holdStart = null; C.holdMs = 0; }
    } else if (C.stage === "hold") {
      if (mag > (st.stillMax || STILL_DEFAULT) || !C.flat) { if (C.holdMs > 400) C.wobbleAt = now; C.holdStart = null; C.holdMs = 0; }
      else { if (!C.holdStart) C.holdStart = now; C.holdMs = now - C.holdStart; }
      if (C.holdMs >= st.holdSeconds * 1000) {
        if (st.color) { C.stage = "color"; C.colorStart = null; C.colorMs = 0; render(); }
        else finishChallenge();
      }
    }
  }
  function finishChallenge() {
    C.stage = "done";
    if (navigator.vibrate) navigator.vibrate([80, 60, 80]);
    try { conn.send({ t: "prog", idx: st.idx, stage: "done" }); } catch {}
    render();
  }
  function chalLoop() {
    if (st && st.type === "challenge") {
      const now = performance.now();
      if (chalRunning() && C.stage === "color") {
        const col = COLORS[st.color] || COLORS.rot;
        C.frac = colorFraction(col);
        if (C.frac >= HIT_FRACTION) { if (!C.colorStart) C.colorStart = now; C.colorMs = now - C.colorStart; }
        else { C.colorStart = null; C.colorMs = 0; }
        if (C.colorMs >= (st.colorSeconds || 2) * 1000) finishChallenge();
      }
      if (chalRunning() && now - C.lastSent > 250) {
        const val = C.stage === "shake" ? C.count : C.stage === "color" ? Math.round(C.colorMs) : Math.round(C.holdMs);
        const k = C.stage + val;
        if (k !== C.sentKey) { C.sentKey = k; C.lastSent = now; try { conn.send({ t: "prog", idx: st.idx, stage: C.stage, value: val }); } catch {} }
      }
      updateChal();
    }
  }
  setInterval(chalLoop, 100);
  function updateChal() {
    const el = $("chal"); if (!el || !st) return;
    const now = performance.now();
    let h;
    if ((st.done || C.stage === "done") && st.practice) h = `<div class="huge" style="color:var(--ok)">✅ Bewegung ok!</div>${st.cameraCheck ? "<p><b>📷 Seht ihr unten das Kamerabild?</b> Sagt dem Moderator Bescheid!</p>" : "<p>Euer Handy funktioniert. Wartet auf die anderen.</p>"}`;
    else if (st.done || C.stage === "done") h = `<div class="huge" style="color:var(--ok)">✅ Geschafft!</div>${st.place ? `<p class="huge">${st.place}. Platz</p>` : "<p>Warte auf die anderen …</p>"}`;
    else if (!C.goAt || now < C.goAt) h = `<div class="huge" style="font-size:6rem">${C.goAt ? Math.ceil((C.goAt - now) / 1000) : "…"}</div><p>Gleich geht's los – Handy gut festhalten!</p>`;
    else if (C.stage === "shake") {
      const target = st.shakes;
      h = `<div class="huge">📳 SCHÜTTELN!</div><div class="huge">${C.count} / ${target}</div>
        <div class="pbar" style="height:22px"><div style="width:${Math.min(100, C.count / target * 100)}%;background:var(--warn)"></div></div>`;
    } else if (C.stage === "color") {
      const col = COLORS[st.color] || COLORS.rot, need = (st.colorSeconds || 2) * 1000;
      h = `<div class="huge">🎨 Finde etwas <span style="color:${col.css}">${col.word}</span>!</div>
        <p>Kamera draufhalten, bis der Kreis grün wird – ${st.colorSeconds || 2} s halten.</p>
        <div class="pbar" style="height:22px"><div style="width:${Math.min(100, C.colorMs / need * 100)}%;background:${col.css}"></div></div>`;
    } else {
      const wob = now - C.wobbleAt < 1200;
      h = `<div class="huge">🫗 RUHIG HALTEN!</div>
        <p>Flach auf der ausgestreckten Hand – nicht wackeln!</p>
        <div class="huge" style="color:${wob ? "var(--bad)" : "var(--text)"}">${wob ? "Gewackelt! Nochmal" : (C.holdMs / 1000).toFixed(1) + " / " + st.holdSeconds + " s"}</div>
        <div class="pbar" style="height:22px"><div style="width:${Math.min(100, C.holdMs / (st.holdSeconds * 1000) * 100)}%;background:var(--ok)"></div></div>`;
    }
    el.innerHTML = h;
    const cw = $("camwrap");
    if (cw) {
      const preview = st.cameraCheck && st.practice && (st.done || C.stage === "done");
      const show = preview || (C.stage === "color" && !st.done);
      cw.classList.toggle("hidden", !show);
      if (show && C.video && C.video.parentNode !== cw) { cw.prepend(C.video); C.video.play().catch(() => {}); }
      const ring = cw.querySelector(".ring"); if (ring) { ring.style.display = preview ? "none" : ""; ring.classList.toggle("hit", (C.frac || 0) >= HIT_FRACTION); }
    }
  }

  // ---------- Anzeige ----------
  let lastIdx = null, lastPhase = null;
  function render() {
    if (!st) return;
    // Einblenden nur bei neuer Folie oder neuem Abschnitt – nicht beim Antworten / wenn die Zeit abläuft
    const animate = st.idx !== lastIdx || (st.phase !== lastPhase && st.phase !== "closed");
    lastIdx = st.idx; lastPhase = st.phase;
    const vEl = $("view");
    vEl.classList.remove("fresh");
    if (animate) { void vEl.offsetWidth; vEl.classList.add("fresh"); }
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
    } else if (st.type === "challenge") {
      const ready = C.mode && (!st.needCam || camLive());
      if (st.phase === "show" || !ready) {
        v.innerHTML = `<div class="card"><h1>${esc(st.title)}</h1><p>${esc(st.text)}</p></div>
          ${ready ? `<div class="card center"><div class="huge" style="color:var(--ok)">✓ Bereit</div><p>${st.needCam ? "Sensoren und Kamera aktiv" : "Sensoren aktiv"}. Wartet auf den Start!</p></div>`
          : `${C.camFailed && !C.failed ? `<div class="card" style="border:2px solid var(--bad)"><b>⚠ Kamera nicht verfügbar.</b><p class="small">Kamera-Abfrage mit „Erlauben“ bestätigen. Falls abgelehnt: Tab schließen, Seite neu öffnen, erneut freigeben. Firmenhandys sperren die Kamera manchmal – dann anderes Handy nehmen.</p></div>` : ""}${C.failed ? `<div class="card" style="border:2px solid var(--bad)"><b>⚠ Keine Bewegungsdaten.</b><p class="small">iPhone: „Erlauben“ antippen. Falls abgelehnt: Safari-Tab schließen, Seite neu öffnen und erneut freigeben. Hilft das nicht: anderes Handy nehmen und dem Moderator Bescheid geben.</p></div>` : ""}
             <button class="primary bigbtn" id="bSens" style="min-height:auto;padding:1.2rem">📲 ${C.failed || C.camFailed ? "Nochmal versuchen" : st.needCam ? "Sensoren & Kamera freigeben" : "Sensoren freigeben"}</button><p class="muted center small">${st.needCam ? "Beide Abfragen (Bewegung und Kamera) mit „Erlauben“ bestätigen." : "Auf dem iPhone mit „Erlauben“ bestätigen."}</p>`}`;
        const b = $("bSens"); if (b) b.onclick = enableSensors;
      } else if (st.phase === "open" && $("chal")) {
        updateChal(); // nicht neu aufbauen, sonst gehen Tipp-/Halte-Gesten verloren
      } else if (st.phase === "open") {
        v.innerHTML = `<div class="card center" id="chal"></div><div class="camwrap hidden" id="camwrap"><div class="ring"></div></div>`;
        updateChal();
      } else {
        v.innerHTML = st.practice ? `<div class="card center"><h1>${esc(st.title)}</h1><p class="huge" style="color:${st.done ? "var(--ok)" : "var(--bad)"}">${st.done ? "✅ Bewegung ok" : "❌ Nicht geschafft"}</p>${st.done ? (st.cameraCheck ? "<p><b>📷 Seht ihr das Kamerabild?</b> Sagt dem Moderator Bescheid!</p>" : "") : "<p>Sagt dem Moderator Bescheid – evtl. anderes Handy nehmen.</p>"}</div>${st.cameraCheck && camLive() ? `<div class="camwrap" id="camwrap2"></div>` : ""}` : `<div class="card center"><h1>${esc(st.title)}</h1>${st.place ? `<p class="huge" style="color:var(--ok)">${st.place}. Platz!</p>` : st.done ? "<p>Geschafft – leider nicht unter den ersten zwei.</p>" : "<p>Vorbei!</p>"}</div>`;
        const cw2 = $("camwrap2"); if (cw2 && C.video) { cw2.appendChild(C.video); C.video.play().catch(() => {}); }
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
