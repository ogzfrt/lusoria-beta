/* LUSORIA BETA — hesap: nickname penceresi + bulut eşitleme.
   Eşitlenen = İLERLEME anahtarları (cihaz ayarları — dil, tema, ses — cihazda kalır).
   Kural: bulut ile cihaz karşılaştırılır, updatedAt'i YENİ olan kazanır. */
(function (B) {
  const SYNC_KEYS = ['okeySave', 'okeyDiscovered', 'okeyOwnedEver', 'okeyHintsSeen', 'okeyModes', 'okeyFinals', 'okeyStats', 'okeyTutDone'];
  const NICK_RE = /^[\p{L}\p{N}_]{3,16}$/u;
  /* anahtar: büyük/küçük harf duyarsız; I/ı/İ/i AYNI sayılır ("ALI" = "Ali" = "Alı") —
     Türkçe küçültme "ALI"yı "alı", İngilizce küçültme "ali" yapıyordu */
  B.nickKey = (n) => n.trim().replace(/[İIı]/g, 'i').toLowerCase();
  B.nick = () => localStorage.getItem('betaNick');
  const localAt = () => Number(localStorage.getItem('betaUpdatedAt') || 0);
  const meta = () => { const o = {}; for (const k of SYNC_KEYS) o[k] = localStorage.getItem(k); return o; };
  let applying = false;
  function apply(m) {
    applying = true;
    try {
      for (const k of SYNC_KEYS) {
        const v = m ? m[k] : null;
        if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v);
      }
    } finally { applying = false; }
  }
  const doc = () => ({ nick: B.nick(), updatedAt: localAt(), version: B.version, build: B.build, meta: meta() });

  /* yazma bütçesi: değişiklikten 4 sn sonra, en sık 10 sn'de bir */
  let timer = null, lastPush = 0, createdAt = null;
  B.pushNow = () => {
    clearTimeout(timer); timer = null;
    if (!B.nick()) return Promise.resolve();
    lastPush = Date.now();
    const d = doc();
    d.createdAt = createdAt || d.updatedAt;
    return B.backend.setPlayer(B.nickKey(d.nick), d).catch(() => {});
  };
  function schedule() {
    if (timer || !B.nick()) return;
    timer = setTimeout(B.pushNow, Math.max(4000, lastPush + 10000 - Date.now()));
  }
  B.onWrite((key) => {
    if (applying || SYNC_KEYS.indexOf(key) < 0) return;
    localStorage.setItem('betaUpdatedAt', String(Date.now()));
    schedule();
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && timer) B.pushNow(); });

  /* açılışta: bulut daha yeniyse uygula + bir kez yeniden yükle */
  function syncOnStart() {
    B.backend.getPlayer(B.nickKey(B.nick())).then((d) => {
      if (d && d.createdAt) createdAt = d.createdAt;
      if (d && d.updatedAt > localAt() + 1000 && !sessionStorage.getItem('betaReloaded')) {
        apply(d.meta);
        localStorage.setItem('betaUpdatedAt', String(d.updatedAt));
        sessionStorage.setItem('betaReloaded', '1');
        location.reload();
      } else if (!d || d.updatedAt < localAt()) {
        B.pushNow();
      }
    }).catch(() => {});
  }

  function showNickWindow() {
    const ov = document.createElement('div');
    ov.id = 'betaNickOv';
    ov.className = 'pk-ov beta-ov beta-nick';
    let login = false;
    const err = (m) => { ov.querySelector('#betaNickErr').textContent = m; };
    function go() {
      const btn = ov.querySelector('#betaNickGo');
      const nick = ov.querySelector('#betaNickIn').value.trim();
      if (!NICK_RE.test(nick)) { err(B.t('nickRule')); return; }
      const key = B.nickKey(nick);
      btn.disabled = true; err(B.t('nickWait'));
      const done = () => { btn.disabled = false; };
      if (login) {
        B.backend.getPlayer(key).then((d) => {
          if (!d) { done(); err(B.t('nickNotFound')); return; }
          apply(d.meta);
          localStorage.setItem('betaNick', d.nick);
          localStorage.setItem('betaUpdatedAt', String(d.updatedAt || Date.now()));
          sessionStorage.setItem('betaReloaded', '1');
          location.reload();
        }).catch(() => { done(); err(B.t('nickOffline')); });
      } else {
        const now = Date.now();
        B.backend.createPlayer(key, { nick, createdAt: now, updatedAt: now, version: B.version, build: B.build, meta: meta() }).then((made) => {
          done();
          if (!made) { err(B.t('nickTaken')); return; }
          createdAt = now;
          localStorage.setItem('betaUpdatedAt', String(now));
          localStorage.setItem('betaNick', nick);
          ov.remove();
          B.hook('loggedIn', { nick });
        }).catch(() => { done(); err(B.t('nickOffline')); });
      }
    }
    const draw = () => {
      ov.innerHTML =
        `<div class="pk-box beta-box"><div class="pk-title"></div><div class="pk-sub-title"></div>` +
        `<input id="betaNickIn" class="beta-in" maxlength="16" autocomplete="off" spellcheck="false">` +
        `<div id="betaNickErr" class="beta-err"></div>` +
        `<div class="pk-foot"><button id="betaNickGo" class="ep-btn ep-blue"></button></div>` +
        `<button id="betaNickLoginLink" class="beta-link"></button>` +
        `<div class="beta-notice"></div></div>`;
      ov.querySelector('.pk-title').textContent = login ? B.t('nickLoginTitle') : B.t('nickTitle');
      ov.querySelector('.pk-sub-title').textContent = login ? B.t('nickLoginSub') : B.t('nickSub');
      ov.querySelector('#betaNickGo').textContent = login ? B.t('nickLoginBtn') : B.t('nickStart');
      ov.querySelector('#betaNickLoginLink').textContent = login ? B.t('nickBackNew') : B.t('nickHaveAcc');
      ov.querySelector('.beta-notice').textContent = B.t('nickNotice');
      const inp = ov.querySelector('#betaNickIn');
      inp.placeholder = B.t('nickPh');
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      ov.querySelector('#betaNickGo').addEventListener('click', go);
      ov.querySelector('#betaNickLoginLink').addEventListener('click', () => { login = !login; draw(); });
      setTimeout(() => inp.focus(), 50);
    };
    draw();
    document.body.appendChild(ov);
  }

  if (B.nick()) syncOnStart(); else showNickWindow();
})(window.LUSORIA_BETA);
