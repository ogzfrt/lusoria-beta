/* LUSORIA BETA — "Yenilikler" penceresi (kullanıcı 2026-10-16: güncellemeden sonra oyuna giren
   arkadaşlara neyin eklendiğini / düzeldiğini anlaşılır dille anlatan pop-up).
   Kural: oyuna bir güncelleme yayınlanınca NOTLAR'ın EN ÜSTÜNE yeni kayıt eklenir (id = tarih,
   aynı gün ikinci yayında '2026-10-16b'). Oyuncu kimliği olan biri oyunu açınca görmediği kayıtlar
   gösterilir; Tamam'a basınca görüldü sayılır. Yeni açılan hesap eski notları görmez. */
(function (B) {
  /* liste + pencere kök yenilikler.js'te (prototiple ortak); burada yalnız "görülmemişleri açılışta göster" */
  const SEEN = 'betaNewsSeen';
  const N = window.LUSORIA_NEWS;
  if (!N) return;
  const NOTLAR = N.NOTLAR;
  B.newsLatest = N.latest;
  const show = (list) => N.show(list, { onOk: () => localStorage.setItem(SEEN, B.newsLatest) });

  /* görülmemiş kayıtlar (en yeniden eskiye); hiç görmemişse yalnız en yenisi */
  B.newsUnseen = () => {
    const seen = localStorage.getItem(SEEN);
    if (!seen) return NOTLAR.slice(0, 1);
    const i = NOTLAR.findIndex((n) => n.id === seen);
    return i < 0 ? NOTLAR.slice(0, 1) : NOTLAR.slice(0, i);
  };
  B.showNews = (all) => (all ? N.showAll() : show(B.newsUnseen().length ? B.newsUnseen() : NOTLAR.slice(0, 1)));

  /* yeni açılan hesap eski notları görmez */
  B.on('loggedIn', () => localStorage.setItem(SEEN, B.newsLatest));
  if (B.nick && B.nick() && B.newsUnseen().length) setTimeout(() => {
    if (!document.getElementById('betaNewsOv') && !document.getElementById('betaNickOv')) show(B.newsUnseen());
  }, 700);
})(window.LUSORIA_BETA);
