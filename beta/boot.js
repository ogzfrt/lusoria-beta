/* LUSORIA BETA — açılış. index.html <head>'inde, OYUN SCRİPTLERİNDEN VE tema
   satırından ÖNCE yüklenir (tools/build_beta.py enjekte eder).
   1) localStorage önek sarmalayıcısı: prototip (/okey) ile beta (/lusoria-beta)
      aynı origin'de (ogzfrt.github.io) → kayıtlar paylaşılırdı. Tüm anahtarlar
      'lusoria_beta:' önekiyle tutulur; oyun kodu bundan habersizdir.
   2) Kanca yolu: ui.js betaHook(ad, veri) → B.hook → B.on dinleyicileri. */
(function () {
  var B = window.LUSORIA_BETA = window.LUSORIA_BETA || {};
  var P = B.prefix = 'lusoria_beta:';
  var S = Storage.prototype;
  var g = S.getItem, s = S.setItem, r = S.removeItem, c = S.clear, k = S.key;
  function isLS(st) { try { return st === window.localStorage; } catch (e) { return false; } }
  var writeFns = [];
  function changed(key) { for (var i = 0; i < writeFns.length; i++) { try { writeFns[i](key); } catch (e) {} } }
  S.getItem = function (key) { return g.call(this, isLS(this) ? P + key : key); };
  S.setItem = function (key, v) {
    if (!isLS(this)) return s.call(this, key, v);
    var old = g.call(this, P + key);
    s.call(this, P + key, v);
    if (old !== String(v)) changed(key);
  };
  S.removeItem = function (key) {
    if (!isLS(this)) return r.call(this, key);
    var had = g.call(this, P + key) !== null;
    r.call(this, P + key);
    if (had) changed(key);
  };
  S.clear = function () {
    if (!isLS(this)) return c.call(this);
    for (var i = this.length - 1; i >= 0; i--) {
      var kk = k.call(this, i);
      if (kk && kk.indexOf(P) === 0) r.call(this, kk);
    }
  };
  B.raw = {
    get: function (key) { return g.call(window.localStorage, key); },
    set: function (key, v) { s.call(window.localStorage, key, v); },
    remove: function (key) { r.call(window.localStorage, key); },
  };
  B.onWrite = function (fn) { writeFns.push(fn); };
  var hooks = {};
  B.on = function (name, fn) { (hooks[name] = hooks[name] || []).push(fn); };
  B.hook = function (name, data) {
    var list = hooks[name] || [];
    for (var i = 0; i < list.length; i++) {
      try { list[i](data); }
      catch (e) { if (B.logError) B.logError('js', 'beta kancası ' + name + ': ' + e.message, e.stack); }
    }
  };
})();
