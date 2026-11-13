/* Âm thanh khi chơi (điện thoại học sinh, màn hình chiếu, bản Chạy thử/Xuất HTML): hiệu ứng ngắn + NHẠC NỀN, tạo bằng WebAudio (không dùng file,
   không vướng bản quyền). Chỉ phát khi giáo viên bật «Âm thanh» (SFX.set) — nhạc nền còn cần «Nhạc nền» (SFX.music.enable).
   Trình duyệt chỉ cho phát sau thao tác của người dùng: ngữ cảnh âm thanh chỉ phát khi state === 'running'; lần bấm/chạm/gõ đầu tiên gọi unlock().
   Trong cửa sổ của app (QtWebEngine cho phép tự phát) thì chạy ngay, không cần bấm. */
(function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  const SFX = {
    on: false, ctx: null,
    set(v) { this.on = !!v; if (!this.on) MU.halt(); },
    ensure() { if (!this.ctx && AC) { try { this.ctx = new AC(); } catch (e) { /* không có âm thanh */ } } return this.ctx; },
    ready() { const c = this.ensure(); if (!c) return false; if (c.state !== 'running') { try { c.resume(); } catch (e) { /* chờ thao tác của người dùng */ } return c.state === 'running'; } return true; },
    unlock() { this.ensure(); this.ready(); MU.resume(); },
    beep(f, d = .15, t = 'sine', at = 0, v = .09) {
      if (!this.on || !this.ready()) return;
      try { tone(f, this.ctx.currentTime + at, d, t, v); } catch (e) { /* bỏ qua */ }
    },
    start() { this.beep(523, .12); this.beep(784, .2, 'sine', .11); },                                   // có câu hỏi mới
    ok() { this.beep(660, .14); this.beep(880, .22, 'sine', .12); },                                      // đúng
    bad() { this.beep(190, .32, 'sawtooth', 0, .07); },                                                  // sai / không trả lời
    tick() { this.beep(1000, .05, 'square', 0, .035); },                                                 // 5 giây cuối
    win() { [523, 659, 784, 1046].forEach((f, i) => this.beep(f, .24, 'sine', i * .14)); },               // hạng cao / kết thúc vui
    end() { this.beep(440, .25, 'triangle'); this.beep(330, .35, 'triangle', .22); },                    // kết thúc
  };
  function tone(f, t0, d, type, v) {
    const c = SFX.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + .012); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + d + .03);
  }
  /* ---- nhạc nền: hợp âm C – Am – F – G, rải nốt nhẹ + bass, tiết tấu thay đổi được (nhanh dần ở 10 giây cuối) ---- */
  /* mỗi game một «chất giọng» nhạc nền (hợp âm, kiểu rải nốt, âm sắc, nhanh/chậm so với tempo truyền vào). Mặc định giữ nguyên bản cũ. */
  const THEMES = {
    default:     { ch: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]], arp: [0, 1, 2, 1, 2, 1, 2, 1], wave: 'triangle', bass: 'sine', scale: 1 },
    millionaire: { ch: [[45, 48, 52], [41, 45, 48], [40, 44, 47], [45, 48, 52]], arp: [0, 2, 1, 2, 0, 2, 1, 2], wave: 'sine', bass: 'triangle', scale: 0.78 },    // hồi hộp, chậm, hợp âm thứ
    golden_bell: { ch: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], arp: [0, 1, 2, 1, 0, 1, 2, 1], wave: 'triangle', bass: 'sine', scale: 1.1 },
    boss:        { ch: [[38, 41, 45], [34, 38, 41], [36, 40, 43], [33, 37, 40]], arp: [0, 0, 1, 2, 0, 0, 2, 1], wave: 'sawtooth', bass: 'triangle', scale: 1.2 },           // dồn dập
    olympia:     { ch: [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]], arp: [0, 2, 1, 2, 1, 2, 1, 2], wave: 'triangle', bass: 'sine', scale: 1.05 },
    treasure:    { ch: [[43, 47, 50], [40, 43, 47], [38, 42, 45], [43, 47, 50]], arp: [0, 1, 2, 1, 2, 1, 0, 1], wave: 'triangle', bass: 'sine', scale: 0.95 },
    racing:      { ch: [[48, 52, 55], [53, 57, 60], [43, 47, 50], [48, 52, 55]], arp: [0, 1, 2, 1, 0, 1, 2, 1], wave: 'square', bass: 'triangle', scale: 1.25 },
  };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const MU = {
    enabled: false, want: false, run: false, mute: false, bpm: 96, vol: 1, timer: null, step: 0, next: 0, th: THEMES.default,
    halt() { this.run = false; if (this.timer) { clearInterval(this.timer); this.timer = null; } },
    resume() { if (this.want && !this.run) this.start(); },
    start() {
      this.want = true;
      if (!SFX.on || !this.enabled || this.mute || !SFX.ready()) return;
      if (this.run) return; this.run = true; this.step = 0; this.next = 0; this.timer = setInterval(() => this.sched(), 110); this.sched();
    },
    sched() {
      const c = SFX.ctx; if (!c || !this.run) return; if (c.state !== 'running') return; if (this.next < c.currentTime) this.next = c.currentTime + .05;
      const th = this.th, sd = 60 / (this.bpm * th.scale) / 2;
      while (this.next < c.currentTime + .45) {
        const ch = th.ch[Math.floor(this.step / 8) % th.ch.length], s = this.step % 8;
        try {
          tone(hz(ch[th.arp[s]] + 12), this.next, sd * 1.7, th.wave, (th.wave === 'sawtooth' || th.wave === 'square' ? .014 : .028) * this.vol);
          if (s % 4 === 0) tone(hz(ch[0]), this.next, sd * 3.2, th.bass, .05 * this.vol);
        } catch (e) { this.halt(); return; }
        this.next += sd; this.step++;
      }
    },
  };
  try { MU.mute = localStorage.getItem('gtm_music_mute') === '1'; } catch (e) { /* không có localStorage */ }
  SFX.music = {
    enable(v) { MU.enabled = !!v; if (!MU.enabled) MU.halt(); else MU.resume(); },
    start(bpm) { if (bpm) MU.bpm = bpm; MU.start(); },
    stop() { MU.want = false; MU.halt(); },
    tempo(bpm) { MU.bpm = bpm; },
    volume(v) { MU.vol = v; },
    theme(id) { MU.th = THEMES[id] || THEMES.default; },                                                // chọn chất giọng theo mã game (không có → mặc định)
    toggleMute() { MU.mute = !MU.mute; try { localStorage.setItem('gtm_music_mute', MU.mute ? '1' : '0'); } catch (e) { /* bỏ qua */ } if (MU.mute) MU.halt(); else MU.resume(); return MU.mute; },
    muted() { return MU.mute; },
    playing() { return MU.run; },
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => SFX.unlock(), { passive: true }));
  window.SFX = SFX;
})();
