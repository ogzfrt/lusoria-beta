/* LUSORIA BETA — günlük. Firestore yazma bütçesi için:
   · oturum olayları bellekte birikir; raund sonu / run sonu / sayfa gizlenince
     paket olarak gider (en sık 10 sn'de bir);
   · hatalar anında gider, oturum başına en çok 20, aynı mesaj bir kez;
   · gönderilemeyen her şey 'betaQueue'ya (en çok 50) yazılır, bağlantı gelince gider. */
(function (B) {
  const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  let part = 0, buf = [], lastFlush = 0, errCount = 0, flushTimer = null;
  const seenErr = new Set();
  const base = () => ({ nick: B.nick ? B.nick() : null, version: B.version, build: B.build, at: Date.now() });
  const device = () => ({ ua: navigator.userAgent, w: innerWidth, h: innerHeight, dpr: devicePixelRatio, lang: navigator.language, gameLang: B.lang() });
  const screenNow = () => {
    const so = document.getElementById('storeOverlay');   // P109 — store oyun ekranının üstünde, ayrı sayılır
    if (so && !so.classList.contains('hidden')) return 'store';
    for (const id of ['gameScreen', 'mapScreen', 'menuScreen']) {
      const e = document.getElementById(id);
      if (e && !e.classList.contains('hidden')) return id;
    }
    return '?';
  };
  B.snapshot = () => { const s = localStorage.getItem('okeySave'); return s ? s.slice(0, 300000) : null; };

  /* --- çevrimdışı kuyruk --- */
  const Q = 'betaQueue';
  const readQ = () => { try { return JSON.parse(localStorage.getItem(Q) || '[]'); } catch (e) { return []; } };
  const writeQ = (q) => { try { localStorage.setItem(Q, JSON.stringify(q.slice(-50))); } catch (e) {} };
  B.sendDoc = (col, doc) => B.backend.add(col, doc).then(() => 'sent', () => {
    const q = readQ(); q.push({ col, doc }); writeQ(q); return 'queued';
  });
  function drainQ() {
    const q = readQ();
    if (!q.length) return Promise.resolve();
    writeQ([]);
    return q.reduce((p, it) => p.then(() => B.sendDoc(it.col, it.doc)), Promise.resolve());
  }

  /* --- oturum paketleri --- */
  B.event = (type, data) => { buf.push(Object.assign({ t: Date.now(), type, screen: screenNow() }, data || {})); };
  B.flush = () => {
    clearTimeout(flushTimer); flushTimer = null;
    lastFlush = Date.now();
    const p = drainQ();
    if (!buf.length || !(B.nick && B.nick())) return p;   // ad seçilmeden oturum yazılmaz
    const doc = Object.assign(base(), { sessionId, part, events: buf });
    if (part === 0) doc.device = device();
    part++; buf = [];
    if (B._markSent) B._markSent();   // denetim LG-04 — tampondaki raundlar artık pakette (ya da kuyrukta)
    return p.then(() => B.sendDoc('sessions', doc));
  };
  const softFlush = () => {
    if (flushTimer) return;
    flushTimer = setTimeout(B.flush, Math.max(0, lastFlush + 10000 - Date.now()));
  };

  B.logError = (kind, message, stack, extra) => {
    const sig = kind + '|' + message;
    if (seenErr.has(sig) || errCount >= 20) return;
    seenErr.add(sig); errCount++;
    /* denetim LG-11 — hata hangi oturumdan/cihazdan: sessionId oturum paketleriyle eşler,
       dev kısa cihaz özeti (telefon mu masaüstü mü belli olsun) */
    B.sendDoc('errors', Object.assign(base(), { kind, message: String(message).slice(0, 2000),
      stack: String(stack || '').slice(0, 4000), screen: screenNow(), save: B.snapshot(), sessionId,
      dev: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio, touch: navigator.maxTouchPoints || 0 } }, extra || {}));
  };

  /* --- oyun hataları --- */
  window.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t !== window && t.tagName) {
      if (t.tagName === 'IMG' || t.tagName === 'AUDIO') B.logError('ui', 'Yüklenemeyen dosya: ' + (t.currentSrc || t.src), '');
      return;
    }
    B.logError('js', e.message, e.error && e.error.stack);
  }, true);
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    const msg = 'Promise: ' + ((r && r.message) || r);
    /* tarayıcının ses cihazını açamaması oyun hatası değil (sessiz/çıkışsız cihaz) → ayrı tür */
    B.logError(/audio device|AudioContext|play\(\) request|NotAllowedError/i.test(msg) ? 'device' : 'js', msg, r && r.stack);
  });
  const warn = console.warn;
  console.warn = function (...a) {
    if (typeof a[0] === 'string' && a[0].indexOf('⚠ Bütünlük denetimi') === 0) B.logError('integrity', a[0], '');
    return warn.apply(this, a);
  };

  /* --- arayüz: ekrandan taşan pencere --- */
  const OV = /\b(pk-ov|ep-ov|set-ov|rp-ov)\b/;
  new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType !== 1 || !OV.test(n.className)) continue;
      setTimeout(() => {
        if (!document.body.contains(n)) return;
        const box = n.firstElementChild;
        if (!box) return;
        const r = box.getBoundingClientRect();
        if (r.width && (r.left < -4 || r.top < -4 || r.right > innerWidth + 4 || r.bottom > innerHeight + 4))
          B.logError('ui', 'Pencere ekrandan taşıyor: ' + n.className, '',
            { rect: [r.left, r.top, r.width, r.height].map(Math.round), vw: innerWidth, vh: innerHeight });
      }, 500);
    }
  }).observe(document.body, { childList: true });

  /* --- kafa karışıklığı: art arda BOŞA tıklama, hareketsizlik ---
     Yalnız İŞE YARAMAYAN tıklama sayılır: düğme devre dışıysa ya da tıklamadan sonraki
     400 ms'de ekranda hiçbir şey değişmediyse. (İlk sürüm hızlı basışı yeterli sayıyordu;
     2026-10-15 canlı logda sekmeler/tema okları/mod okları arasında gezinmek 5 yanlış alarm
     üretti.) Değişim ölçüsü: düğüm ekleme/silme, metin, class/disabled/hidden — style hariç
     (öğretici her karede style yazar, her tıklamayı "etkili" gösterirdi). */
  let lastInput = Date.now(), idleSaid = false, domChanges = 0;
  /* classList.add('hidden') zaten gizli öğede de kayıt üretir (ui.js her tıklamada açılır
     menüleri böyle kapatıyor) → yalnız değeri GERÇEKTEN değişenler sayılır */
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'attributes' ? m.oldValue !== m.target.getAttribute(m.attributeName)
        : m.type === 'characterData' ? m.oldValue !== m.target.data : true) { domChanges++; return; }
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, characterDataOldValue: true,
    attributes: true, attributeOldValue: true, attributeFilter: ['class', 'disabled', 'hidden'] });
  const dead = [];
  const rageSaid = new Map();
  document.addEventListener('pointerdown', (e) => {
    lastInput = Date.now(); idleSaid = false;
    const el = document.elementFromPoint(e.clientX, e.clientY) || e.target;
    const b = el && el.closest && el.closest('button, .mp-card, .col-cat, .set-tab');
    if (!b) return;
    const sig = b.id ? '#' + b.id : (b.tagName.toLowerCase() + '.' + [...b.classList].slice(0, 2).join('.'));
    const disabled = !!b.disabled, mark = domChanges, at = Date.now();
    setTimeout(() => {
      if (!disabled && domChanges !== mark) return;            // tıklama bir şey değiştirdi → boşa değil
      dead.push({ sig, at });
      while (dead.length && at - dead[0].at > 1500) dead.shift();
      if (dead.filter((c) => c.sig === sig).length >= 3 && (!rageSaid.has(sig) || at - rageSaid.get(sig) > 10000)) {
        rageSaid.set(sig, at);
        B.event('rageClick', { target: sig, disabled });
      }
    }, 400);
  }, true);
  document.addEventListener('keydown', () => { lastInput = Date.now(); idleSaid = false; }, true);
  setInterval(() => {
    const scr = screenNow();
    if (document.visibilityState !== 'visible' || idleSaid || (scr !== 'gameScreen' && scr !== 'mapScreen')) return;
    if (Date.now() - lastInput > 60000) { idleSaid = true; B.event('idle', { sec: Math.round((Date.now() - lastInput) / 1000) }); }
  }, 10000);

  /* --- run akışı (Game.runLog) --- */
  let sentRun = null, sentRounds = 0;
  /* denetim LG-04 — sayfa her açıldığında devam eden run'ın TÜM raundları yeniden gidiyordu
     (sentRun bellekte sıfırlanıyordu; canlı logda raund olaylarının %33'ü kopyaydı). Gönderilen
     raund sayısı run başlangıcıyla birlikte saklanır; işaret PAKET gönderilince (B.flush) yazılır,
     böylece sayfa kapanıp tamponda kalan raund kaybolursa sonraki açılışta yine gider. İşareti
     olmayan (eski derlemeden kalma) run'da bitmiş raundlar zaten gönderilmiş sayılır. */
  const SENT = 'betaSentRounds';
  const readSent = () => { try { return JSON.parse(localStorage.getItem(SENT) || 'null'); } catch (e) { return null; } };
  B._markSent = () => {
    if (sentRun == null) return;
    try { localStorage.setItem(SENT, JSON.stringify({ start: sentRun, n: sentRounds })); } catch (e) {}
  };
  /* Raund kaydı raund BAŞINDA açılır (won: null), sonucu raund sonunda yazılır. Eskiden kayıt
     açıldığı an gönderiliyordu → loglarda puan/hedef/sonuç hep boştu. Artık yalnız BİTMİŞ raund
     gönderilir; run bitince (final) yarım kalan son raund da gider. */
  function collectRounds(final) {
    try {
      const L = typeof Game !== 'undefined' && Game.runLog && Game.runLog();
      if (!L || !Array.isArray(L.rounds)) return;
      if (L.start !== sentRun) {
        const m = readSent();
        sentRun = L.start;
        sentRounds = m && m.start === L.start
          ? Math.min(m.n, L.rounds.length)
          : L.rounds.filter((r) => r.won != null).length;   // işaretsiz: sayfa açılmadan bitenler gönderilmiş
      }
      for (; sentRounds < L.rounds.length; sentRounds++) {
        const r = L.rounds[sentRounds];
        if (r.won == null && !final) break;
        B.event('round', { r: JSON.parse(JSON.stringify(r)) });
      }
    } catch (e) {}
  }
  /* denetim LG-11 — run sonu / bırakma NEREDE oldu: stage, raund, puan, hedef, mod, seed'li mi.
     runEnd anında Game.state hâlâ o run; bırakmada eski run yalnız kayıtta (okeySave). */
  const runWhere = (s) => {
    if (!s) return {};
    const o = { st: s.stage, r: s.roundInStage, sc: s.score, tgt: s.target, mode: s.runMode || 'base' };
    if (s.seeded) o.seeded = true;
    try { if (Game.isBossRound && Game.state === s && Game.isBossRound() && s.boss) o.boss = s.boss.key; } catch (e) {}
    return o;
  };
  const savedRun = () => {
    try { const sv = JSON.parse(localStorage.getItem('okeySave') || 'null'); return sv ? Object.assign(runWhere(JSON.parse(sv.data)), { where: sv.where }) : {}; }
    catch (e) { return {}; }
  };
  /* denetim LG-11 — mağaza teklifleri: hangi jokerler GÖRÜLDÜ (alınanlar raund kaydının
     add listesinde). Mağaza açılışında bir kez; yenileme (reroll) kayıt almadığı için görünmez. */
  let lastStore = null;
  const logStore = () => {
    try {
      const s = Game.state, st = s && s.store;
      if (!st || st === lastStore) return;
      lastStore = st;
      B.event('store', { st: s.stage, r: s.roundInStage, coins: s.coins,
        offer: (st.items || []).map((it) => it.key),
        consum: st.consumable ? (st.consumable.key || null) : null,
        tile: st.specialTile ? (st.specialTile.key || null) : null });
    } catch (e) {}
  };
  B.on('saved', (d) => { if (d && d.where === 'inStore') logStore(); collectRounds(); softFlush(); });
  B.on('runEnd', (d) => {
    collectRounds(true);
    B.event('runEnd', Object.assign({}, d, runWhere(typeof Game !== 'undefined' && Game.state)));
    B.flush();
  });
  B.on('runAbandoned', (d) => B.event('runAbandoned', Object.assign({}, d, savedRun())));
  B.on('tutorialEnd', (d) => { B.event('tutorialEnd', d); softFlush(); });
  B.on('modesOpened', (d) => B.event('modesOpened', d));
  B.on('saveIncompatible', (d) => B.logError('save', 'Uyumsuz save: ' + d.message, d.stack));
  B.on('loggedIn', () => B.flush());

  window.addEventListener('online', () => B.flush());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') B.flush(); });
  B.event('session', {});
  setTimeout(B.flush, 3000);
})(window.LUSORIA_BETA);
