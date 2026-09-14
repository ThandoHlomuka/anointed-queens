/* ============================================================
   ANNOINTED QUEENS - browser compatibility shim (ES5)
   Loads first on every page. Fills small API gaps on older
   Safari / Android WebView / legacy engines so the store works
   everywhere without modern-syntax rewrites.
   ============================================================ */
(function () {
  'use strict';
  function has(o) { return typeof o !== 'undefined'; }
  var ap = has(Array) && Array.prototype;
  var sp = has(String) && String.prototype;

  if (has(Object) && !Object.assign) {
    Object.assign = function (target) {
      if (target == null) throw new TypeError('Cannot convert undefined or null to object');
      var to = Object(target), i, s, k;
      for (i = 1; i < arguments.length; i++) {
        s = arguments[i];
        if (s == null) continue;
        for (k in s) if (Object.prototype.hasOwnProperty.call(s, k)) to[k] = s[k];
      }
      return to;
    };
  }
  if (ap && !ap.find) {
    ap.find = function (fn) {
      var i = 0, n = this.length;
      for (; i < n; i++) { if (fn(this[i], i, this)) return this[i]; }
      return undefined;
    };
  }
  if (ap && !ap.includes) {
    ap.includes = function (x, from) {
      return this.indexOf(x, from) !== -1;
    };
  }
  if (has(Array) && !Array.from) {
    Array.from = (function () {
      var toStr = Object.prototype.toString;
      return function (o, map, ctx) {
        var arr = toStr.call(o) === '[object String]' ? o.split('') : [].slice.call(o);
        if (map) { var i = 0, n = arr.length, out = []; for (; i < n; i++) out.push(map.call(ctx, arr[i], i)); return out; }
        return arr;
      };
    })();
  }
  if (sp && !sp.startsWith) { sp.startsWith = function (s) { return this.slice(0, s.length) === s; }; }
  if (sp && !sp.endsWith) { sp.endsWith = function (s) { return this.slice(-s.length) === s; }; }
  if (sp && !sp.includes) { sp.includes = function (s) { return this.indexOf(s) !== -1; }; }
  if (sp && !sp.repeat) {
    sp.repeat = function (n) {
      var r = '', i = 0;
      n = Math.max(0, Math.floor(n) || 0);
      for (; i < n; i++) r += this;
      return r;
    };
  }
  if (has(Element) && Element.prototype && !Element.prototype.closest) {
    Element.prototype.closest = function (sel) {
      var el = this;
      while (el && el.nodeType === 1) {
        var match = false;
        if (el.matches) match = el.matches(sel);
        else if (el.msMatchesSelector) match = el.msMatchesSelector(sel);
        else if (el.webkitMatchesSelector) match = el.webkitMatchesSelector(sel);
        if (match) return el;
        el = el.parentElement || el.parentNode;
      }
      return null;
    };
  }
  if (has(NodeList) && NodeList.prototype && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = function (fn, ctx) {
      var i = 0, n = this.length;
      for (; i < n; i++) fn.call(ctx, this[i], i, this);
    };
  }
  if (!has(window.URLSearchParams)) {
    window.URLSearchParams = function (qs) {
      this.pairs = [];
      qs = String(qs || '').replace(/^\?/, '').split('&');
      var i = 0;
      for (; i < qs.length; i++) {
        if (!qs[i]) continue;
        var kv = qs[i].split('=');
        this.pairs.push([decodeURIComponent(kv[0]), decodeURIComponent((kv[1] || '').replace(/\+/g, ' '))]);
      }
    };
    var P = window.URLSearchParams.prototype;
    P.get = function (k) { var i = 0; for (; i < this.pairs.length; i++) { if (this.pairs[i][0] === k) return this.pairs[i][1]; } return null; };
    P.has = function (k) { return this.get(k) !== null; };
    P.getAll = function (k) { var r = [], i = 0; for (; i < this.pairs.length; i++) { if (this.pairs[i][0] === k) r.push(this.pairs[i][1]); } return r; };
    P.append = function (k, v) { this.pairs.push([k, v]); };
    P.toString = function () { var r = [], i = 0; for (; i < this.pairs.length; i++) { var p = this.pairs[i]; r.push(encodeURIComponent(p[0]) + '=' + encodeURIComponent(p[1])); } return r.join('&'); };
  }
})();