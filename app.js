/* CortexLab "Start a project" page: reactive blob avatar (Corti).
   Original code, written from scratch. No backend: submit opens WhatsApp. */
(() => {
  'use strict';
  const WA_NUMBER = '27767360827';
  const $ = (s, r = document) => r.querySelector(s);
  const svg = $('#buddy'), blob = $('#blob'), shine = $('#blobShine'), mouth = $('#mouth');
  const bubble = $('#bubble'), form = $('#form'), confetti = $('#confetti');
  const eyes = [$('#eyeL'), $('#eyeR')].map(g => ({
    g, pupil: g.querySelector('.pupil'), lid: g.querySelector('.lid'),
    cx: +g.getAttribute('transform').match(/[\d.]+/g)[0], cy: +g.getAttribute('transform').match(/[\d.]+/g)[1],
    px: 0, py: 0
  }));
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = mq.matches;
  mq.addEventListener?.('change', e => { reduced = e.matches; });

  /* ---------------- state ---------------- */
  const state = { mood: 'idle', lookAt: null, lookAway: false, lidBase: 0, blinking: false, lastActive: performance.now(), sleepy: false };
  const MOUTHS = {
    smile: ['M138 180 Q150 189 162 180', false],
    grin: ['M135 177 Q150 196 165 177 Q150 183 135 177Z', true],
    o: ['M143 183 Q150 171 157 183 Q150 195 143 183Z', true],
    flat: ['M139 184 L161 184', false],
    wavy: ['M132 184 Q141 178 150 184 Q159 190 168 184', false],
    worried: ['M137 189 Q150 178 163 189', false]
  };
  function setMouth(k) { const [d, fill] = MOUTHS[k]; mouth.setAttribute('d', d); mouth.style.fill = fill ? '#1A1712' : 'none'; }

  function setMood(mood) {
    svg.classList.remove('shy', 'happy', 'party', 'worried');
    if (['shy', 'happy', 'party', 'worried'].includes(mood)) svg.classList.add(mood);
    state.mood = mood;
    state.lookAway = mood === 'shy';
    state.lidBase = mood === 'shy' ? 0.35 : mood === 'worried' ? 0.15 : 0;
    setMouth({ idle: 'smile', happy: 'grin', party: 'grin', shy: 'wavy', worried: 'worried', curious: 'o', listen: 'flat' }[mood] || 'smile');
    applyLids();
  }

  let sayTimer;
  let lockUntil = 0;
  function say(text, { mood, hold = 0, force = false } = {}) {
    if (!force && performance.now() < lockUntil) return;
    if (mood) setMood(mood);
    if (bubble.textContent === text) return;
    bubble.textContent = text;
    bubble.classList.remove('pop'); void bubble.offsetWidth; if (!reduced) bubble.classList.add('pop');
    clearTimeout(sayTimer);
    if (hold) sayTimer = setTimeout(() => { if (state.mood !== 'party') setMood('idle'); }, hold);
  }
  function nod() { if (reduced) return; svg.classList.remove('nod'); void svg.getBoundingClientRect(); svg.classList.add('nod'); }

  /* ---------------- blob body ---------------- */
  const N = 9, CX = 150, CY = 160;
  const seeds = Array.from({ length: N }, () => Math.random() * Math.PI * 2);
  function blobPath(t, amp) {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const base = 104 + (Math.sin(a) > 0 ? 8 * Math.sin(a) : 0); // bottom-heavy
      const r = base + amp * Math.sin(t * 1.6 + seeds[i]) + amp * 0.5 * Math.sin(t * 2.7 + seeds[i] * 2);
      pts.push([CX + Math.cos(a) * r * 1.02, CY + Math.sin(a) * r * 0.96]);
    }
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < N; i++) {
      const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d + 'Z';
  }
  shine.setAttribute('d', 'M88 92 C100 70 140 58 168 62 C150 70 112 82 96 112 C90 110 84 102 88 92Z');

  /* ---------------- eyes ---------------- */
  let pointer = null;
  function onPointer(e) {
    const p = e.touches ? e.touches[0] : e;
    if (!p) return;
    pointer = { x: p.clientX, y: p.clientY }; state.lookAt = null; wake();
  }
  addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('pointerdown', onPointer, { passive: true });
  addEventListener('touchstart', onPointer, { passive: true });
  addEventListener('touchmove', onPointer, { passive: true });

  function lookAtEl(el) {
    const r = el.getBoundingClientRect();
    state.lookAt = { x: r.left + Math.min(r.width, 160) * 0.6, y: r.top + r.height / 2 };
  }
  function updateEyes(t) {
    const box = svg.getBoundingClientRect();
    const scale = box.width / 300;
    let target = state.lookAt || pointer;
    for (const e of eyes) {
      let tx = 0, ty = 0;
      if (state.lookAway) { tx = -7; ty = -5; }
      else if (state.mood === 'party') { tx = 0; ty = -5; }
      else if (target) {
        const ex = box.left + e.cx * scale, ey = box.top + e.cy * scale;
        const dx = target.x - ex, dy = target.y - ey, dist = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, dist / 220);
        tx = (dx / dist) * 7.5 * k; ty = (dy / dist) * 8.5 * k;
      } else if (!reduced) { tx = Math.sin(t / 1900) * 3; ty = Math.cos(t / 2600) * 1.5; }
      const ease = reduced ? 1 : 0.18;
      e.px += (tx - e.px) * ease; e.py += (ty - e.py) * ease;
      e.pupil.setAttribute('transform', `translate(${e.px.toFixed(2)} ${e.py.toFixed(2)})`);
    }
  }
  function applyLids(closed) {
    const amt = closed ? 1 : Math.max(state.lidBase, state.sleepy ? 0.55 : 0);
    for (const e of eyes) e.lid.setAttribute('height', (48 * amt).toFixed(1));
  }
  function blinkLoop() {
    setTimeout(() => {
      if (state.mood !== 'party') {
        applyLids(true);
        setTimeout(() => applyLids(false), 130);
        if (Math.random() < 0.2) setTimeout(() => { applyLids(true); setTimeout(() => applyLids(false), 110); }, 260);
      }
      blinkLoop();
    }, 2200 + Math.random() * 3800);
  }
  blinkLoop();

  function wake() {
    state.lastActive = performance.now();
    if (state.sleepy) { state.sleepy = false; applyLids(false); say("Oh, hello again.", { mood: 'curious', hold: 1800 }); }
  }

  /* ---------------- main loop ---------------- */
  let t0 = performance.now();
  function frame(now) {
    const t = (now - t0) / 1000;
    blob.setAttribute('d', blobPath(reduced ? 0 : t, reduced ? 0 : (state.mood === 'party' ? 5 : 2.2)));
    updateEyes(now);
    if (!state.sleepy && now - state.lastActive > 25000 && !form.contains(document.activeElement)) {
      state.sleepy = true; applyLids(false); say('Still there?', { mood: 'idle' });
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------------- form reactions ---------------- */
  const f = form.elements;
  const first = () => (f.name.value.trim().split(/\s+/)[0] || '').slice(0, 24);
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
  const SERVICE_LINES = {
    'AI Automation': 'Automation. Let the systems handle the busywork.',
    'Brand Design': 'Brand design, our favourite kind of work.',
    'Social Media Management': 'Content that stops the scroll. Noted.',
    'YouTube Automation': 'A channel that runs itself. Good choice.',
    'A mix / not sure yet': 'A bit of everything is our sweet spot.'
  };
  let typeTimer;
  const debounce = (fn, ms = 350) => (...a) => { clearTimeout(typeTimer); typeTimer = setTimeout(() => fn(...a), ms); };

  form.addEventListener('focusin', e => { clearTimeout(typeTimer); wake(); if (e.target.matches('input,select,textarea')) lookAtEl(e.target); });
  form.addEventListener('focusout', () => { state.lookAt = null; });

  f.name.addEventListener('focus', () => say(f.name.value ? `Hi, ${first()}.` : 'First, what should I call you?', { mood: 'curious' }));
  f.name.addEventListener('input', debounce(() => {
    clearErr(f.name);
    if (first()) { say(`Nice to meet you, ${first()}.`, { mood: 'happy' }); nod(); }
    else say("Don’t be shy…", { mood: 'curious' });
  }));

  f.email.addEventListener('focus', () => say(first() ? `Where can we reach you, ${first()}?` : 'Where can we reach you?', { mood: 'listen' }));
  f.email.addEventListener('input', debounce(() => {
    clearErr(f.email);
    if (emailOk(f.email.value)) { say('Got it. No spam, promise.', { mood: 'happy' }); nod(); }
    else say('Watching for the @…', { mood: 'listen' });
  }, 450));
  f.email.addEventListener('blur', () => { if (f.email.value && !emailOk(f.email.value)) say('Hmm, that email looks a bit off.', { mood: 'worried' }); });

  f.service.addEventListener('focus', () => say('What are we building together?', { mood: 'curious' }));
  f.service.addEventListener('change', () => { clearErr(f.service); if (SERVICE_LINES[f.service.value]) { say(SERVICE_LINES[f.service.value], { mood: 'happy' }); nod(); } });

  f.budget.addEventListener('focus', () => say("I’m not looking. Pick what feels right.", { mood: 'shy' }));
  f.budget.addEventListener('change', () => { clearErr(f.budget); say("Noted. We’ll scope it to fit.", { mood: 'shy' }); });
  f.budget.addEventListener('blur', () => { if (state.mood === 'shy') { setMood('idle'); if (f.budget.value) say('Eyes open again.', { mood: 'happy', hold: 2500 }); } });

  f.message.addEventListener('focus', () => say("Tell me everything. I’m all eyes.", { mood: 'listen' }));
  let lastLen = 0;
  f.message.addEventListener('input', () => {
    const n = f.message.value.length; $('#count').textContent = n;
    if (Math.floor(n / 40) > Math.floor(lastLen / 40)) nod();
    if (n > 220 && lastLen <= 220) say('This is getting good.', { mood: 'happy' });
    else if (n > 0 && lastLen === 0) say('Mm-hmm…', { mood: 'listen' });
    lastLen = n;
  });

  f.consent.addEventListener('change', () => { clearErr(f.consent); if (f.consent.checked) say('Thank you. Your details stay with us.', { mood: 'happy', hold: 2500 }); });

  /* ---------------- validation + submit ---------------- */
  function setErr(el, msg) { el.setAttribute('aria-invalid', 'true'); const p = $('#' + el.id + '-err'); p.textContent = msg; el.setAttribute('aria-describedby', p.id); }
  function clearErr(el) { el.removeAttribute('aria-invalid'); const p = $('#' + el.id + '-err'); if (p) p.textContent = ''; }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = [];
    if (!f.name.value.trim()) { setErr(f.name, 'Please add your name.'); bad.push(f.name); }
    if (!emailOk(f.email.value)) { setErr(f.email, 'Please add a valid email.'); bad.push(f.email); }
    if (!f.service.value) { setErr(f.service, 'Pick the closest service.'); bad.push(f.service); }
    if (!f.budget.value) { setErr(f.budget, 'Pick a range, or “Not sure yet”.'); bad.push(f.budget); }
    if (!f.consent.checked) { setErr(f.consent, 'We need your OK to reply.'); bad.push(f.consent); }
    if (bad.length) { say(bad.length > 1 ? `Almost there. ${bad.length} fields need attention.` : 'Almost there. One field needs attention.', { mood: 'worried', force: true }); lockUntil = performance.now() + 1800; bad[0].focus(); return; }
    clearTimeout(typeTimer);

    const text = [
      "Hi CortexLab! I'd like to start a project.", '',
      `Name: ${f.name.value.trim()}`, `Email: ${f.email.value.trim()}`,
      `Service: ${f.service.value}`, `Budget: ${f.budget.value}`, '',
      `Project: ${f.message.value.trim() || '(no details yet)'}`, '',
      '(POPIA consent given via cortexlab.co.za)'
    ].join('\n');
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

    say(`Wonderful. Opening WhatsApp, ${first()}…`, { mood: 'party', force: true });
    lockUntil = performance.now() + 2500;
    burst();
    const done = $('#done'); done.hidden = false;
    done.innerHTML = 'WhatsApp should open in a new tab. If it didn’t, <a target="_blank" rel="noopener">tap here to send your message</a>.';
    done.querySelector('a').href = url;
    const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener';
    if (!window.__noOpen) a.click();
    setTimeout(() => say(`Talk soon, ${first()}! We reply within 24 hours.`, { mood: 'happy', force: true }), 2600);
  });

  function burst() {
    if (reduced) return;
    const colors = ['#C9A84C', '#1A1712', '#E6D3A0', '#B9B4A8', '#8C7BE0'];
    for (let i = 0; i < 22; i++) {
      const s = document.createElement('i');
      const a = Math.random() * Math.PI * 2, d = 70 + Math.random() * 90;
      s.style.cssText = `--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - 40}px;--r:${Math.random() * 360 - 180}deg;background:${colors[i % colors.length]};animation-delay:${Math.random() * 0.12}s`;
      confetti.appendChild(s);
      setTimeout(() => s.remove(), 1500);
    }
  }

  /* ---------------- mobile dock ---------------- */
  const slot = $('#slot'), wrap = $('#buddyWrap'), small = matchMedia('(max-width: 899px)');
  let ticking = false;
  function checkDock() {
    ticking = false;
    const r = slot.getBoundingClientRect();
    const dock = small.matches && r.bottom < r.height * 0.45;
    if (dock === wrap.classList.contains('docked')) return;
    slot.style.minHeight = dock ? r.height + 'px' : '';
    wrap.classList.toggle('docked', dock);
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(checkDock); } }, { passive: true });
  small.addEventListener?.('change', checkDock);
  checkDock();

  setMood('idle');
})();
