/* Player HTML offline: Secret Door, Speed, Bingo. Dữ liệu: window.GAME_DATA (data/questions.js). */
(function () {
  const D = window.GAME_DATA, C = D.config, Q = D.questions, app = document.getElementById('app');
  if (C.animation !== false) document.body.classList.add('anim');
  const h = (tag, attrs = {}, html = '') => {
    const e = document.createElement(tag);
    for (const k in attrs) k === 'class' ? (e.className = attrs[k]) : k.startsWith('on') ? e.addEventListener(k.slice(2), attrs[k]) : e.setAttribute(k, attrs[k]);
    e.innerHTML = html; return e;
  };
  const typeset = el => { if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise(el ? [el] : undefined).catch(() => {}); };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Âm thanh + nhạc nền: dùng chung sfx.js (có thêm trong bản xuất). Thiếu sfx.js thì im lặng.
  const FX = window.SFX || null, SOUND_ON = C.sound !== false && D.game_type !== 'exam', MUSIC_ON = SOUND_ON && C.music !== false;      // bài thi: im lặng hoàn toàn
  if (FX) { FX.set(SOUND_ON); FX.music.enable(MUSIC_ON); FX.music.theme(D.game_type); }
  const Sound = {
    unlock() { if (FX) { FX.unlock(); if (MUSIC_ON) FX.music.start(); } },                    // chạm/bấm đầu tiên: mở khóa âm thanh và bật nhạc nền
    ok() { if (FX) FX.ok(); }, bad() { if (FX) FX.bad(); }, win() { if (FX) { FX.music.stop(); FX.win(); } }
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => Sound.unlock(), { once: true }));
  setTimeout(() => { if (FX && MUSIC_ON) FX.music.start(); }, 300);                          // cửa sổ của app tự phát được: không cần chờ bấm
  const normSA = s => (s || '').replace(/\$|\\,|\\!|\s/g, '').replace(/\{,\}/g, ',').replace(/,/g, '.').replace(/\\dfrac/g, '\\frac').toLowerCase();
  const isCorrect = (q, a) => q.type === 'SA' ? normSA(a) === normSA(q.correct) : q.type === 'ESSAY' ? a === 'OK' : (a || '').toUpperCase() === q.correct;

  // Đồng hồ đếm ngược dạng vòng tròn: vòng cung rút ngắn theo thời gian, số giây ở giữa, vàng ≤50%, đỏ + nhấp nháy ≤25%
  const clockHTML = (cls = '') => `<div class="clock ${cls}" role="timer" aria-label="Thời gian còn lại"><svg viewBox="0 0 44 44"><circle class="trk" cx="22" cy="22" r="18"/><circle class="arc" cx="22" cy="22" r="18" pathLength="100"/></svg><b></b></div>`;
  function setClock(el, left, limit) {
    const f = Math.max(0, Math.min(1, left / limit)), s = Math.max(0, Math.ceil(left));
    el.querySelector('.arc').style.strokeDashoffset = 100 * (1 - f);
    el.querySelector('b').textContent = s >= 100 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : s;
    el.classList.toggle('mid', f <= .5 && f > .25); el.classList.toggle('low', f <= .25);
  }
  function makeTimer(limit, bar, onEnd) {
    let t0 = Date.now(), iv = null, ended = false;
    if (limit > 0) iv = setInterval(() => { const left = limit - (Date.now() - t0) / 1000;
      if (bar.querySelector('.arc')) setClock(bar, left, limit);
      if (left <= 0 && !ended) { ended = true; clearInterval(iv); onEnd(); } }, 100);
    return { stop() { ended = true; clearInterval(iv); }, elapsed: () => (Date.now() - t0) / 1000 };
  }

  function askUI(q, onSubmit) {
    const box = h('div', { class: 'ask' }); let done = false, shown = false;
    const reveal = a => {   // tô đúng/sai ngay trên phương án; chỉ lộ đáp án đúng khi game cho phép hiện đáp án
      if (shown) return; shown = true; const show = C.show_answer !== false, cor = String(q.correct || '');
      if (q.type === 'MCQ') box.querySelectorAll('.opt').forEach((b, i) => { const L = 'ABCD'[i];
        if (a && L === a) b.classList.add(cor.includes(L) ? 'right' : 'wrong'); else if (show && cor.includes(L)) b.classList.add('right'); });
      else if (q.type === 'TF') box.querySelectorAll('.tf').forEach((row, i) => { const bs = row.querySelectorAll('.tfb'), mine = a ? a[i] : '', want = cor[i];
        if (mine) { bs[mine === 'T' ? 0 : 1].classList.add(mine === want ? 'right' : 'wrong'); if (mine !== want && show) bs[want === 'T' ? 0 : 1].classList.add('hint'); }
        else if (show && bs.length) bs[want === 'T' ? 0 : 1].classList.add('hint'); });
      else if (q.type === 'SA') { const inp = box.querySelector('.sa input'); if (inp && a != null && a !== '') inp.classList.add(isCorrect(q, a) ? 'right' : 'wrong'); }
    };
    const submit = a => { if (done) return; done = true; box.classList.add('done'); reveal(a); onSubmit(a); };
    if (q.type === 'MCQ') q.choices.forEach((c, i) => box.append(h('button', { class: 'opt', onclick: () => submit('ABCD'[i]) }, `<b>${'ABCD'[i]}.</b> <span>${c}</span>`)));
    else if (q.type === 'TF') {
      const sel = Array(q.choices.length).fill('');
      const go = h('button', { class: 'btn p', onclick: () => sel.every(x => x) && submit(sel.join('')) }, 'Trả lời');
      q.choices.forEach((c, i) => { const row = h('div', { class: 'tf' }, `<b>${'abcd'[i]})</b> <span>${c}</span>`); const bs = [];
        [['Đ', 'T'], ['S', 'F']].forEach(([lb, v]) => { const b = h('button', { class: 'tfb ' + (v === 'T' ? 't' : 'f'), onclick: () => { sel[i] = v; bs.forEach(x => x.classList.toggle('on', x === b)); } }, lb); bs.push(b); row.append(b); });
        box.append(row); });
      box.append(go);
    } else if (q.type === 'SA') {
      const inp = h('input', { placeholder: 'Nhập đáp số...' }), row = h('div', { class: 'sa' });
      inp.addEventListener('keydown', e => e.key === 'Enter' && submit(inp.value));
      row.append(inp, h('button', { class: 'btn p', onclick: () => submit(inp.value) }, 'Trả lời')); box.append(row);
    } else { box.append(h('button', { class: 'opt self', onclick: () => submit('OK') }, '✓ Tự đánh giá: Đúng'), h('button', { class: 'opt self', onclick: () => submit('NO') }, '✗ Chưa đúng')); }
    return { el: box, lock() { done = true; box.classList.add('done'); reveal(null); } };
  }

  function feedback(q, ok, extra = '') {
    let s = `<div class="fb ${ok ? 'ok' : 'no'}">${ok ? '✓ CHÍNH XÁC' : '✗ CHƯA ĐÚNG'} ${extra}</div>`;
    if (C.show_answer !== false) {
      const ans = q.type === 'SA' ? q.answer_html : q.type === 'TF' ? [...q.correct].map(c => c === 'T' ? 'Đ' : 'S').join(' ') : q.correct;
      if (q.type !== 'ESSAY') s += `<div class="fb">Đáp án: ${ans}</div>`;
      if (q.solution) s += `<div class="sol">${q.solution}</div>`;
    }
    return s;
  }

  function qCard(q, head) {
    const lim = +C.time_limit > 0, el = h('div', { class: 'card' }, `<div class="qtop"><div class="qhead">${head}</div>${lim ? clockHTML() : ''}</div><div class="qbody">${q.html}</div>`);
    const bar = el.querySelector('.clock') || h('div', { class: 'clock off' });   // không giới hạn thời gian → không có đồng hồ
    if (lim) setClock(bar, +C.time_limit, +C.time_limit);
    return { el, bar };
  }
  const topBar = (title, right) => { const b = h('div', { class: 'bar' }, `<span>🎮 ${title}</span>`); const r = h('span', { class: 'pill' }, right); b.append(r);
    if (FX && MUSIC_ON) { const mb = h('button', { class: 'pill mbtn', title: 'Bật/tắt nhạc nền' }, FX.music.muted() ? '🔇' : '🎵'); mb.onclick = () => { const m = FX.music.toggleMute(); mb.textContent = m ? '🔇' : '🎵'; if (!m) FX.music.start(); }; b.append(mb); }
    return { el: b, set: t => (r.textContent = t) }; };
  function endScreen(score, ok, total, title) {
    Sound.win(); app.innerHTML = '';
    app.append(h('div', { class: 'card end' }, `${title || '🏆 HOÀN THÀNH'}<br>Điểm: <b>${score}</b><br>Đúng ${ok}/${total} câu`), h('button', { class: 'btn p', onclick: () => location.reload() }, '↻ Chơi lại'));
  }

  const GAMES = {};

  // ô cửa: mỗi ô một màu gradient theo số thứ tự (bắt mắt); lưới ô vuông nhỏ, tối đa ~112px/ô, căn giữa
  const DOOR_HUES = [212, 258, 305, 192, 26, 232, 284];                       // xanh dương, tím, hồng tím, lam, cam…: KHÔNG dùng xanh lá/đỏ để ô «đã mở» (xanh lá) và «sai» (đỏ) luôn nổi bật
  const paintDoor = (d, i) => { const hu = DOOR_HUES[(i * 3) % DOOR_HUES.length]; d.style.setProperty('--g1', `hsl(${hu},86%,56%)`); d.style.setProperty('--g2', `hsl(${(hu + 24) % 360},80%,36%)`); return d; };
  const doorGrid = (grid, cols) => { cols = Math.max(1, cols | 0); grid.style.gridTemplateColumns = `repeat(${cols},minmax(0,1fr))`; grid.style.maxWidth = (cols * 112 + (cols - 1) * 10) + 'px'; };
  GAMES.secret_door = () => {
    const n = Q.length, state = Array(n).fill(null); let score = 0, busy = false, okc = 0;
    const tb = topBar(D.title, '⭐ 0'), grid = h('div', { class: 'doors' }), panel = h('div');
    doorGrid(grid, C.cols || 4);
    if (D.background_url) Object.assign(grid.style, { backgroundImage: `url(${D.background_url})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '12px', borderRadius: '12px' });
    const doors = Q.map((q, i) => { const d = paintDoor(h('button', { class: 'door', onclick: () => pick(i) }, String(i + 1).padStart(2, '0')), i); grid.append(d); return d; });
    app.append(tb.el, grid, panel);
    function pick(i) {
      if (busy || state[i]) return;
      if (C.order === 'sequence' && i !== state.findIndex(s => !s)) { doors[i].classList.add('shake'); setTimeout(() => doors[i].classList.remove('shake'), 300); return; }
      busy = true; const q = Q[i]; const card = qCard(q, `Ô ${i + 1} · ${{ MCQ: 'MC', ESSAY: 'Tự luận' }[q.type] || q.type}`); panel.innerHTML = '';
      const finish = (a, timeout) => { tm.stop(); ask.lock(); const ok = !timeout && isCorrect(q, a); state[i] = ok ? 'open' : 'failed';
        doors[i].className = 'door ' + state[i]; doors[i].textContent = ok ? '+' + C.points : '✗'; if (ok) { score += C.points; okc++; }
        ok ? Sound.ok() : Sound.bad(); tb.set('⭐ ' + score);
        card.el.append(h('div', {}, feedback(q, ok, timeout ? '(hết giờ)' : '')));
        const last = state.every(s => s);
        card.el.append(h('button', { class: 'btn p', onclick: () => { panel.innerHTML = ''; busy = false; if (last) endScreen(score, okc, n); } }, last ? 'Xem kết quả' : 'Đóng'));
        typeset(card.el); };
      const ask = askUI(q, a => finish(a, false)); card.el.append(ask.el); panel.append(card.el);
      const tm = makeTimer(C.time_limit, card.bar, () => finish('', true)); typeset(card.el);
    }
  };

  GAMES.speed = () => {
    let i = 0, score = 0, okc = 0; const tb = topBar(D.title, '⭐ 0');
    function show() {
      if (i >= Q.length) return endScreen(score, okc, Q.length);
      const q = Q[i]; app.innerHTML = ''; app.append(tb.el);
      const card = qCard(q, `CÂU ${String(i + 1).padStart(2, '0')} / ${Q.length}`);
      const finish = (a, timeout) => { tm.stop(); ask.lock(); const ok = !timeout && isCorrect(q, a); let pts = 0;
        if (ok) { const el = tm.elapsed(); pts = C.points + (C.time_limit > 0 ? Math.round(C.points * C.speed_bonus * Math.max(0, C.time_limit - el) / C.time_limit) : 0); score += pts; okc++; }
        ok ? Sound.ok() : Sound.bad(); tb.set('⭐ ' + score);
        card.el.append(h('div', {}, feedback(q, ok, ok ? `+${pts} điểm` : timeout ? '(hết giờ)' : '')));
        const nxt = () => { i++; show(); };
        if (C.auto_next && !q.solution) setTimeout(nxt, 1800); else card.el.append(h('button', { class: 'btn p', onclick: nxt }, 'Câu tiếp ➡'));
        typeset(card.el); };
      const ask = askUI(q, a => finish(a, false)); card.el.append(ask.el); app.append(card.el);
      const tm = makeTimer(C.time_limit, card.bar, () => finish('', true)); typeset(card.el);
    }
    show();
  };

  GAMES.bingo = () => {
    const size = +C.size, need = size * size;
    const cells = shuffle(Q.filter(q => q.label_html)).slice(0, need);
    if (cells.length < need) { app.append(h('div', { class: 'card' }, `Cần ít nhất ${need} câu có đáp án cho Bingo ${size}×${size}.`)); return; }
    const board = shuffle(cells), order = shuffle(cells), marked = new Set(); let qi = 0, score = 0, linesDone = 0;
    const tb = topBar(D.title, '⭐ 0'), grid = h('div', { class: 'grid' }), panel = h('div');
    grid.style.gridTemplateColumns = `repeat(${size},1fr)`; let tm = null;
    const lines = () => { const L = []; for (let r = 0; r < size; r++) { L.push([...Array(size)].map((_, c) => r * size + c)); L.push([...Array(size)].map((_, c) => c * size + r)); }
      L.push([...Array(size)].map((_, k) => k * size + k), [...Array(size)].map((_, k) => k * size + size - 1 - k)); return L.filter(l => l.every(x => marked.has(x))); };
    const btns = board.map((q, k) => { const b = h('button', { class: 'cell', onclick: () => click(k) }, q.label_html); grid.append(b); return b; });
    app.append(tb.el, panel, grid);
    function next() {
      if (qi >= order.length) return endScreen(score, marked.size, order.length);
      const q = order[qi]; panel.innerHTML = ''; const card = qCard(q, `CÂU ${qi + 1} / ${order.length} — tìm đáp án trên bảng`);
      card.el.append(h('button', { class: 'btn', onclick: () => { qi++; next(); } }, 'Bỏ qua ➡')); panel.append(card.el);
      if (tm) tm.stop(); tm = makeTimer(C.time_limit, card.bar, () => { qi++; next(); }); typeset(card.el);
    }
    function click(k) {
      if (marked.has(k) || qi >= order.length) return;
      if (board[k].id === order[qi].id) {
        marked.add(k); btns[k].classList.add('mark'); score += C.points; Sound.ok();
        const L = lines(); L.flat().forEach(x => btns[x].classList.add('line'));
        if (L.length > linesDone) { score += (L.length - linesDone) * C.line_bonus; linesDone = L.length; Sound.win(); }
        tb.set('⭐ ' + score + (linesDone ? ` · BINGO ×${linesDone}` : '')); qi++; setTimeout(next, 400);
      } else { Sound.bad(); btns[k].classList.add('shake'); setTimeout(() => btns[k].classList.remove('shake'), 300); }
    }
    typeset(grid); next();
  };


  /* ---------- Phase 4 ---------- */
  const teamsOf = () => (C.teams || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
  const ICONS = ['🚗', '🚙', '🏎', '🚕', '🚓', '🚌', '🛵', '🚚'];
  const answerBlock = q => { const a = q.type === 'SA' ? q.answer_html : q.type === 'TF' ? [...q.correct].map(c => c === 'T' ? 'Đ' : 'S').join(' ') : q.correct;
    return `<div class="fb">Đáp án: ${a}</div>` + (q.solution ? `<div class="sol">${q.solution}</div>` : ''); };

  function teamJudge(q, teams, head, onDone) {   // chế độ giáo viên chấm: hiện đáp án rồi chọn đội đúng
    const card = qCard(q, head), picked = new Set(), ans = h('div');
    const tm = makeTimer(C.time_limit, card.bar, () => {});
    if (q.type === 'MCQ' || q.type === 'TF')
      card.el.append(h('div', { class: 'ask done' }, q.choices.map((c, i) => `<div class="opt"><b>${(q.type === 'MCQ' ? 'ABCD' : 'abcd')[i]}.</b> <span>${c}</span></div>`).join('')));
    card.el.append(h('button', { class: 'btn', onclick: () => { ans.innerHTML = answerBlock(q); typeset(ans); } }, '👁 Hiện đáp án'), ans);
    const row = h('div', { class: 'teams' });
    teams.forEach((t, k) => { const b = h('button', { class: 'btn', onclick: () => { picked.has(k) ? picked.delete(k) : picked.add(k); b.classList.toggle('on'); } }, `${ICONS[k]} ${t} ✓`); row.append(b); });
    card.el.append(row, h('button', { class: 'btn p', onclick: () => { tm.stop(); Sound.ok(); onDone([...picked]); } }, 'Xong ➡'));
    return card.el;
  }
  function podium(names, vals, unit, title, icons) {
    Sound.win(); app.innerHTML = '';
    const order = names.map((n, k) => k).sort((a, b) => vals[b] - vals[a]), medals = ['🥇', '🥈', '🥉'];
    app.append(h('div', { class: 'card end' }, `${title || '🏆 KẾT QUẢ'}` + order.map((k, r) => `<div class="medal">${medals[r] || (r + 1) + '.'} ${(icons || ICONS)[k]} ${names[k]} — <b style="font-size:1em">${vals[k]}</b> ${unit}</div>`).join('')),
      h('button', { class: 'btn p', onclick: () => location.reload() }, '↻ Chơi lại'));
  }

  GAMES.racing = () => {
    const teams = teamsOf(), prog = teams.map(() => 0); let i = 0; const lanes = h('div', { class: 'card' }), area = h('div');
    const draw = () => { lanes.innerHTML = teams.map((t, k) => { const pct = Math.min(100, 100 * prog[k] / Q.length);
      return `<div class="lane"><span>${ICONS[k]} ${t}</span><div class="track"><i style="width:${pct}%"></i><b style="left:calc(${pct}% - 14px)">${ICONS[k]}</b></div><span>${prog[k]}/${Q.length}</span></div>`; }).join('') + '<div class="flag">🏁</div>'; };
    app.append(topBar(D.title, `${Q.length} câu`).el, lanes, area); draw();
    const show = () => { if (i >= Q.length) return podium(teams, prog, 'câu đúng', '🏁 VỀ ĐÍCH');
      area.innerHTML = ''; const el = teamJudge(Q[i], teams, `CÂU ${String(i + 1).padStart(2, '0')} / ${Q.length}`, idx => { idx.forEach(t => prog[t]++); i++; draw(); show(); });
      area.append(el); typeset(el); };
    show();
  };

  GAMES.arena = () => {
    const teams = teamsOf(), sc = teams.map(() => 0), used = Q.map(() => false); let busy = false;
    const board = h('div', { class: 'card' }), grid = h('div', { class: 'doors' }), panel = h('div');
    doorGrid(grid, Math.min(6, Q.length));
    const draw = () => { board.innerHTML = '<b>🏆 BẢNG ĐIỂM</b>' + teams.map((t, k) => [k, t]).sort((a, b) => sc[b[0]] - sc[a[0]])
      .map(([k, t], r) => `<div>${r + 1}. ${ICONS[k]} ${t} — <b>${sc[k]}</b></div>`).join(''); };
    const doors = Q.map((q, k) => { const d = paintDoor(h('button', { class: 'door', onclick: () => pick(k) }, String(k + 1).padStart(2, '0')), k); grid.append(d); return d; });
    app.append(topBar(D.title, `${Q.length} câu`).el, board, grid, panel); draw();
    function pick(k) { if (busy || used[k]) return; busy = true; panel.innerHTML = '';
      const el = teamJudge(Q[k], teams, `ĐẤU TRƯỜNG · Câu ${k + 1}`, idx => { idx.forEach(t => sc[t] += +C.points); used[k] = true; doors[k].className = 'door open';
        doors[k].textContent = '✓'; draw(); panel.innerHTML = ''; busy = false; if (used.every(Boolean)) podium(teams, sc, 'điểm', '🏆 CHUNG CUỘC'); });
      panel.append(el); typeset(el); }
  };

  GAMES.lives = () => {
    let i = 0, score = 0, lives = +C.lives, okc = 0; const tb = topBar(D.title, '');
    const upd = () => tb.set('❤️'.repeat(lives) + '🖤'.repeat(Math.max(0, C.lives - lives)) + ` · ⭐ ${score}`);
    function show() {
      if (lives <= 0) return endScreen(score, okc, Q.length, '💔 HẾT MẠNG');
      if (i >= Q.length) return endScreen(score, okc, Q.length);
      const q = Q[i]; app.innerHTML = ''; upd(); app.append(tb.el);
      const card = qCard(q, `CÂU ${String(i + 1).padStart(2, '0')} / ${Q.length}`);
      const finish = (a, timeout) => { tm.stop(); ask.lock(); const ok = !timeout && isCorrect(q, a);
        if (ok) { score += +C.points; okc++; Sound.ok(); } else { if (!timeout || C.lose_on_timeout) lives--; Sound.bad(); }
        upd(); card.el.append(h('div', {}, feedback(q, ok, timeout ? '(hết giờ)' : '')));
        card.el.append(h('button', { class: 'btn p', onclick: () => { i++; show(); } }, lives <= 0 ? 'Tiếp ➡' : 'Câu tiếp ➡')); typeset(card.el); };
      const ask = askUI(q, a => finish(a, false)); card.el.append(ask.el); app.append(card.el);
      const tm = makeTimer(C.time_limit, card.bar, () => finish('', true)); typeset(card.el);
    }
    show();
  };

  GAMES.detective = () => {
    const kw = [...(C.keyword || '')], n = Q.length, got = Q.map(() => false), lines = (C.clues || '').split('\n').filter(x => x.trim());
    const chunk = k => kw.slice(Math.floor(k * kw.length / n), Math.floor((k + 1) * kw.length / n)).join('');
    const mask = () => Q.map((_, k) => got[k] ? chunk(k) : '•'.repeat([...chunk(k)].length)).join('');
    let i = 0; const tb = topBar(D.title, '🔎 0'), vault = h('div', { class: 'card' }), clues = h('div', { class: 'card clues' }, '<b>🔎 MANH MỐI</b>'), area = h('div');
    const upd = () => { vault.innerHTML = `🔐 <span class="code">${mask()}</span>`; tb.set(`🔎 ${got.filter(Boolean).length}/${n}`); };
    app.append(tb.el, vault, clues, area); upd();
    function show() {
      if (i >= n) { const all = got.every(Boolean); Sound.win(); area.innerHTML = '';
        return area.append(h('div', { class: 'card end' }, all ? `🔓 MỞ KHÓA THÀNH CÔNG<br><span class="code">${C.keyword}</span>` : `🔒 Chưa mở được khóa<br><span class="code">${mask()}</span>`), h('button', { class: 'btn p', onclick: () => location.reload() }, '↻ Chơi lại')); }
      const q = Q[i]; area.innerHTML = ''; const card = qCard(q, `CÂU ${i + 1} / ${n}`);
      const finish = (a, timeout) => { tm.stop(); ask.lock(); const ok = !timeout && isCorrect(q, a); got[i] = ok; ok ? Sound.ok() : Sound.bad();
        if (ok) clues.append(h('div', {}, `🔎 <b>Manh mối ${i + 1}:</b> ${(lines[i] || '')} ${chunk(i)}`)); upd();
        card.el.append(h('div', {}, feedback(q, ok, timeout ? '(hết giờ)' : '')), h('button', { class: 'btn p', onclick: () => { i++; show(); } }, 'Câu tiếp ➡')); typeset(card.el); };
      const ask = askUI(q, a => finish(a, false)); card.el.append(ask.el); area.append(card.el);
      const tm = makeTimer(C.time_limit, card.bar, () => finish('', true)); typeset(card.el);
    }
    show();
  };

  GAMES.puzzle = () => {
    const n = Q.length, cols = { 4: 2, 6: 3, 9: 3, 12: 4, 16: 4 }[n] || Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), opened = Q.map(() => false);
    const pic = h('div', { class: 'puz' }, D.image_url ? '' : '<div class="art">π ∑ ∫</div>'), tiles = h('div', { class: 'tiles' }); let i = 0;
    pic.style.aspectRatio = `${cols * 4}/${rows * 3}`; if (D.image_url) { pic.style.backgroundImage = `url(${D.image_url})`; pic.style.backgroundSize = '100% 100%'; }
    tiles.style.gridTemplateColumns = `repeat(${cols},1fr)`; tiles.style.gridTemplateRows = `repeat(${rows},1fr)`;
    const tl = Q.map((_, k) => { const t = paintDoor(h('div', { class: 'tile' }, String(k + 1)), k); tiles.append(t); return t; }); pic.append(tiles);
    if (D.content_html) { const cont = h('div', { class: 'tiles' }); cont.style.gridTemplateColumns = tiles.style.gridTemplateColumns; cont.style.gridTemplateRows = tiles.style.gridTemplateRows;
      D.content_html.forEach(c => cont.append(h('div', { class: 'cell-c' }, c))); pic.querySelector('.art')?.remove(); pic.insertBefore(cont, tiles); typeset(cont); }
    const tb = topBar(D.title, `🧩 0/${n}`), area = h('div'); app.append(tb.el, pic, area);
    function show() {
      if (i >= n) { const c = opened.filter(Boolean).length; Sound.win(); area.innerHTML = '';
        return area.append(h('div', { class: 'card end' }, c === n ? '🎉 HOÀN THÀNH BỨC HÌNH' : `Mở được ${c}/${n} mảnh`), h('button', { class: 'btn p', onclick: () => location.reload() }, '↻ Chơi lại')); }
      const q = Q[i]; area.innerHTML = ''; const card = qCard(q, `CÂU ${i + 1} / ${n}`);
      const finish = (a, timeout) => { tm.stop(); ask.lock(); const ok = !timeout && isCorrect(q, a); opened[i] = ok; ok ? Sound.ok() : Sound.bad();
        if (ok) tl[i].classList.add('gone'); tb.set(`🧩 ${opened.filter(Boolean).length}/${n}`);
        card.el.append(h('div', {}, feedback(q, ok, timeout ? '(hết giờ)' : '')), h('button', { class: 'btn p', onclick: () => { i++; show(); } }, 'Câu tiếp ➡')); typeset(card.el); };
      const ask = askUI(q, a => finish(a, false)); card.el.append(ask.el); area.append(card.el);
      const tm = makeTimer(C.time_limit, card.bar, () => finish('', true)); typeset(card.el);
    }
    show();
  };

  /* ---------- Ai là triệu phú (offline, chơi một mình) ---------- */
  GAMES.millionaire = () => {
    const N = Q.length, prizes = D.prizes, safe = D.safe || [], reserve = (D.reserve || []).slice();
    const fmt = n => (+n).toLocaleString('vi-VN');
    let i = 0, level = 0, curTm = null; const used = { fifty: false, swap: false };
    const tb = topBar(D.title, '💰 0'), ladder = h('div', { class: 'card ladder' }), main = h('div', { class: 'main' }), wrap = h('div', { class: 'mil' });
    wrap.append(main, ladder);
    const prizeOf = lv => (lv ? prizes[lv - 1] : 0);
    const safePrize = lv => { const s = safe.filter(x => x <= lv).pop(); return s ? prizes[s - 1] : 0; };
    const drawLadder = () => {
      ladder.innerHTML = Array.from({ length: N }, (_, k) => N - 1 - k).map(k =>
        `<div class="step ${k === i ? 'cur' : ''} ${k < level ? 'done' : ''}">${safe.includes(k + 1) ? '🛡' : '&nbsp;&nbsp;&nbsp;'} <b>${k + 1}</b> &nbsp; ${fmt(prizes[k])}</div>`).join('');
      tb.set('💰 ' + fmt(prizeOf(level)));
    };
    const end = (amount, title, msg) => {
      if (curTm) curTm.stop(); Sound.win(); app.innerHTML = '';
      app.append(h('div', { class: 'card end' }, `${title}<br>${msg}<br><b>${fmt(amount)}</b> điểm`), h('button', { class: 'btn p', onclick: () => location.reload() }, '↻ Chơi lại'));
    };
    function render(q) {
      if (curTm) curTm.stop(); main.innerHTML = ''; drawLadder(); let done = false;
      const card = qCard(q, `CÂU ${i + 1} / ${N} · ${fmt(prizes[i])} điểm`), lifes = h('div', { class: 'lifes' });
      const finish = (a, timeout) => {
        if (done) return; done = true; curTm.stop(); ask.lock();
        const ok = !timeout && isCorrect(q, a); ok ? Sound.ok() : Sound.bad();
        card.el.append(h('div', {}, feedback(q, ok, timeout ? '(hết giờ)' : '')));
        if (ok) {
          level = i + 1; drawLadder();
          card.el.append(level === N
            ? h('button', { class: 'btn p', onclick: () => end(prizes[N - 1], '🏆 TRIỆU PHÚ!', 'Bạn đã vượt qua tất cả các câu hỏi') }, 'Nhận thưởng 🏆')
            : h('button', { class: 'btn p', onclick: () => { i++; render(Q[i]); } }, 'Câu tiếp ➡'));
        } else card.el.append(h('button', { class: 'btn p', onclick: () => end(safePrize(level), '💔 RẤT TIẾC', 'Bạn nhận mốc an toàn') }, 'Xem kết quả'));
        typeset(card.el);
      };
      const ask = askUI(q, a => finish(a, false));
      const b5 = h('button', { class: 'btn', onclick: () => {                      // 50:50: ẩn hai đáp án sai
        if (used.fifty || done) return; const L = 'ABCD', opts = ask.el.querySelectorAll('.opt');
        shuffle([...Array(q.choices.length).keys()].filter(k => !q.correct.includes(L[k]))).slice(0, 2).forEach(k => { opts[k].style.visibility = 'hidden'; });
        used.fifty = true; b5.disabled = true; } }, '50:50');
      if (q.type !== 'MCQ' || q.correct.length !== 1 || used.fifty || C.allow_5050 === false) b5.disabled = true;
      const bs = h('button', { class: 'btn', onclick: () => {                      // đổi câu: lấy câu dự phòng cùng dạng/mức
        if (used.swap || done) return; const same = reserve.filter(r => r.type === q.type);
        const alt = same.filter(r => r.difficulty === q.difficulty)[0] || same[0] || reserve[0]; if (!alt) return;
        reserve.splice(reserve.indexOf(alt), 1); used.swap = true; Q[i] = Object.assign({}, alt); render(Q[i]); } }, '🔄 Đổi câu');
      if (used.swap || !reserve.length || C.allow_swap === false) bs.disabled = true;
      const bw = h('button', { class: 'btn', onclick: () => {                      // dừng & nhận thưởng (bấm hai lần để chắc chắn)
        if (done) return; if (!bw.dataset.sure) { bw.dataset.sure = '1'; bw.textContent = 'Chắc chắn dừng?'; return; }
        done = true; end(prizeOf(level), '🏳 DỪNG CUỘC CHƠI', 'Bạn mang về'); } }, '🏳 Dừng & nhận thưởng');
      if (C.allow_walk === false) bw.disabled = true;
      lifes.append(b5, bs, bw); card.el.insertBefore(lifes, card.el.querySelector('.qbody').nextSibling);
      card.el.append(ask.el); main.append(card.el);
      curTm = makeTimer(C.time_limit, card.bar, () => finish('', true)); typeset(card.el);
    }
    app.append(tb.el, wrap); render(Q[0]);
  };

  /* ---------- Rung chuông vàng (offline, giáo viên điều khiển: nhập số bạn ngồi xuống sau mỗi câu) ---------- */
  GAMES.golden_bell = () => {
    const total = +C.class_size || 40; let left = total, i = 0, rounds = 0, voided = 0;
    const tb = topBar(D.title, `🔔 ${left}/${total}`), area = h('div'); app.append(tb.el, area);
    const end = shared => {
      Sound.win(); app.innerHTML = '';
      const title = shared ? `🏆 ĐỒNG HẠNG NHẤT — ${left} bạn` : left === 1 ? '🏆 QUÁN QUÂN — còn 1 bạn đứng!' : `Hết câu hỏi — còn ${left} bạn đứng vững`;
      app.append(h('div', { class: 'card end' }, `${title}<br>Đã qua ${rounds} vòng${voided ? ` · ${voided} câu bị hủy` : ''}`), h('button', { class: 'btn p', onclick: () => location.reload() }, '↻ Chơi lại'));
    };
    const show = () => {
      if (left <= 1 || i >= Q.length) return end(false);
      const q = Q[i]; area.innerHTML = ''; tb.set(`🔔 ${left}/${total}`);
      const card = qCard(q, `CÂU ${i + 1} · còn đứng ${left}/${total}`), tm = makeTimer(C.time_limit, card.bar, () => {}), ans = h('div'); let out = 0;
      if (q.type === 'MCQ' || q.type === 'TF') card.el.append(h('div', { class: 'ask done' }, q.choices.map((c, k) => `<div class="opt"><b>${(q.type === 'MCQ' ? 'ABCD' : 'abcd')[k]}.</b> <span>${c}</span></div>`).join('')));
      card.el.append(h('button', { class: 'btn', onclick: () => { ans.innerHTML = answerBlock(q); typeset(ans); } }, '👁 Hiện đáp án'), ans);
      const cnt = h('b', { id: 'out' }, '0'), step = d => () => { out = Math.max(0, Math.min(left, out + d)); cnt.textContent = out; };
      card.el.append(h('div', { class: 'lifes' }), h('div', { class: 'teams' }));
      const row = card.el.querySelector('.teams'); row.append(h('span', {}, '💺 Số bạn ngồi xuống (sai):'), h('button', { class: 'btn', onclick: step(-1) }, '−'), cnt, h('button', { class: 'btn', onclick: step(1) }, '+'));
      card.el.append(h('button', { class: 'btn p', onclick: () => {
        tm.stop(); Sound.ok();
        if (out >= left) { if (C.all_wrong === 'share') return end(true); voided++; i++; return show(); }      // cả lớp cùng sai: hủy câu (hoặc đồng hạng)
        left -= out; rounds++; i++; show(); } }, 'Xong ➡'));
      area.append(card.el); typeset(card.el);
    };
    show();
  };

  /* ---------- Đường lên đỉnh Olympia (offline, giáo viên chấm) ---------- */
  GAMES.olympia = () => {
    const teams = D.teams, T = teams.length, N = Q.length, B = D.bounds, ICON = ['🔴', '🔵', '🟢', '🟡', '🟣', '🟠', '⚫', '⚪'];
    const sc = teams.map(() => 0), opened = new Set(); let i = 0, kwDone = false;
    const tb = topBar(D.title, ''), board = h('div', { class: 'card' }), kwBox = h('div', { class: 'card' }), area = h('div');
    app.append(tb.el, board, kwBox, area);
    const ph = k => [0, 1, 2, 3].find(p => k >= B[p] && k < B[p + 1]);
    const mask = () => kwDone ? C.keyword : D.chunks.map((c, r) => opened.has(r) ? c : '•'.repeat([...c].length)).join('');
    const draw = () => {
      board.innerHTML = '<b>🏆 BẢNG ĐIỂM</b>' + teams.map((t, k) => [k, t]).sort((a, b) => sc[b[0]] - sc[a[0]]).map(([k, t], r) => `<div>${r + 1}. ${ICON[k]} ${t} — <b>${sc[k]}</b></div>`).join('');
      kwBox.innerHTML = `🔑 Chướng ngại vật: <span class="code">${mask()}</span> (${opened.size}/${B[2] - B[1]} hàng)`;
      kwBox.style.display = (i >= B[1] || kwDone) ? '' : 'none';
    };
    function show() {
      if (i >= N) { draw(); return podium(teams, sc, 'điểm', '🏆 ĐƯỜNG LÊN ĐỈNH OLYMPIA', ICON); }
      const p = ph(i), q = Q[i], turn = D.turn[i], tier = D.tier[i];
      tb.set(`📍 Phần ${p + 1}/4 — ${D.phases[p]}`); draw(); area.innerHTML = '';
      const card = qCard(q, `${D.phases[p].toUpperCase()} · câu ${i - B[p] + 1}/${B[p + 1] - B[p]}` + (turn != null ? ` · lượt ${ICON[turn]} ${teams[turn]}` : '') + (tier ? ` · ${tier} điểm` : ''));
      const tm = makeTimer(C.time_limit, card.bar, () => {}), ans = h('div'), ctl = h('div', { class: 'teams' });
      if (q.type === 'MCQ' || q.type === 'TF') card.el.append(h('div', { class: 'ask done' }, q.choices.map((c, k) => `<div class="opt"><b>${(q.type === 'MCQ' ? 'ABCD' : 'abcd')[k]}.</b> <span>${c}</span></div>`).join('')));
      card.el.append(h('button', { class: 'btn', onclick: () => { ans.innerHTML = answerBlock(q); typeset(ans); } }, '👁 Hiện đáp án'), ans, ctl);
      const next = () => { tm.stop(); Sound.ok(); i++; show(); };
      if (p === 0 || p === 3) {                                                    // lượt của một đội: đúng / sai
        ctl.append(h('button', { class: 'btn p', onclick: () => { sc[turn] += p === 0 ? +C.warmup_points : tier; next(); } }, `✓ ${teams[turn]} trả lời đúng`), h('button', { class: 'btn', onclick: next }, '✗ Sai / không trả lời'));
      } else if (p === 1) {                                                         // mọi đội trả lời: chọn các đội đúng; đúng ≥ 1 đội thì mở một hàng
        const picked = new Set();
        teams.forEach((t, k) => { const b = h('button', { class: 'btn', onclick: () => { picked.has(k) ? picked.delete(k) : picked.add(k); b.classList.toggle('on'); } }, `${ICON[k]} ${t} ✓`); ctl.append(b); });
        ctl.append(h('button', { class: 'btn p', onclick: () => { picked.forEach(k => { sc[k] += +C.obstacle_points; }); if (picked.size) opened.add(i - B[1]); next(); } }, 'Xong ➡'));
      } else {                                                                      // tăng tốc: bấm các đội đúng theo thứ tự nhanh → chậm
        const order = [];
        teams.forEach((t, k) => { const b = h('button', { class: 'btn', onclick: () => { if (order.includes(k)) return; order.push(k); b.classList.add('on'); b.textContent = `#${order.length} ${ICON[k]} ${t}`; } }, `${ICON[k]} ${t}`); ctl.append(b); });
        ctl.append(h('button', { class: 'btn p', onclick: () => { order.forEach((k, r) => { sc[k] += r < D.speed_points.length ? D.speed_points[r] : 0; }); next(); } }, 'Xong ➡'));
      }
      if (p >= 1 && !kwDone) {                                                      // trao điểm đoán đúng chướng ngại vật
        const g = h('div', { class: 'teams' }); card.el.append(g);
        teams.forEach((t, k) => g.append(h('button', { class: 'btn', onclick: () => {
          const pts = Math.max(10, +C.kw_points - 10 * Math.max(0, opened.size - 1)); sc[k] += pts; kwDone = true; g.remove(); draw(); Sound.win(); } }, `🔑 ${t} đoán đúng CNV`)));
      }
      area.append(card.el); typeset(card.el);
    }
    show();
  };

  /* API cho game plugin: GTM.register('id', () => {...}) */
  window.GTM = { h, typeset, shuffle, ICONS, Sound, isCorrect, askUI, feedback, qCard, makeTimer, topBar, endScreen, podium, teamsOf, answerBlock, teamJudge,
    app, data: D, config: C, questions: Q, register: (id, fn) => { GAMES[id] = fn; } };
  const start = () => (GAMES[D.game_type] || (() => (app.textContent = 'Game này chưa hỗ trợ xuất HTML offline: ' + D.game_type)))();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
