(() => {
  const { esc, LETTERS } = TQ;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const room = (params.get("room") || "").toUpperCase();
  const key = params.get("key") || "";
  let peer = null, conn = null, st = null, recvAt = 0, retryTimer = null, stopped = false;

  function setConn(on, text) {
    $("conn").className = "conn " + (on ? "on" : "off");
    $("conn").textContent = text || (on ? "verbunden" : "offline");
  }
  function cmd(c, extra) { if (conn && conn.open) conn.send({ t: "cmd", c, ...extra }); }

  // ---------- Verbindung ----------
  function connect() {
    if (!room || !key) { $("view").innerHTML = `<div class="card">Ungültiger Link – bitte den 🎛-QR-Code am Laptop scannen.</div>`; return; }
    if (!peer || peer.destroyed) {
      peer = new Peer(TQ.peerOptions);
      setConn(false, "Verbinde mit Server…");
      peer.on("open", openConn);
      peer.on("disconnected", () => { setConn(false, "Netz weg…"); setTimeout(() => { if (!peer.destroyed && peer.disconnected) peer.reconnect(); }, 1500); });
      peer.on("error", e => { setConn(false, e.type === "peer-unavailable" ? "Laptop nicht online" : "Fehler: " + e.type); retry(); });
    } else if (peer.open) openConn();
  }
  function retry() {
    if (stopped) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (conn && conn.open) return;
      if (!peer || peer.destroyed) connect(); else if (peer.disconnected) peer.reconnect(); else if (peer.open) openConn();
    }, 2500);
  }
  function openConn() {
    if (conn) { try { conn.close(); } catch {} }
    const c = peer.connect(TQ.PEER_PREFIX + room, { reliable: true });
    conn = c;
    const t = setTimeout(() => { if (!c.open) { setConn(false, "keine Verbindung"); try { c.close(); } catch {} retry(); } }, 10000);
    c.on("open", () => { clearTimeout(t); setConn(true); c.send({ t: "remote", key }); });
    c.on("data", d => {
      if (!d) return;
      if (d.t === "reject") { stopped = true; $("view").innerHTML = `<div class="card">${esc(d.reason)}</div>`; return; }
      if (d.t === "rstate") { st = d; recvAt = performance.now(); render(); }
    });
    c.on("close", () => { if (conn === c) { setConn(false, "getrennt…"); retry(); } });
    c.on("error", () => retry());
  }

  // ---------- Anzeige ----------
  function primaryLabel() {
    const it = st.item;
    if (it.type === "intro") return "Los geht's ▶";
    if (it.type === "mc") return st.phase === "show" ? "▶ Start" : (st.phase === "open" || st.phase === "closed") ? "Auflösen" : "Weiter ▶";
    if (it.type === "pause") return st.pauseRemainingMs == null ? "☕ Pause starten" : "Weiter ▶";
    if (it.type === "end") return "–";
    return "Weiter ▶";
  }

  function render() {
    if (!st) return;
    const it = st.item;
    $("pos").textContent = `${st.idx + 1}/${st.total} · Raum ${st.code}`;
    $("rPrimary").textContent = primaryLabel();
    $("rPrimary").disabled = it.type === "end";
    $("rPrev").disabled = st.idx === 0;
    $("rNext").disabled = st.idx >= st.total - 1;

    let h = `<div class="card">`;
    if (it.type === "mc") {
      h += `<h2>${esc(it.category || "")}${it.multiplier ? " · ×" + it.multiplier : ""} · ${esc(phaseText())}</h2><div class="rq">${esc(it.q)}</div>`;
      h += it.a.map((t, k) => `<div class="ra ${k === it.correct ? "ok" : ""}"><span class="letter c${LETTERS[k]}">${LETTERS[k]}</span><span>${esc(t)}</span>${k === it.correct ? '<span class="sol" style="margin-left:auto">✔ richtig</span>' : ""}</div>`).join("");
      if (st.phase === "open" || st.phase === "closed") h += `<p class="center"><span class="timerbig" id="rt"></span></p>`;
      if (it.explain) h += `<p class="muted">${esc(it.explain)}</p>`;
      if (it.audio) h += `<div class="controls"><button data-c="play">🔊 ${esc(it.audio)}</button>${it.revealAudio ? `<button data-c="playrev">🔊 Auflösung</button>` : ""}<button data-c="stop">⏹ Stop</button></div>`;
    } else {
      h += `<h2>${esc(it.type === "interactive" ? "Interaktive Aufgabe" : it.type === "pause" ? "Pause" : it.type === "standings" ? "Zwischenstand" : it.type === "end" ? "Ende" : "Start")}</h2>
        <div class="rq">${esc(it.title || "")}</div>${it.text ? `<p>${esc(it.text)}</p>` : ""}`;
      if (it.type === "pause") h += `<p class="center"><span class="timerbig" id="rp"></span></p>`;
    }
    if (it.note) h += `<div class="note">📝 ${esc(it.note)}</div>`;
    h += `</div>`;

    // Teams: Antworten (nur Moderator) + Punkte + Korrektur
    h += `<div class="card"><h2>Teams · Punkte (nur du siehst das)</h2><div class="tlist">`;
    h += st.teams.map(t => {
      let mid = "";
      if (it.type === "mc" && st.phase !== "show") {
        mid = t.answer ? `<span class="${t.answer.choice === it.correct ? "sol" : ""}">${LETTERS[t.answer.choice]} · ${(t.answer.el / 1000).toFixed(1)}s · ${t.answer.points > 0 ? "+" : ""}${t.answer.points}</span>` : `<span class="muted">–</span>`;
      } else if (it.type === "interactive") {
        mid = st.interactivePoints.map((p, k) => `<button data-award="${t.id}" data-k="${k}" class="${st.awards[k] === t.id ? "sel" : ""}">${k + 1}. (+${p})</button>`).join("");
      }
      return `<div class="trow"><span class="dot ${t.online ? "on" : ""}"></span><span class="n">${esc(t.name)}</span>${mid}
        <span class="s">${t.score}</span><button data-adj="${t.id}" data-v="-5">−5</button><button data-adj="${t.id}" data-v="5">+5</button></div>`;
    }).join("") || `<span class="muted">Noch keine Teams</span>`;
    h += `</div><div class="controls" style="margin-top:.7rem"><button data-c="join">📱 QR für Teams am Beamer ein/aus</button><button data-c="lock">${st.locked ? "🔒 Beitritt gesperrt" : "🔓 Beitritt offen"}</button></div></div>`;

    if (st.next) h += `<div class="card" style="opacity:.7"><h2>Als Nächstes</h2>${esc(st.next.q || st.next.title || st.next.type)}${st.next.note ? `<div class="note" style="margin-top:.5rem">📝 ${esc(st.next.note)}</div>` : ""}</div>`;

    $("view").innerHTML = h;
    $("view").querySelectorAll("[data-c]").forEach(b => b.onclick = () => {
      const c = b.dataset.c;
      if (c === "playrev") cmd("play", { reveal: true }); else cmd(c);
    });
    $("view").querySelectorAll("[data-award]").forEach(b => b.onclick = () => cmd("award", { id: b.dataset.award, k: +b.dataset.k }));
    $("view").querySelectorAll("[data-adj]").forEach(b => b.onclick = () => cmd("adj", { id: b.dataset.adj, v: +b.dataset.v }));
    tick();
  }
  function phaseText() {
    return { show: "noch nicht gestartet", open: "läuft", closed: "Zeit abgelaufen", reveal: "aufgelöst" }[st.phase] || st.phase;
  }
  function tick() {
    if (!st) return;
    const since = performance.now() - recvAt;
    if ($("rt")) $("rt").textContent = st.phase === "open" && st.remainingMs != null ? Math.max(0, Math.ceil((st.remainingMs - since) / 1000)) + " s" : "Zeit abgelaufen";
    if ($("rp")) {
      if (st.pauseRemainingMs == null) $("rp").textContent = "";
      else { const s = Math.max(0, Math.ceil((st.pauseRemainingMs - since) / 1000)); $("rp").textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }
    }
  }
  setInterval(tick, 250);

  $("rPrev").onclick = () => cmd("prev");
  $("rNext").onclick = () => {
    if (st && st.item.type === "mc" && st.phase !== "reveal" && !confirm("Frage ist noch nicht aufgelöst – trotzdem weiter?")) return;
    cmd("next");
  };
  $("rPrimary").onclick = () => cmd("primary");

  async function wake() { try { if (navigator.wakeLock && document.visibilityState === "visible") await navigator.wakeLock.request("screen"); } catch {} }
  document.addEventListener("visibilitychange", () => { wake(); if (document.visibilityState === "visible" && !stopped && (!conn || !conn.open)) connect(); });
  wake();
  connect();
})();
