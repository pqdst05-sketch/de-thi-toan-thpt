/* Bản offline của Luyện tập (Chạy thử / Xuất HTML để học sinh tự luyện ở nhà). Cùng thuật toán với games/practice.py. */
GTM.register('practice', () => {
  const { h, typeset, app, data: D, config: C, questions: Q, isCorrect, askUI, Sound } = GTM;
  const LV = ['NB', 'TH', 'VD', 'VDC'], NAMES = D.level_names || { NB: 'Nhận biết', TH: 'Thông hiểu', VD: 'Vận dụng', VDC: 'Vận dụng cao' }, HAS = !!D.has_levels;
  const cfg = k => +C[k] || 0, lvOf = q => (LV.indexOf(q.level) >= 0 ? LV.indexOf(q.level) : 1), topicOf = q => q.topic || 'Khác';
  const T = { level: HAS ? Math.max(cfg('start_level') - 1, 0) : 0, streak: 0, best: 0, n: 0, ok: 0, served: 0, xp: 0, seen: new Set(), skipped: [], queue: [], cur: null, answered: false, hint: 0, fb: null, essayWait: false, essayText: '', review: false, byLevel: {}, byTopic: {}, targetDone: false };
  let t0 = Date.now(), iv = null, ended = false;
  const limit = cfg('duration_min') * 60, rand = a => a[Math.floor(Math.random() * a.length)], rate = v => (v[0] ? Math.round(100 * v[1] / v[0]) : 0);

  function pick() {
    const due = T.queue.filter(e => e.due <= T.served).sort((a, b) => a.due - b.due);
    if (due.length) { T.review = true; return Q.find(q => q.id === due[0].qid); }
    T.review = false;
    let pool = Q.filter(q => !T.seen.has(q.id) && !T.skipped.includes(q.id));
    if (!pool.length) pool = Q.filter(q => T.skipped.includes(q.id));
    if (pool.length) {
      if (C.adaptive !== false && HAS) { const d = q => Math.abs(lvOf(q) - T.level) - (lvOf(q) > T.level ? 0.1 : 0), best = Math.min(...pool.map(d)); pool = pool.filter(q => d(q) === best); }
      return rand(pool);
    }
    if (T.queue.length) { T.review = true; const e = T.queue.reduce((a, b) => (b.due < a.due ? b : a)); return Q.find(q => q.id === e.qid); }
    return null;
  }
  function next() {
    const q = pick(); T.cur = q; T.answered = false; T.hint = 0; T.fb = null; T.essayWait = false; T.essayText = '';
    if (q) { T.seen.add(q.id); T.skipped = T.skipped.filter(x => x !== q.id); T.served++; }
    render();
  }
  function queueUpdate(qid, ok) {
    const gap = cfg('review_gap') || 3, grad = cfg('graduate') || 2, e = T.queue.find(x => x.qid === qid);
    if (!ok) { if (!e) T.queue.push({ qid, due: T.served + gap, ok: 0, wrong: 1 }); else { e.ok = 0; e.due = T.served + gap; e.wrong++; } }
    else if (e) { e.ok++; if (e.ok >= grad) T.queue = T.queue.filter(x => x !== e); else e.due = T.served + gap * (e.ok + 1); }
  }
  function count(q, ok) {
    T.n++; T.ok += ok ? 1 : 0;
    [[T.byLevel, LV[lvOf(q)]], [T.byTopic, topicOf(q)]].forEach(([d, k]) => { d[k] = d[k] || [0, 0]; d[k][0]++; d[k][1] += ok ? 1 : 0; });
  }
  function answer(q, a) {
    const ok = isCorrect(q, a), base = cfg('points') || 10, gain = ok ? (T.hint === 0 ? base : Math.max(Math.floor(base / 2), 1)) : 0;
    count(q, ok); T.xp += gain;
    if (ok) { T.streak++; T.best = Math.max(T.best, T.streak); Sound.ok && Sound.ok(); } else { T.streak = 0; Sound.bad && Sound.bad(); }
    if (C.adaptive !== false && HAS) { const lv = lvOf(q); if (ok && T.hint === 0 && T.streak >= (cfg('up_after') || 2)) { T.level = Math.min(3, Math.max(T.level, lv) + 1); T.streak = 0; } else if (!ok) T.level = Math.max(0, Math.min(T.level, lv) - 1); }
    queueUpdate(q.id, ok); T.answered = true; T.essayWait = false; T.fb = { ok, gain };
    if (cfg('target') && T.ok >= cfg('target')) T.targetDone = true;
    render();
  }
  function giveUp(q) { count(q, false); T.streak = 0; queueUpdate(q.id, false); T.answered = true; T.fb = { ok: false, gain: 0, gaveUp: true }; render(); }

  function notebook() {
    const ov = h('div', { class: 'ex-modal' }), box = h('div', { class: 'card ex-box', style: 'max-height:85vh;overflow:auto;text-align:left' }, `<div class="big" style="text-align:center">📒 SỔ LỖI SAI (${T.queue.length})</div>`);
    if (!T.queue.length) box.append(h('p', { style: 'text-align:center' }, 'Chưa có câu nào cần ôn — tuyệt vời! 🎉'));
    T.queue.forEach(e => { const q = Q.find(x => x.id === e.qid); box.append(h('div', { class: 'card ex-rv no' }, `<div class="qhead">Đã sai ${e.wrong} lần</div><div class="qbody">${q.html}</div>` + GTM.feedback(q, false).replace('✗ CHƯA ĐÚNG', 'Đáp án và lời giải:'))); });
    box.append(h('button', { class: 'btn p', onclick: () => ov.remove() }, 'Đóng')); ov.append(box); ov.addEventListener('click', e => e.target === ov && ov.remove()); document.body.append(ov); typeset(ov);
  }
  function finish() {
    ended = true; clearInterval(iv); Sound.win && Sound.win(); app.innerHTML = '';
    const lv = LV.filter(k => T.byLevel[k]).map(k => `<tr><td>${NAMES[k]}</td><td>${T.byLevel[k][1]}/${T.byLevel[k][0]}</td><td>${rate(T.byLevel[k])}%</td></tr>`).join('');
    const weak = Object.entries(T.byTopic).filter(([, v]) => v[0] >= 2 && rate(v) < 60).sort((a, b) => rate(a[1]) - rate(b[1])).slice(0, 5);
    app.append(h('div', { class: 'card center' }, `<div class="big">🏁 TỔNG KẾT LUYỆN TẬP</div><div class="ex-score">${T.xp} <small>XP</small></div><p>Đã làm <b>${T.n}</b> lượt · đúng <b>${T.ok}</b> (${T.n ? Math.round(100 * T.ok / T.n) : 0}%) · chuỗi đúng dài nhất <b>🔥${T.best}</b></p>`
      + (cfg('target') ? `<p>${T.targetDone ? '🎯 Đã đạt mục tiêu!' : '🎯 Chưa đạt mục tiêu ' + cfg('target') + ' câu đúng'}</p>` : '') + (lv ? `<table class="lb"><tr><td><b>Mức</b></td><td><b>Đúng</b></td><td><b>Tỉ lệ</b></td></tr>${lv}</table>` : '')));
    if (weak.length) app.append(h('div', { class: 'card' }, '<b>📚 Nên ôn thêm:</b><br>' + weak.map(([k, v]) => `• ${k} — đúng ${v[1]}/${v[0]} (${rate(v)}%)`).join('<br>')));
    const row = h('div', { class: 'card center' }); if (T.queue.length) row.append(h('button', { class: 'btn', onclick: notebook }, `📒 Xem ${T.queue.length} câu còn trong sổ lỗi sai`)); row.append(h('button', { class: 'btn p', onclick: () => location.reload() }, '↻ Luyện lại')); app.append(row);
  }

  function render() {
    if (ended) return; app.innerHTML = '';
    const left = Q.filter(q => !T.seen.has(q.id)).length, clock = h('b', { id: 'prclock' });
    const bar = h('div', { class: 'card clues' }, `🎯 Đúng <b>${T.ok}/${T.n}</b> · 🔥 <b>${T.streak}</b>${HAS ? ` · Mức <b>${NAMES[LV[T.level]]}</b>` : ''} · ⭐ <b>${T.xp}</b> · còn <b>${left}</b> câu mới${cfg('target') ? ` · mục tiêu <b>${Math.min(T.ok, cfg('target'))}/${cfg('target')}</b>` : ''}`);
    if (limit) { bar.append(' · ', clock); }
    bar.append(h('button', { class: 'btn', style: 'margin-left:8px', onclick: notebook }, `📒 Sổ lỗi sai${T.queue.length ? ' (' + T.queue.length + ')' : ''}`), h('button', { class: 'btn', style: 'margin-left:4px', onclick: finish }, '🏁 Kết thúc'));
    app.append(bar);
    if (T.targetDone) app.append(h('div', { class: 'fb ok' }, '🎉 Bạn đã đạt mục tiêu! Cứ luyện thêm nếu muốn.'));
    const q = T.cur;
    if (!q) {
      const c = h('div', { class: 'card center' }, `<div class="big">🎉 HẾT CÂU!</div><p>Bạn đã làm hết các câu hỏi.</p>`); c.append(h('button', { class: 'btn p', onclick: () => { T.seen.clear(); T.skipped = []; next(); } }, '🔁 Làm lại từ đầu'), h('button', { class: 'btn', onclick: finish }, '🏁 Tổng kết')); app.append(c); return;
    }
    const card = h('div', { class: 'card' }, `<div class="qhead">CÂU ${T.served}${T.review ? ' · 🔁 HỎI LẠI (từ sổ lỗi sai)' : ''}${HAS ? ' · ' + NAMES[LV[lvOf(q)]] : ''}</div><div class="qbody">${q.html}</div>`);
    card.dataset.qid = q.id;
    if (!T.answered && q.type === 'ESSAY') {                              // câu tự luận: gõ bài → xem lời giải → tự chấm
      if (T.essayWait) {
        const mine = h('div', { class: 'ex-es-ans' }); mine.textContent = T.essayText || '— (không gõ bài làm)';
        card.append(h('div', { class: 'muted' }, 'Bài làm của em:'), mine, h('div', { class: 'fb' }, '📖 Lời giải tham khảo — hãy đối chiếu rồi tự chấm:'),
          h('div', { class: 'sol' }, q.solution || '<i>Câu này chưa có lời giải mẫu — hãy tự đánh giá bài làm của em.</i>'));
        const sr = h('div', { class: 'ex-btns' }); card.append(sr);
        sr.append(h('button', { class: 'btn p', onclick: () => answer(q, 'OK') }, '✓ Em làm đúng'), h('button', { class: 'btn', onclick: () => answer(q, 'NO') }, '✗ Em chưa làm đúng'));
      } else {
        const ta = h('textarea', { class: 'ex-es', placeholder: 'Gõ bài làm của em (không bắt buộc — có thể làm ra giấy)...', maxlength: '2000', rows: '8', spellcheck: 'false' });
        const row = h('div', { class: 'ex-btns' });
        row.append(h('button', { class: 'btn p', onclick: () => { T.essayText = ta.value.trim(); T.essayWait = true; render(); } }, '📖 Nộp & xem lời giải'),
          h('button', { class: 'btn', onclick: () => giveUp(q) }, '👁 Xem lời giải ngay (không điểm)'),
          h('button', { class: 'btn', onclick: () => { if (C.allow_skip === false) return; T.seen.delete(q.id); T.skipped.push(q.id); next(); } }, '⏭ Bỏ qua'));
        card.append(ta, row);
      }
    } else if (!T.answered) {
      const ui = askUI(q, a => answer(q, a)); card.append(ui.el);
      if (T.hint >= 1) {                                                   // gợi ý bậc 1 (ngẫu nhiên nhưng cố định theo câu)
        if (q.type === 'MCQ') { const wrong = [...'ABCD'].slice(0, q.choices.length).filter(c => !q.correct.includes(c)); q._hide = q._hide || wrong.sort(() => Math.random() - 0.5).slice(0, 2);
          [...ui.el.querySelectorAll('.opt')].forEach((b, i) => { if (q._hide.includes('ABCD'[i])) { b.disabled = true; b.style.visibility = 'hidden'; } }); card.append(h('div', { class: 'fb' }, '💡 Đã loại 2 đáp án sai')); }
        else if (q.type === 'TF') { q._rv = q._rv != null ? q._rv : Math.floor(Math.random() * q.correct.length); card.append(h('div', { class: 'fb' }, `💡 Gợi ý: ý ${'abcd'[q._rv]}) là <b>${q.correct[q._rv] === 'T' ? 'Đúng' : 'Sai'}</b>`)); }
        else card.append(h('div', { class: 'fb' }, `💡 Gợi ý: đáp số gồm ${String(q.correct).replace(/\$/g, '').trim().length} ký tự`));
      }
      const row = h('div', { class: 'ex-btns' });
      if (T.hint === 0) row.append(h('button', { class: 'btn', onclick: () => { T.hint = 1; render(); } }, '💡 Gợi ý (−½ điểm)'));
      row.append(h('button', { class: 'btn', onclick: () => giveUp(q) }, '👁 Xem lời giải'), h('button', { class: 'btn', onclick: () => { if (C.allow_skip === false) return; T.seen.delete(q.id); T.skipped.push(q.id); next(); } }, '⏭ Bỏ qua'));
      card.append(row);
    } else {
      const fb = T.fb, extra = fb.gaveUp ? '' : fb.ok ? `+${fb.gain} điểm` : '';
      card.append(h('div', {}, GTM.feedback(q, fb.ok, extra).replace(fb.gaveUp ? /✗ CHƯA ĐÚNG/ : /^$/, '👁 ĐÃ XEM LỜI GIẢI')));
      if (!fb.ok) card.append(h('div', { class: 'fb' }, '📒 Câu này đã vào sổ lỗi sai, sẽ được hỏi lại sau.'));
      card.append(h('button', { class: 'btn p', style: 'width:100%;margin-top:8px', onclick: next }, 'Câu tiếp ➡'));
    }
    app.append(card); typeset(app);
    if (limit) { const tick = () => { const c = document.getElementById('prclock'); const left2 = limit - (Date.now() - t0) / 1000; if (c) c.textContent = '⏱ ' + Math.floor(Math.max(0, left2) / 60) + ':' + String(Math.max(0, Math.ceil(left2)) % 60).padStart(2, '0'); if (left2 <= 0 && !ended) finish(); }; clearInterval(iv); tick(); iv = setInterval(tick, 500); }
  }
  next();
});
