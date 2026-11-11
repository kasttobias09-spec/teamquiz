(() => {
  const Q = window.QUIZ;
  const { esc, LETTERS } = TQ;
  const ITEMS = Q.items;
  const ANS_MS = Q.answerSeconds * 1000;
  const MAX_TEAMS = Q.maxTeams || 5;
  const STORE = "tq-host-v1";
  const $ = id => document.getElementById(id);

  // ---------- State ----------
  const genCode = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
  const newState = () => ({ code: genCode(), teams: {}, order: [], locked: false, idx: 0, phase: "show", openedAt: null, pauseEnd: null, answers: {}, awards: {}, manual: {} });
  let S;
  try { S = JSON.parse(localStorage.getItem(STORE)) || newState(); } catch { S = newState(); }
  if (S.idx >= ITEMS.length) S.idx = 0;
  S.chal = S.chal || {};
  const GO_DELAY = 3000; // 3-2-1-Countdown vor Challenge-Start
  if (!S.remoteKey) S.remoteKey = Math.random().toString(36).slice(2, 12);
  const SCORE_TYPES = ["pause", "standings", "end"]; // nur hier wird der Punktestand gezeigt
  const scoreVisible = () => SCORE_TYPES.includes(item().type);
  const save = () => localStorage.setItem(STORE, JSON.stringify(S));

  const conns = new Map(); // teamId -> DataConnection
  const remotes = new Set(); // Tablet-Fernbedienungen
  let showJoin = false, showRemote = false, showNotes = false, admin = false;

  const item = () => ITEMS[S.idx];
  const mult = it => it.multiplier || 1;

  function pointsFor(it, choice, elapsedMs) {
    if (choice === it.correct) return mult(it) * Math.max(0, Q.maxPoints - Math.floor(elapsedMs / 1000));
    return mult(it) * Q.wrongPoints;
  }

  // Punkte; während eine Frage läuft, zählen deren Antworten noch nicht (sonst verrät der Punktestand die Lösung)
  function score(id) {
    let s = S.manual[id] || 0;
    for (const qi in S.answers) {
      if (+qi === S.idx && S.phase !== "reveal") continue;
      const r = S.answers[qi][id];
      if (r) s += r.points;
    }
    for (const ii in S.awards) {
      const a = S.awards[ii] || [];
      Q.interactivePoints.forEach((p, k) => { if (a[k] === id) s += p; });
    }
    return s;
  }
  function standings() {
    return S.order.filter(id => S.teams[id]).map(id => ({ id, name: S.teams[id].name, score: score(id) }))
      .sort((a, b) => b.score - a.score);
  }
  function rankOf(id, st = standings()) {
    const me = st.find(x => x.id === id);
    return me ? st.filter(x => x.score > me.score).length + 1 : null;
  }

  // ---------- Networking (PeerJS) ----------
  let peer;
  function setNet(t, ok) { $("net").textContent = t; $("net").style.color = ok ? "var(--ok)" : "var(--warn)"; }
  function startPeer() {
    setNet("verbinde…");
    peer = new Peer(TQ.PEER_PREFIX + S.code, TQ.peerOptions);
    peer.on("open", () => setNet("● online", true));
    peer.on("connection", conn => {
      conn.on("data", d => onData(conn, d));
      conn.on("close", () => {
        if (conn.teamId && conns.get(conn.teamId) === conn) { conns.delete(conn.teamId); render(); }
      });
    });
    peer.on("disconnected", () => {
      setNet("Verbindung zum Vermittlungsserver weg – neuer Versuch…");
      setTimeout(() => { if (!peer.destroyed && peer.disconnected) peer.reconnect(); }, 1500);
    });
    peer.on("error", e => {
      if (e.type === "unavailable-id") {
        setNet("Raumcode noch belegt (anderer Tab offen?) – neuer Versuch in 3 s…");
        peer.destroy(); setTimeout(startPeer, 3000);
      } else if (e.type === "peer-unavailable") {
        /* ignorieren */
      } else {
        setNet("Netzwerkfehler: " + e.type + " – neuer Versuch…");
        setTimeout(() => {
          if (peer.destroyed) startPeer(); else if (peer.disconnected) peer.reconnect();
        }, 2500);
      }
    });
  }

  function send(id, msg) { const c = conns.get(id); if (c && c.open) { try { c.send(msg); } catch {} } }

  function onData(conn, d) {
    if (!d || typeof d !== "object") return;
    if (d.t === "remote") {
      if (d.key !== S.remoteKey) return conn.send({ t: "reject", reason: "Ungültiger Fernbedienungs-Link. Bitte QR-Code neu scannen." });
      conn.isRemote = true; remotes.add(conn);
      conn.on("close", () => { remotes.delete(conn); render(); });
      sendRemote(conn); render();
      return;
    }
    if (d.t === "cmd" && conn.isRemote) return remoteCmd(d);
    if (d.t === "join") {
      let id = d.teamId && S.teams[d.teamId] ? d.teamId : null;
      if (!id) {
        if (S.locked) return conn.send({ t: "reject", reason: "Neue Teams sind gesperrt. Bitte beim Moderator melden." });
        if (S.order.filter(x => S.teams[x]).length >= MAX_TEAMS) return conn.send({ t: "reject", reason: `Es sind bereits ${MAX_TEAMS} Teams angemeldet.` });
        let name = String(d.name || "").trim().slice(0, 24) || "Team " + (S.order.length + 1);
        const names = new Set(Object.values(S.teams).map(t => t.name.toLowerCase()));
        let base = name, n = 2; while (names.has(name.toLowerCase())) name = `${base} ${n++}`;
        id = "t" + Math.random().toString(36).slice(2, 10);
        S.teams[id] = { name }; S.order.push(id); save();
      }
      const old = conns.get(id);
      if (old && old !== conn) { try { old.close(); } catch {} }
      conn.teamId = id; conns.set(id, conn);
      conn.send({ t: "welcome", teamId: id, name: S.teams[id].name, room: S.code });
      sendState(id); render();
      return;
    }
    const id = conn.teamId;
    if (!id || !S.teams[id]) return;
    if (d.t === "ready" || d.t === "prog") return onChallenge(id, d);
    if (d.t === "answer") {
      const it = item();
      if (it.type !== "mc" || S.phase !== "open" || d.idx !== S.idx) return;
      S.answers[S.idx] = S.answers[S.idx] || {};
      if (S.answers[S.idx][id]) return sendState(id);
      const hostEl = Date.now() - S.openedAt;
      if (hostEl > ANS_MS + 1500) return sendState(id);
      const choice = +d.choice;
      if (!(choice >= 0 && choice <= 3)) return;
      // Zeit wird auf dem Handy gemessen (fair bei Netzverzögerung), aber auf plausible Werte begrenzt
      let el = Number(d.elapsedMs);
      if (!isFinite(el)) el = hostEl;
      el = Math.max(0, Math.min(hostEl, Math.max(el, hostEl - 2000), ANS_MS - 1));
      S.answers[S.idx][id] = { choice, el, points: pointsFor(it, choice, el) };
      save();
      sendState(id);
      const all = S.order.filter(x => S.teams[x]);
      if (all.every(x => S.answers[S.idx][x])) closeQuestion(); else render();
    }
  }

  function viewFor(id) {
    const it = item(), st = standings();
    const v = { t: "state", idx: S.idx, type: it.type, phase: S.phase, name: S.teams[id].name, teams: st.length };
    if (scoreVisible()) { v.score = score(id); v.rank = rankOf(id, st); }
    if (it.type === "mc") {
      v.category = it.category; v.mult = mult(it);
      if (S.phase !== "show") { v.q = it.q; v.a = it.a; }
      v.ansMs = ANS_MS; v.maxPoints = Q.maxPoints;
      if (S.phase === "open") v.remainingMs = Math.max(0, ANS_MS - (Date.now() - S.openedAt));
      const my = (S.answers[S.idx] || {})[id];
      v.myChoice = my ? my.choice : null;
      if (S.phase === "reveal") { v.correct = it.correct; v.explain = it.explain; }
    } else if (it.type === "interactive") {
      v.title = it.title; v.text = it.text;
      const a = S.awards[S.idx] || []; const k = a.indexOf(id); v.place = k >= 0 ? k + 1 : null;
    } else if (it.type === "challenge") {
      v.title = it.title; v.text = it.text; v.shakes = it.shakes; v.holdSeconds = it.holdSeconds;
      v.stillMax = it.stillMax || 0.6; v.practice = !!it.practice;
      v.color = it.color || null; v.colorSeconds = it.colorSeconds || 2;
      v.needCam = !!(it.color || it.cameraCheck); v.cameraCheck = !!it.cameraCheck;
      if (S.phase === "open") v.goInMs = Math.max(0, S.openedAt + GO_DELAY - Date.now());
      const x = chalOf()[id]; v.done = !!(x && x.stage === "done"); v.ready = !!(x && x.ready);
      const a = S.awards[S.idx] || []; const k = a.indexOf(id); v.place = k >= 0 ? k + 1 : null;
    } else if (it.type === "pause") {
      v.title = it.title; v.remainingMs = S.pauseEnd ? Math.max(0, S.pauseEnd - Date.now()) : null;
    } else if (it.type === "end" || it.type === "standings") {
      v.title = it.title;
      v.standings = st.map(x => ({ name: x.name, score: x.score }));
    } else {
      v.title = it.title;
    }
    return v;
  }
  function sendState(id) { if (S.teams[id]) send(id, viewFor(id)); }
  function broadcast() { for (const id of conns.keys()) sendState(id); }

  // ---------- Handy-Challenge ----------
  function chalOf(i = S.idx) { return (S.chal[i] = S.chal[i] || {}); }
  function onChallenge(id, d) {
    const it = item();
    if (it.type !== "challenge" || d.idx !== S.idx) return;
    const c = chalOf(), me = (c[id] = c[id] || { stage: "wait", value: 0 });
    if (d.t === "ready") {
      me.mode = d.mode === "motion" ? "motion" : "none"; me.cam = !!d.cam;
      me.ready = me.mode === "motion" && (!(it.color || it.cameraCheck) || me.cam);
      save(); render(); return;
    }
    if (S.phase !== "open" || Date.now() < S.openedAt + GO_DELAY - 300 || me.stage === "done") return;
    if (d.stage === "done") {
      me.stage = "done"; me.value = 0;
      me.place = Object.values(c).filter(x => x.stage === "done").length;
      const a = it.practice ? [] : (S.awards[S.idx] = S.awards[S.idx] || []);
      if (!it.practice && !a.includes(id)) for (let k = 0; k < Q.interactivePoints.length; k++) if (!a[k]) { a[k] = id; break; }
      save(); render(); broadcast();
      return;
    }
    if (d.stage === "shake" || d.stage === "hold" || d.stage === "color") { me.stage = d.stage; me.value = +d.value || 0; }
    updateBars();
  }
  function chalLabel(it, x) {
    if (!x || x.stage === "wait") return "bereit…";
    if (x.stage === "shake") return `📳 ${x.value}/${it.shakes}`;
    if (x.stage === "hold") return `🫗 ${(x.value / 1000).toFixed(1)} / ${it.holdSeconds} s`;
    if (x.stage === "color") return `🎨 ${(x.value / 1000).toFixed(1)} / ${it.colorSeconds || 2} s`;
    if (it.practice) return "✓ Test ok";
    return (["🥇", "🥈", "🥉"][x.place - 1] || x.place + ".") + " geschafft!";
  }
  function updateBars() {
    const it = item(); if (it.type !== "challenge") return;
    const c = chalOf();
    for (const id of S.order) {
      const x = c[id], sEl = $("cs-" + id), hEl = $("ch-" + id), cEl = $("cc-" + id), lEl = $("cl-" + id);
      if (!sEl) continue;
      const target = it.shakes;
      const sh = !x ? 0 : x.stage === "shake" ? Math.min(1, x.value / target) : x.stage === "wait" ? 0 : 1;
      const ho = !x ? 0 : x.stage === "hold" ? Math.min(1, x.value / (it.holdSeconds * 1000)) : (x.stage === "done" || x.stage === "color") ? 1 : 0;
      const co = !x ? 0 : x.stage === "color" ? Math.min(1, x.value / ((it.colorSeconds || 2) * 1000)) : x.stage === "done" ? 1 : 0;
      sEl.style.width = sh * 100 + "%"; hEl.style.width = ho * 100 + "%"; if (cEl) cEl.style.width = co * 100 + "%";
      lEl.textContent = chalLabel(it, x);
    }
  }

  // ---------- Tablet-Fernbedienung ----------
  function remoteView() {
    const it = item(), ans = S.answers[S.idx] || {};
    return {
      t: "rstate", idx: S.idx, total: ITEMS.length, phase: S.phase, code: S.code, locked: S.locked,
      item: { type: it.type, category: it.category, q: it.q, a: it.a, correct: it.correct, explain: it.explain, note: it.note,
        title: it.title, text: it.text, img: it.img, multiplier: it.multiplier, minutes: it.minutes, practice: !!it.practice },
      next: ITEMS[S.idx + 1] ? { type: ITEMS[S.idx + 1].type, title: ITEMS[S.idx + 1].title, q: ITEMS[S.idx + 1].q, note: ITEMS[S.idx + 1].note } : null,
      ansMs: ANS_MS,
      remainingMs: S.phase === "open" ? Math.max(0, ANS_MS - (Date.now() - S.openedAt)) : null,
      pauseRemainingMs: S.pauseEnd ? Math.max(0, S.pauseEnd - Date.now()) : null,
      awards: S.awards[S.idx] || [],
      interactivePoints: Q.interactivePoints,
      teams: standings().map(x => ({ ...x, online: conns.has(x.id), answer: ans[x.id] || null,
        chal: it.type === "challenge" ? chalLabel(it, chalOf()[x.id]) + ((chalOf()[x.id] || {}).mode === "none" ? " ⚠ keine Sensoren" : "") : null }))
    };
  }
  function sendRemote(c) { if (c.open) { try { c.send(remoteView()); } catch {} } }
  function sendRemotes() { if (remotes.size) { const v = remoteView(); for (const c of remotes) if (c.open) { try { c.send(v); } catch {} } } }
  function toggleAward(id, k) {
    const arr = (S.awards[S.idx] || []).slice();
    if (arr[k] === id) arr[k] = null;
    else { for (let j = 0; j < arr.length; j++) if (arr[j] === id) arr[j] = null; arr[k] = id; }
    S.awards[S.idx] = arr; save(); render(); broadcast();
  }
  function remoteCmd(d) {
    const it = item();
    switch (d.c) {
      case "prev": enterItem(S.idx - 1); break;
      case "next": enterItem(S.idx + 1); break;
      case "primary": primary(); break;
      case "award": if (S.teams[d.id] && (it.type === "interactive" || (it.type === "challenge" && !it.practice))) toggleAward(d.id, +d.k); break;
      case "adj": if (S.teams[d.id]) { S.manual[d.id] = (S.manual[d.id] || 0) + (+d.v || 0); save(); render(); broadcast(); } break;
      case "lock": S.locked = !S.locked; save(); render(); break;
      case "join": showJoin = !showJoin; showRemote = false; render(); break;
    }
  }

  // ---------- Flow ----------
  function enterItem(i) {
    S.idx = Math.max(0, Math.min(ITEMS.length - 1, i));
    const it = item();
    S.openedAt = null; S.pauseEnd = null;
    S.phase = it.type === "mc" && S.answers[S.idx] && Object.keys(S.answers[S.idx]).length ? "reveal" : "show";
    if (it.type === "challenge" && Object.values(chalOf()).some(x => x.stage === "done")) S.phase = "reveal";
    if (it.type === "end") S.phase = "reveal";
    showJoin = false; showRemote = false;
    save(); render(); broadcast();
  }
  function openQuestion() {
    const it = item();
    if (it.type !== "mc" || S.phase !== "show") return;
    S.answers[S.idx] = {};
    S.phase = "open"; S.openedAt = Date.now();
    save(); render(); broadcast();
  }
  function closeQuestion() {
    if (S.phase !== "open") return;
    S.phase = "closed"; save(); render(); broadcast();
  }
  function reveal() {
    if (S.phase !== "closed" && S.phase !== "open") return;
    S.phase = "reveal";
    const it = item();
    save(); render(); broadcast();
  }
  function primary() {
    const it = item();
    if (it.type === "mc") {
      if (S.phase === "show") openQuestion();
      else if (S.phase === "open" || S.phase === "closed") reveal();
      else enterItem(S.idx + 1);
    } else if (it.type === "challenge") {
      if (S.phase === "show") {
        for (const x of Object.values(chalOf())) { x.stage = "wait"; x.value = 0; delete x.place; }
        S.awards[S.idx] = []; S.phase = "open"; S.openedAt = Date.now();
      } else if (S.phase === "open") S.phase = "reveal";
      else return enterItem(S.idx + 1);
      save(); render(); broadcast();
    } else if (it.type === "pause" && !S.pauseEnd) {
      S.pauseEnd = Date.now() + (it.minutes || 5) * 60000; save(); render(); broadcast();
    } else enterItem(S.idx + 1);
  }

  // ---------- Rendering ----------
  function toast(msg) {
    const d = document.createElement("div");
    d.textContent = msg;
    Object.assign(d.style, { position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", background: "#000c", padding: "12px 18px", borderRadius: "10px", zIndex: 99, maxWidth: "80vw" });
    document.body.appendChild(d); setTimeout(() => d.remove(), 5000);
  }

  function joinUrl() {
    const base = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    return base + "play.html?room=" + S.code;
  }
  function qrHtml(text) {
    const qr = qrcode(0, "M"); qr.addData(text); qr.make();
    return qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true });
  }

  function lobbyHtml() {
    const ids = S.order.filter(x => S.teams[x]);
    return `<div class="lobby">
      <div class="qr">${qrHtml(joinUrl())}</div>
      <div>
        <div class="bigtitle">Mitspielen!</div>
        <p class="bigtext">1 Handy pro Team · QR-Code scannen<br>Raumcode: <b style="letter-spacing:.15em">${esc(S.code)}</b></p>
        <p class="joinurl muted">${esc(joinUrl())}</p>
        <div class="status">${ids.map(id => `<span class="chip ${conns.has(id) ? "done" : "off"}">${esc(S.teams[id].name)}</span>`).join("") || '<span class="muted">Noch keine Teams …</span>'}</div>
        <p class="muted">${ids.length}/${MAX_TEAMS} Teams</p>
      </div></div>`;
  }

  function teamName(id) { return S.teams[id] ? S.teams[id].name : "?"; }

  function render() {
    const it = item();
    document.title = Q.title + " · Moderation";
    $("title").textContent = Q.title;
    $("code").textContent = S.code;
    $("pos").textContent = `${S.idx + 1}/${ITEMS.length}`;
    $("bLock").textContent = S.locked ? "🔒 gesperrt" : "🔓 offen";
    $("bPrev").disabled = S.idx === 0;
    $("bNext").disabled = S.idx === ITEMS.length - 1;
    const st = $("stage");
    const ids = S.order.filter(x => S.teams[x]);

    let primaryLabel = null; // großer Button unten mittig
    if (showRemote) {
      st.innerHTML = `<div class="lobby"><div class="qr">${qrHtml(remoteUrl())}</div><div>
        <div class="bigtitle">🎛 Fernbedienung</div>
        <p class="bigtext">QR-Code mit dem Gerät scannen, das du als Fernbedienung nutzen willst.</p><p class="muted">Reine Anzeige ohne Lösungen (z. B. zweites Tablet für die Teams): <b>${esc(location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, ""))}tablet</b></p>
        <p class="muted">Dort siehst du Lösung, Notizen, Antworten und Punkte und steuerst das Quiz. Der Beamer zeigt nur, was alle sehen dürfen.<br>Diesen Code nicht den Teams zeigen!</p>
        <p class="muted">Verbundene Tablets: <b>${remotes.size}</b></p></div></div>
        <div class="controls"><button class="primary" id="bCloseRemote">Zurück zum Quiz</button></div>`;
      $("bCloseRemote").onclick = () => { showRemote = false; render(); };
    } else if (showJoin) {
      st.innerHTML = lobbyHtml() + `<div class="controls"><button class="primary" id="bCloseJoin">Zurück zum Quiz</button></div>`;
      $("bCloseJoin").onclick = () => { showJoin = false; render(); };
    } else if (it.type === "intro") {
      st.innerHTML = `<div class="bigtitle">${esc(it.title)}</div><p class="bigtext">${esc(it.text || "")}</p>` + lobbyHtml();
      primaryLabel = "Los geht's ▶";
    } else if (it.type === "mc") {
      const ans = S.answers[S.idx] || {};
      const rev = S.phase === "reveal";
      const who = k => rev ? ids.filter(id => ans[id] && ans[id].choice === k).map(id => `<span>${esc(teamName(id))}</span>`).join("") : "";
      // Leiste oben: Teams, die noch nicht geantwortet haben (ohne zu verraten, was sie gewählt haben)
      let html = "";
      if (S.phase === "open" || S.phase === "closed") {
        const pend = ids.filter(id => !ans[id]);
        html += `<div class="waitbar">${S.phase === "closed" && pend.length ? `<span class="muted">⏱ Zeit abgelaufen</span>`
          : pend.length ? `<span class="muted">Noch nicht geantwortet:</span>${pend.map(id => `<span class="chip">${esc(teamName(id))}</span>`).join("")}`
          : `<span class="muted">✅ Alle Teams haben geantwortet</span>`}</div>`;
      }
      html += it.img ? `<div class="qimg ${S.phase === "show" ? "" : "small"}"><img src="${esc(it.img)}" alt=""></div>` : "";
      html += `<div class="category">${esc(it.category || "")}${it.multiplier ? ` · ×${it.multiplier}` : ""}</div>
        <div class="question">${esc(it.q)}</div>`;
      if (S.phase === "show") {
        primaryLabel = `▶ Start (${Q.answerSeconds} s)`;
        html += `<p class="muted">Antworten werden nach dem Start eingeblendet.</p>`;
      } else {
        html += `<div class="answers">${it.a.map((t, k) =>
          `<div class="answer c${LETTERS[k]} ${rev ? (k === it.correct ? "correct" : "dim") : ""}"><span class="letter">${LETTERS[k]}</span><span>${esc(t)}</span><span class="who">${who(k)}</span></div>`).join("")}</div>`;
        if (S.phase === "open" || S.phase === "closed") {
          primaryLabel = "Auflösen";
          html += `<div class="timer"><span class="big" id="tbig"></span><div class="bar"><div id="tbar"></div></div><span class="pts" id="tpts"></span></div>`;
        } else {
          primaryLabel = "Weiter ▶";
          if (it.explain) html += `<div class="explain">${esc(it.explain)}</div>`;
        }
      }
      st.innerHTML = html;
    } else if (it.type === "interactive") {
      const a = S.awards[S.idx] || [];
      primaryLabel = "Weiter ▶";
      st.innerHTML = `${it.img ? `<div class="qimg"><img src="${esc(it.img)}" alt=""></div>` : ""}<div class="category">Interaktive Aufgabe</div><div class="bigtitle">${esc(it.title)}</div><p class="bigtext">${esc(it.text)}</p>
        <div class="award">${ids.map(id => `<span>${esc(teamName(id))}</span>
          ${Q.interactivePoints.map((p, k) => `<button data-award="${id}" data-k="${k}" class="${a[k] === id ? "sel" : ""}">${k + 1}. Platz</button>`).join("")}`).join("")}</div>`;
      st.querySelectorAll("[data-award]").forEach(b => b.onclick = () => toggleAward(b.dataset.award, +b.dataset.k));
    } else if (it.type === "challenge") {
      const c = chalOf();
      const a = S.awards[S.idx] || [];
      let html = `<div class="category">${it.practice ? "Testrunde · keine Punkte" : "Handy-Challenge"}</div><div class="bigtitle">${esc(it.title)}</div>`;
      if (S.phase === "show") {
        primaryLabel = "▶ Los! (3-2-1)";
        html += `<p class="bigtext">${esc(it.text)}</p>
          <p class="bigtext">👉 Jetzt auf dem Team-Handy <b>„${it.color || it.cameraCheck ? "Sensoren & Kamera" : "Sensoren"} freigeben“</b> antippen${it.color || it.cameraCheck ? " und beide Abfragen erlauben" : ""}.</p>
          <div class="status">${ids.map(id => { const x = c[id]; return `<span class="chip ${x && x.ready ? "done" : ""}">${x && x.ready ? "✓ " : x && x.mode === "none" ? "⚠ Sensoren: " : x && x.mode === "motion" && !x.cam ? "⚠ Kamera: " : "… "}${esc(teamName(id))}</span>`; }).join("")}</div>
          <p class="muted">✓ = bereit · … = noch nicht freigegeben · ⚠ = Handy liefert keine Sensordaten → anderes Handy nehmen</p>`;
      } else {
        if (S.phase === "open") html += `<div class="center"><span class="countdown" id="cdown"></span></div>`;
        html += `<div class="crows">${ids.map(id => `<div class="crow"><span class="n">${esc(teamName(id))}</span>
          <div class="cbar"><div class="half"><div class="cshake" id="cs-${id}"></div></div><div class="half"><div class="chold" id="ch-${id}"></div></div>${it.color ? `<div class="half"><div class="ccolor" id="cc-${id}"></div></div>` : ""}</div>
          <span class="clabel" id="cl-${id}"></span></div>`).join("")}</div>
          <p class="muted">📳 Schütteln → 🫗 ruhig halten${it.color ? " → 🎨 Farbe finden" : ""}</p>`;
        if (S.phase === "open") primaryLabel = "Beenden";
        else {
          primaryLabel = "Weiter ▶";
          html += it.practice
            ? `<div class="bigtext">${ids.map(id => (c[id] && c[id].stage === "done" ? "✅ " : "❌ ") + esc(teamName(id))).join(" &nbsp; ")}</div>${ids.every(id => c[id] && c[id].stage === "done") ? `<p class="bigtext">Bewegung klappt bei allen${it.cameraCheck ? " – seht ihr auch das Kamerabild auf dem Handy?" : "!"}</p>` : `<p class="bigtext">Bei ❌: Handy wechseln oder Testrunde wiederholen (⚙︎ → Aktuelle Frage zurücksetzen).</p>`}`
            : `<div class="bigtext">${a.filter(Boolean).map((id, k) => `${["🥇", "🥈"][k] || ""} ${esc(teamName(id))}`).join(" &nbsp; ") || "Niemand hat es geschafft."}</div>`;
        }
      }
      st.innerHTML = html;
      updateBars();
    } else if (it.type === "pause") {
      primaryLabel = S.pauseEnd ? "Weiter ▶" : `☕ Pause starten (${it.minutes || 5} min)`;
      st.innerHTML = `<div class="bigtitle">${esc(it.title || "Pause")}</div>
        <div class="timer"><span class="big" id="pbig">${String(it.minutes || 5).padStart(2, "0")}:00</span></div>
        ${podium(5)}
        ${S.pauseEnd ? "" : `<div class="controls"><button id="bPauseNext">Pause überspringen</button></div>`}`;
      if ($("bPauseNext")) $("bPauseNext").onclick = () => enterItem(S.idx + 1);
    } else if (it.type === "standings") {
      primaryLabel = "Weiter ▶";
      st.innerHTML = `<div class="bigtitle">${esc(it.title || "Zwischenstand")}</div>${it.text ? `<p class="bigtext">${esc(it.text)}</p>` : ""}${podium(99)}`;
    } else if (it.type === "end") {
      st.innerHTML = `<div class="bigtitle">${esc(it.title || "Siegerehrung")}</div>${podium(99)}`;
    }
    if (primaryLabel) st.insertAdjacentHTML("beforeend", `<div class="nextbar"><button class="primary big" id="bPrimary">${esc(primaryLabel)}</button></div>`);
    const viewKey = S.idx + "|" + S.phase + "|" + showJoin + "|" + showRemote;
    if (viewKey !== render.lastKey) {
      // Art des Übergangs bestimmen: neue Folie / Antworten erscheinen / Auflösung
      let kind = "item";
      if (render.lastIdx === S.idx && !showJoin && !showRemote) kind = S.phase === "reveal" ? "reveal" : (S.phase === "open" ? "answers" : "item");
      if (render.lastIdx === S.idx && it.type === "mc" && S.phase === "closed") kind = "";
      if (render.lastIdx === S.idx && it.type === "challenge" && S.phase === "open") kind = "answers";
      st.scrollTop = 0; render.lastKey = viewKey; render.lastIdx = S.idx;
      render.anim = kind; render.animAt = Date.now();
    }
    st.classList.remove("anim-item", "anim-answers", "anim-reveal");
    if (render.anim && Date.now() - render.animAt < 900) { void st.offsetWidth; st.classList.add("anim-" + render.anim); }
    const bp = $("bPrimary"); if (bp) bp.onclick = primary;

    renderScore();
    renderNotes();
    tick();
    sendRemotes();
  }
  function remoteUrl() {
    const base = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    return base + "remote.html?room=" + S.code + "&key=" + S.remoteKey;
  }

  function podium(n) {
    const st = standings().slice(0, n);
    if (!st.length) return "";
    const medals = ["🥇", "🥈", "🥉"];
    return `<div class="podium"><ol>${st.map((x, i) => `<li><span>${medals[i] || i + 1 + "."}</span><span>${esc(x.name)}</span><span class="s">${x.score}</span></li>`).join("")}</ol></div>`;
  }

  function renderScore() {
    const st = standings();
    $("scoreList").innerHTML = st.map(x => `<li>
      <span class="dot ${conns.has(x.id) ? "on" : ""}" title="${conns.has(x.id) ? "verbunden" : "nicht verbunden"}"></span>
      <span class="n">${esc(x.name)}</span>
      <span class="tools"><button data-adj="${x.id}" data-v="-5">−5</button><button data-adj="${x.id}" data-v="5">+5</button>
      <button data-ren="${x.id}" title="umbenennen">✎</button><button data-del="${x.id}" title="entfernen">✕</button></span></li>`).join("")
      || '<li class="muted">Noch keine Teams</li>';
    $("side").classList.toggle("admin", admin);
    $("adminBox").classList.toggle("hidden", !admin);
    $("scoreList").querySelectorAll("[data-adj]").forEach(b => b.onclick = () => {
      const id = b.dataset.adj; S.manual[id] = (S.manual[id] || 0) + +b.dataset.v; save(); render(); broadcast();
    });
    $("scoreList").querySelectorAll("[data-ren]").forEach(b => b.onclick = () => {
      const id = b.dataset.ren; const n = prompt("Neuer Teamname:", S.teams[id].name);
      if (n && n.trim()) { S.teams[id].name = n.trim().slice(0, 24); save(); render(); broadcast(); }
    });
    $("scoreList").querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
      const id = b.dataset.del;
      if (!confirm(`Team „${S.teams[id].name}“ wirklich entfernen?`)) return;
      send(id, { t: "reject", reason: "Euer Team wurde vom Moderator entfernt." });
      delete S.teams[id]; S.order = S.order.filter(x => x !== id);
      const c = conns.get(id); conns.delete(id); if (c) setTimeout(() => c.close(), 300);
      save(); render(); broadcast();
    });
  }

  function renderNotes() {
    const it = item();
    $("notes").classList.toggle("hidden", !showNotes);
    $("side").classList.toggle("notesopen", showNotes);
    if (!showNotes) return;
    let h = `<b>Notiz:</b> ${esc(it.note || "–")}`;
    if (it.type === "mc") h += `<br><b>Lösung:</b> ${LETTERS[it.correct]} – ${esc(it.a[it.correct])}`;
    $("notes").innerHTML = h;
  }

  function fmt(ms) { const s = Math.ceil(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }

  function tick() {
    const it = item();
    if (it.type === "mc" && (S.phase === "open" || S.phase === "closed") && $("tbig")) {
      const el = S.phase === "open" ? Date.now() - S.openedAt : ANS_MS;
      const rem = Math.max(0, ANS_MS - el);
      $("tbig").textContent = Math.ceil(rem / 1000);
      $("tbar").style.width = (rem / ANS_MS * 100) + "%";
      $("tbar").style.background = rem < 10000 ? "var(--bad)" : "var(--accent)";
      $("tpts").textContent = S.phase === "open" ? `richtig jetzt: ${mult(it) * Math.max(0, Q.maxPoints - Math.floor(el / 1000))} Punkte` : "Zeit abgelaufen";
      if (S.phase === "open" && el >= ANS_MS) closeQuestion();
    }
    if (it.type === "challenge" && S.phase === "open" && $("cdown")) {
      const g = S.openedAt + GO_DELAY - Date.now();
      $("cdown").textContent = g > 0 ? Math.ceil(g / 1000) : "LOS!";
      $("cdown").style.opacity = g > -2500 ? 1 : 0;
    }
    if (it.type === "pause" && S.pauseEnd && $("pbig")) {
      const rem = Math.max(0, S.pauseEnd - Date.now());
      $("pbig").textContent = fmt(rem);
    }
  }
  setInterval(tick, 200);

  // ---------- Spiegel-Anzeige (/tablet) ----------
  // Feste ID, damit /tablet ohne Code funktioniert. Zeigt nur die Bühne (ohne Header, Buttons, Seitenleiste).
  const displays = new Set();
  let displayPeer = null, lastMirror = "";
  function startDisplayPeer() {
    displayPeer = new Peer(TQ.PEER_PREFIX + "display", TQ.peerOptions);
    displayPeer.on("connection", c => {
      c.on("open", () => { displays.add(c); lastMirror = ""; mirror(); });
      c.on("close", () => displays.delete(c));
    });
    displayPeer.on("disconnected", () => setTimeout(() => { if (!displayPeer.destroyed && displayPeer.disconnected) displayPeer.reconnect(); }, 2000));
    displayPeer.on("error", e => {
      if (e.type === "peer-unavailable") return;
      if (e.type === "unavailable-id") { displayPeer.destroy(); setTimeout(startDisplayPeer, 5000); return; }
      setTimeout(() => { if (displayPeer.destroyed) startDisplayPeer(); else if (displayPeer.disconnected) displayPeer.reconnect(); }, 3000);
    });
  }
  function mirror() {
    if (!displays.size) return;
    const st = $("stage");
    const msg = { t: "mirror", html: st.innerHTML, anim: render.anim || "", animAt: render.animAt || 0 };
    const key = msg.html + msg.anim + msg.animAt;
    if (key === lastMirror) return;
    lastMirror = key;
    for (const c of displays) if (c.open) { try { c.send(msg); } catch {} }
  }
  setInterval(mirror, 200);
  startDisplayPeer();
  // Beim Neuladen/Schließen IDs sofort freigeben, damit Tablet & Teams direkt wieder verbinden können
  window.addEventListener("pagehide", () => { try { displayPeer && displayPeer.destroy(); } catch {} try { peer && peer.destroy(); } catch {} });
  setInterval(() => sendRemotes(), item().type === "challenge" ? 1000 : 3000);
  setInterval(() => { if (item().type === "challenge" && S.phase === "open") sendRemotes(); }, 1000);

  // ---------- Buttons & Tastatur ----------
  $("bPrev").onclick = () => enterItem(S.idx - 1);
  $("bNext").onclick = () => enterItem(S.idx + 1);
  $("bJoin").onclick = () => { showJoin = !showJoin; showRemote = false; render(); };
  $("bRemote").onclick = () => { showRemote = !showRemote; showJoin = false; render(); };
  $("bLock").onclick = () => { S.locked = !S.locked; save(); render(); };
  $("bAdmin").onclick = () => { admin = !admin; render(); };
  $("bResetItem").onclick = () => {
    if (!confirm("Antworten/Punkte der aktuellen Frage löschen und Frage neu starten?")) return;
    delete S.answers[S.idx]; delete S.awards[S.idx]; delete S.chal[S.idx]; S.phase = "show"; S.openedAt = null; S.pauseEnd = null;
    save(); render(); broadcast();
  };
  $("bResetScores").onclick = () => {
    if (!confirm("Alle Punkte löschen? Teams bleiben verbunden.")) return;
    S.answers = {}; S.awards = {}; S.manual = {}; S.chal = {}; enterItem(0);
  };
  $("bResetAll").onclick = () => {
    if (!confirm("Komplett neu starten? Alle Teams müssen sich mit neuem Code neu anmelden.")) return;
    localStorage.removeItem(STORE); location.reload();
  };
  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowRight") enterItem(S.idx + 1);
    else if (e.key === "ArrowLeft") enterItem(S.idx - 1);
    else if (e.key === " ") { e.preventDefault(); primary(); }
    else if (e.key === "n" || e.key === "N") { showNotes = !showNotes; renderNotes(); }
    else if (e.key === "q" || e.key === "Q") { showJoin = !showJoin; render(); }
    else return;
  });

  // Nach einem Neuladen mitten in einer Frage: offene Frage gilt als beendet
  if (S.phase === "open" && Date.now() - S.openedAt > ANS_MS) S.phase = "closed";
  save();
  render();
  startPeer();
})();
