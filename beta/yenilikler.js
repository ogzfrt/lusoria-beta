/* LUSORIA BETA — "Yenilikler" penceresi (kullanıcı 2026-10-16: güncellemeden sonra oyuna giren
   arkadaşlara neyin eklendiğini / düzeldiğini anlaşılır dille anlatan pop-up).
   Kural: oyuna bir güncelleme yayınlanınca NOTLAR'ın EN ÜSTÜNE yeni kayıt eklenir (id = tarih,
   aynı gün ikinci yayında '2026-10-16b'). Oyuncu kimliği olan biri oyunu açınca görmediği kayıtlar
   gösterilir; Tamam'a basınca görüldü sayılır. Yeni açılan hesap eski notları görmez. */
(function (B) {
  const SEEN = 'betaNewsSeen';
  const TAGS = {
    yeni: { tr: 'YENİ', en: 'NEW' },
    degisti: { tr: 'DEĞİŞTİ', en: 'CHANGED' },
    duzeldi: { tr: 'DÜZELTİLDİ', en: 'FIXED' },
  };
  const UI = {
    tr: { title: 'YENİLİKLER', sub: (d) => `${d} güncellemesi`, ok: 'Tamam, oynayalım!' },
    en: { title: "WHAT'S NEW", sub: (d) => `${d} update`, ok: "OK, let's play!" },
  };
  /* her madde: [etiket, TR başlık, TR açıklama, EN başlık, EN açıklama] */
  const NOTLAR = [
    {
      id: '2026-10-16', date: { tr: '16 Ekim', en: 'October 16' },
      items: [
        ['yeni', 'Seed', "Her run'ın bir kodu var. Game Over ekranında kopyala, Yeni Run'da yaz: aynı run'ı yeniden oynarsın. (Seed girilen run istatistiğe sayılmaz.)",
          'Seeds', 'Every run has a code. Copy it on the Game Over screen and type it in New Run to replay the same run. (Seeded runs don\'t count toward stats.)'],
        ['yeni', 'Puanlama sahnesi', 'Açılımı onaylayınca jokerlerin tek tek devreye girdiğini, çarpanın adım adım büyüdüğünü görürsün. Hızı Ayarlar › Oyun\'da; tıklayınca atlanır.',
          'Scoring scene', 'After you confirm, watch your jokers kick in one by one and the multiplier grow. Speed is in Settings › Game; click to skip.'],
        ['yeni', 'Jokerleri sürükle', 'Jokeri sürükleyip ana raftan backup\'a (ya da tersine) bırakabilirsin. Backup doluysa ikisi yer değiştirir.',
          'Drag jokers', 'Drag a joker between your main slots and backup. If backup is full, the two swap places.'],
        ['yeni', 'Sesler ve müzik', 'Düğmelere, satışa, yenilemeye ve değneklere ses geldi. Kozmik Run artık kendi müziğini çalıyor.',
          'Sounds and music', 'Buttons, selling, rerolls and wands now have sounds. Cosmic Run has its own music.'],
        ['yeni', 'Yeni öğretici', 'Aynı turda birden fazla grup açmayı, taş atmayı, işlemeyi ve Çift\'i adım adım gösteriyor.',
          'New tutorial', 'It now walks you through opening several groups in one turn, discarding, adding to the table and Pairs.'],
        ['degisti', 'Hedef puanlar', 'Raund hedefleri yeniden dengelendi: ilk raundlar artık kolay geçit değil, zorluk düzenli artıyor.',
          'Target scores', 'Round targets were rebalanced: early rounds are no longer a free pass, difficulty rises steadily.'],
        ['degisti', 'Satranç Saati', 'Saat ekranın üst ortasında. Onayladığında kalan her saniye +0.15x verir; raundda bir kez DURDUR\'a basıp o turun bonusunu sabitleyebilirsin.',
          'Chess Clock', 'The clock sits at the top center. Each second left when you confirm gives +0.15x; once a round, press STOP to lock that turn\'s bonus.'],
        ['degisti', 'Hayalet', 'Raundu kaybedersen ekstra tur kendiliğinden başlar, sormaz.',
          'Ghost', 'If you lose the round, the extra turn starts on its own.'],
        ['degisti', 'Ay Taşı ve boss kuralı', 'Ay Taşı Öteki Dünya olmadan da +3x verir. Boss kuralı artık boss adının hemen altında yazıyor.',
          'Moon Tile and boss rule', 'Moon Tiles give +3x even without Other World. The boss rule is now shown right under the boss name.'],
        ['duzeldi', 'Joker hataları', 'Kağıt değeri değişmiş taşlarda da çalışıyor; Avukat yanlış jokeri savunmuyor; paketler raftaki jokeri tekrar vermiyor.',
          'Joker bugs', 'Paper works on tiles with changed values; Lawyer no longer defends the wrong joker; packs no longer repeat a joker already on the shelf.'],
        ['duzeldi', 'Ekran düzeni', 'Değnek, backup, Ay Kuyusu ve Orion panelleri artık üst üste binmiyor; indirim etiketi okunuyor.',
          'Layout', 'Wand, backup, Moon Well and Orion panels no longer overlap; discount tags are readable.'],
      ],
    },
  ];
  B.newsLatest = NOTLAR[0].id;

  function show(list) {
    const L = B.lang();
    const u = UI[L];
    const ov = document.createElement('div');
    ov.id = 'betaNewsOv';
    ov.className = 'pk-ov beta-ov';
    let body = '';
    for (const n of list) {
      if (list.length > 1) body += `<div class="bn-date">${n.date[L]}</div>`;
      for (const tag of ['yeni', 'degisti', 'duzeldi']) {
        const rows = n.items.filter((it) => it[0] === tag);
        if (!rows.length) continue;
        body += `<div class="bn-sec bn-${tag}"><div class="bn-tag">${TAGS[tag][L]}</div>`;
        for (const it of rows) {
          const [h, d] = L === 'en' ? [it[3], it[4]] : [it[1], it[2]];
          body += `<div class="bn-item"><b class="bn-h">${esc(h)}</b><span class="bn-d">${esc(d)}</span></div>`;
        }
        body += '</div>';
      }
    }
    ov.innerHTML = `<div class="pk-box beta-box bn-box"><div class="pk-title">${u.title}</div>` +
      `<div class="pk-sub-title">${u.sub(list[0].date[L])}</div>` +
      `<div class="bn-body">${body}</div>` +
      `<div class="pk-foot"><button id="betaNewsOk" class="ep-btn ep-blue"></button></div></div>`;
    ov.querySelector('#betaNewsOk').textContent = u.ok;
    ov.querySelector('#betaNewsOk').addEventListener('click', () => { localStorage.setItem(SEEN, B.newsLatest); ov.remove(); });
    document.body.appendChild(ov);
    return ov;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* görülmemiş kayıtlar (en yeniden eskiye); hiç görmemişse yalnız en yenisi */
  B.newsUnseen = () => {
    const seen = localStorage.getItem(SEEN);
    if (!seen) return NOTLAR.slice(0, 1);
    const i = NOTLAR.findIndex((n) => n.id === seen);
    return i < 0 ? NOTLAR.slice(0, 1) : NOTLAR.slice(0, i);
  };
  B.showNews = (all) => show(all ? NOTLAR : (B.newsUnseen().length ? B.newsUnseen() : NOTLAR.slice(0, 1)));

  /* yeni açılan hesap eski notları görmez */
  B.on('loggedIn', () => localStorage.setItem(SEEN, B.newsLatest));
  if (B.nick && B.nick() && B.newsUnseen().length) setTimeout(() => {
    if (!document.getElementById('betaNewsOv') && !document.getElementById('betaNickOv')) show(B.newsUnseen());
  }, 700);
})(window.LUSORIA_BETA);
