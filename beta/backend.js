/* LUSORIA BETA — arka uç. Üç uygulama, aynı arayüz:
   · fake     — testler (window.__betaFake Node'a bağlı, Playwright exposeFunction)
   · firebase — gerçek: Firestore + anonim oturum
   · offline  — firebase-config boş ya da SDK yüklenemedi: her çağrı reddedilir,
                oyun cihazdaki kayıtla çalışır, loglar kuyrukta bekler. */
(function (B) {
  const fail = () => Promise.reject(new Error('offline'));
  function fake() {
    const call = (...a) => Promise.resolve().then(() => window.__betaFake(...a));
    return { kind: 'fake', ready: () => Promise.resolve(),
      getPlayer: (k) => call('getPlayer', k), createPlayer: (k, d) => call('createPlayer', k, d),
      setPlayer: (k, d) => call('setPlayer', k, d), add: (c, d) => call('add', c, d) };
  }
  function firebaseBackend(cfg) {
    firebase.initializeApp(cfg);
    const db = firebase.firestore();
    const ready = firebase.auth().signInAnonymously().then(() => {});
    const P = (k) => db.collection('players').doc(k);
    return { kind: 'firebase', ready: () => ready,
      getPlayer: (k) => ready.then(() => P(k).get()).then((d) => (d.exists ? d.data() : null)),
      createPlayer: (k, doc) => ready.then(() => db.runTransaction(async (tx) => {
        const d = await tx.get(P(k));
        if (d.exists) return false;
        tx.set(P(k), doc);
        return true;
      })),
      setPlayer: (k, doc) => ready.then(() => P(k).set(doc)).then(() => true),
      add: (c, doc) => ready.then(() => db.collection(c).add(doc)).then(() => true) };
  }
  function offline() {
    return { kind: 'offline', ready: fail, getPlayer: fail, createPlayer: fail, setPlayer: fail, add: fail };
  }
  let be;
  try {
    if (typeof window.__betaFake === 'function') be = fake();
    else if (window.firebase && B.firebaseConfig && B.firebaseConfig.apiKey) be = firebaseBackend(B.firebaseConfig);
    else be = offline();
  } catch (e) { be = offline(); }
  B.backend = be;
})(window.LUSORIA_BETA);
