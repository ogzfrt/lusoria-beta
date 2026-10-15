/* LUSORIA BETA — arayüz: kademeli menü, sürüm etiketi, bilgi penceresi. */
(function (B) {
  /* GitHub Pages yeni sürümü yayarken bir beta dosyası anlık 503 verebiliyor (2026-10-15
     canlı denemede hesap.js yüklenmedi → nickname penceresi hiç çıkmadı). Hesap modülü
     yoksa sayfa BİR kez yenilenir; yine yoksa hata loglanır. */
  if (typeof B.nick !== 'function') {
    if (!sessionStorage.getItem('betaModRetry')) { sessionStorage.setItem('betaModRetry', '1'); location.reload(); return; }
    if (B.logError) B.logError('js', 'Beta hesap modülü yüklenemedi (hesap.js)', '');
  } else {
    sessionStorage.removeItem('betaModRetry');
  }
  /* öğretici bitmeden menüde yalnız Oyna + Ayarlar (beta.css: html.beta-pretut) */
  B.refreshMenu = () => {
    document.documentElement.classList.toggle('beta-pretut', !localStorage.getItem('okeyTutDone'));
  };
  /* tek düğmeli bilgi penceresi — pk-ov kalıbı */
  B.notice = (text) => {
    const ov = document.createElement('div');
    ov.className = 'pk-ov beta-ov';
    ov.innerHTML = `<div class="pk-box beta-box"><div class="pk-sub-title beta-msg"></div>` +
      `<div class="pk-foot"><button class="ep-btn ep-blue beta-ok"></button></div></div>`;
    ov.querySelector('.beta-msg').textContent = text;
    ov.querySelector('.beta-ok').textContent = B.t('ok');
    ov.querySelector('.beta-ok').addEventListener('click', () => ov.remove());
    document.body.appendChild(ov);
    return ov;
  };
  const ver = document.createElement('div');
  ver.id = 'betaVer';
  ver.textContent = `v${B.version} · ${B.build}`;
  document.getElementById('menuScreen').appendChild(ver);
  B.on('tutorialEnd', B.refreshMenu);
  B.on('loggedIn', B.refreshMenu);
  B.on('saveIncompatible', () => setTimeout(() => B.notice(B.t('saveBroken')), 400));
  B.refreshMenu();

  /* Geri Bildirim — duraklatma menülerinde (harita + oyun ekranı) */
  function showFeedback() {
    document.getElementById('betaFbOv')?.remove();
    const ov = document.createElement('div');
    ov.id = 'betaFbOv';
    ov.className = 'pk-ov beta-ov';
    ov.innerHTML = `<div class="pk-box beta-box"><div class="pk-title"></div><div class="pk-sub-title"></div>` +
      `<textarea id="betaFbTa" class="beta-ta" maxlength="4000"></textarea>` +
      `<div class="pk-foot beta-two"><button id="betaFbCancel" class="ep-btn ep-ghost"></button><button id="betaFbSend" class="ep-btn ep-blue"></button></div></div>`;
    ov.querySelector('.pk-title').textContent = B.t('fbTitle');
    ov.querySelector('.pk-sub-title').textContent = B.t('fbSub');
    ov.querySelector('#betaFbTa').placeholder = B.t('fbPh');
    ov.querySelector('#betaFbCancel').textContent = B.t('fbCancel');
    ov.querySelector('#betaFbSend').textContent = B.t('fbSend');
    const screen = ['gameScreen', 'mapScreen', 'menuScreen'].find((id) => !document.getElementById(id)?.classList.contains('hidden')) || '?';
    ov.querySelector('#betaFbCancel').addEventListener('click', () => ov.remove());
    ov.querySelector('#betaFbSend').addEventListener('click', () => {
      const text = ov.querySelector('#betaFbTa').value.trim();
      if (!text) return;
      ov.remove();
      B.sendDoc('feedback', { nick: B.nick(), version: B.version, build: B.build, at: Date.now(), text, screen, save: B.snapshot() })
        .then((r) => B.notice(B.t(r === 'sent' ? 'fbThanks' : 'fbQueued')));
    });
    document.body.appendChild(ov);
    setTimeout(() => ov.querySelector('#betaFbTa').focus(), 50);
  }
  for (const popId of ['menuPop', 'mapMenuPop']) {
    const pop = document.getElementById(popId);
    if (!pop) continue;
    const b = document.createElement('button');
    b.className = 'btn ghost beta-fb-btn';
    b.textContent = B.t('fbBtn');
    b.addEventListener('click', (e) => { e.stopPropagation(); pop.classList.add('hidden'); showFeedback(); });
    pop.appendChild(b);
    /* dil değişince metin yenilensin: menü her açıldığında güncellenir */
    new MutationObserver(() => { b.textContent = B.t('fbBtn'); }).observe(pop, { attributes: true, attributeFilter: ['class'] });
  }
})(window.LUSORIA_BETA);
