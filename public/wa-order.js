/* wa-order.js — Buy buttons go straight to WhatsApp with plan + connections (2026-10-27) */
(function () {
  "use strict";
  var DEFAULT_WA = "447412836986";
  var BUY = /(buy|order|commander|acheter|choisir|je choisis|s'abonner|abonner|souscrire|kaufen|bestellen|jetzt|w(ä|a)hlen|subscribe|get (it|started|now)|choose|select plan|start now|comprar|assinar|contratar|ordina|acquista|scegli|abbonati|bestel|kies|kopen|satın|abone|paketi se\u00e7|paketi sec|plan\u0131 se\u00e7|sipari\u015f|siparis|commencer|inizia|loslegen|come\u00e7ar|comenzar|empezar)/i;
  var PRICE = /([€£$]\s?\d+([.,]\d{1,2})?|\d+([.,]\d{1,2})?\s?(€|£|\$|eur|usd|gbp|chf|r\$))/i;
  var DUR = /(\d+)\s*(mois|months?|mo(?![a-z])|monate?n?|meses|mesi|maanden|maand|ay(?![a-z\u00e7\u011f\u0131\u00f6\u015f\u00fc])|jahre?|years?|ans?(?![a-z])|anos?|anni|jaar)/i;
  var TAIL = /\s+(plan|pack|package|paket|offre|formule|plano|piano|pakket)$/i;
  var STRIP = /^(pack|plan|offre|formule|forfait|abonnement|paket|tarif|plano|piano|pakket|paquete|offer|package|subscription)\s+/i;

  function txt(el) { return el ? (el.textContent || "").replace(/\s+/g, " ").trim() : ""; }
  function lang() { return ((document.documentElement.getAttribute("lang") || "en").slice(0, 2)).toLowerCase(); }

  function waNumber() {
    if (window.WA_ORDER_NUMBER) return String(window.WA_ORDER_NUMBER);
    var a = document.querySelectorAll('a[href*="wa.me/"],a[href*="api.whatsapp.com"]');
    for (var i = 0; i < a.length; i++) {
      var m = a[i].getAttribute("href").match(/(?:wa\.me\/|phone=)(\d{8,15})/);
      if (m) return m[1];
    }
    return DEFAULT_WA;
  }

  function buyCount(el) {
    var n = 0, b = el.querySelectorAll("a,button,[role=button],input[type=submit]");
    for (var i = 0; i < b.length; i++) if (isBuy(b[i])) n++;
    return n;
  }
  function isBuy(el) {
    var t = txt(el) || el.value || "";
    var h = el.getAttribute && (el.getAttribute("href") || "");
    if (/conn|screen|ecran|écran|device|minus|plus|qty|decrement|increment|step/i.test(el.className || "") && t.length < 4) return false;
    if (t.length <= 2 && !/^(https?:|\/|\.)/.test(h || "")) return false;
    if (/^#(pricing|prices|price|plans?|tarifs?|prix|preise|precos|pre\u00e7os|offres?|offers?|abonnements?|packages?|subscriptions?|formules?|pakete?)\b/i.test(h || "") && !el.hasAttribute("data-plan") && !el.hasAttribute("data-plan-name")) return false;
    return BUY.test(t) || /checkout|\border|commande|bestell|paiement|payment|cart/i.test(h || "") ||
      el.hasAttribute("data-plan") || el.hasAttribute("data-plan-name") || el.hasAttribute("data-checkout") ||
      /(^|[\s_-])(cta|buy|order|checkout|select-plan|choose|plan-btn|plan-buy)([\s_-]|$)/i.test(String(el.className || ""));
  }

  function findCard(btn) {
    var el = btn.parentElement, depth = 0;
    while (el && el !== document.body && depth < 10) {
      if (PRICE.test(txt(el))) return buyCount(el) <= 1 ? el : null;
      el = el.parentElement; depth++;
    }
    return null;
  }

  function planName(btn, card) {
    var attrs = ["data-plan-name", "data-plan", "data-name", "data-title", "data-product"];
    for (var i = 0; i < attrs.length; i++) {
      var v = btn.getAttribute(attrs[i]) || card.getAttribute(attrs[i]);
      if (v && !/^\d+$/.test(v)) return v.trim();
    }
    var h = card.querySelector('[class*="name"],[class*="-nom"],[class*="_nom"],[class*="title"],[class*="titre"],h2,h3,h4,h5,strong');
    var name = txt(h);
    if (!name || name.length > 40 || PRICE.test(name) || /^\d+$/.test(name)) {
      var hs = card.querySelectorAll("h2,h3,h4,h5,strong,b");
      for (var j = 0; j < hs.length; j++) { var t = txt(hs[j]); if (t && t.length <= 40 && !PRICE.test(t) && !/^\d+$/.test(t)) { name = t; break; } }
    }
    return (name || "").trim();
  }

  function duration(card, name) {
    var m = (name || "").match(DUR);
    if (m) return "";
    var p = card.querySelector('[class*="period"],[class*="duration"],[class*="dur"],[class*="term"]');
    m = (txt(p) + " " + txt(card)).match(DUR);
    return m ? m[1] + " " + m[2].toLowerCase() : "";
  }

  function digit(s) { var m = String(s || "").match(/\d+/); return m ? parseInt(m[0], 10) : 0; }
  function q(s, card, sel) {
    var list = s.querySelectorAll(sel);
    for (var i = 0; i < list.length; i++) {
      if (s === card) return list[i];
      var c = findCard(list[i]);
      if (!c || c === card) return list[i];
    }
    return null;
  }
  function connections(card, href) {
    var scopes = [card, document];
    for (var k = 0; k < scopes.length; k++) {
      var root = scopes[k];
      var s = { querySelector: function (x) { return q(root, card, x); } };
      var sel = s.querySelector('select[name*="conn" i],select[id*="conn" i],select[class*="conn" i],select[name*="screen" i],select[name*="device" i]');
      if (sel && digit(sel.value)) return digit(sel.value);
      var inp = s.querySelector('input[type=number][name*="conn" i],input[type=number][class*="conn" i],input[type=number][id*="conn" i],input[type=range][class*="conn" i]');
      if (inp && digit(inp.value)) return digit(inp.value);
      var chk = s.querySelector('input[type=radio][name*="conn" i]:checked,input[type=radio][name*="screen" i]:checked,input[type=radio][name*="device" i]:checked');
      if (chk && digit(chk.value)) return digit(chk.value);
      var cnt = s.querySelector('[data-conn-value],[data-connections],[data-nb],[aria-live],[class*="stepper"] [class*="val"],[class*="step"] [class*="num"],[class*="stepper"] [class*="value"],[class*="stepper"] [class*="count"],[class*="qty"] [class*="num"],[class*="qty"] [class*="value"],[class*="conn"] [class*="count"],[class*="conn"] [class*="num"],[class*="conn"] [class*="value"],[class*="conn"] output,[class*="count"][class*="conn"],[data-conn-count],[class*="screen"] [class*="count"],[class*="device"] [class*="count"]');
      if (cnt && digit(txt(cnt) || cnt.getAttribute("data-conn-count") || cnt.getAttribute("data-connections"))) return digit(txt(cnt) || cnt.getAttribute("data-conn-count") || cnt.getAttribute("data-connections"));
      var act = s.querySelector('[class*="conn"] .active,[class*="conn"] .is-active,[class*="conn"] .selected,[class*="conn"] [aria-pressed="true"],[class*="conn"] [aria-checked="true"],[class*="screen"] .active,[class*="device"] .active');
      if (act && digit(txt(act))) return digit(txt(act));
      if (root === card && card.getAttribute("data-conn") && digit(card.getAttribute("data-conn"))) return digit(card.getAttribute("data-conn"));
    }
    var up = param(href, ["conn", "connections", "connexions", "screens", "devices"]);
    if (digit(up)) return digit(up);
    var cl = card.cloneNode(true), lis = cl.querySelectorAll("li,ul,ol");
    for (var r = 0; r < lis.length; r++) if (lis[r].parentNode) lis[r].parentNode.removeChild(lis[r]);
    var tm = txt(cl).match(/(\d+)\s*(devices?|screens?|connections?|connexions?|\u00e9crans?|ecrans?|verbindung(en)?|ger\u00e4te?|conexi\u00f3n|conexiones|conex\u00e3o|conex\u00f5es|connessioni|connessione|apparaten|apparaat)\b/i);
    return tm ? parseInt(tm[1], 10) : 1;
  }

  function param(href, names) {
    if (!href || href.indexOf("?") < 0) return "";
    try { var u = new URL(href, location.href); for (var i = 0; i < names.length; i++) { var v = u.searchParams.get(names[i]); if (v) return v; } } catch (e) {}
    return "";
  }

  function message(plan, dur, n) {
    var P = (plan || "").toUpperCase(), D = dur ? " (" + dur + ")" : "", L = lang();
    var M = {
      fr: "Je souhaite commander l'Offre " + P + D + " pour " + n + " connexion" + (n > 1 ? "s" : "") + " et recevoir une assistance pour la mise en route.",
      de: "Ich möchte das Paket " + P + D + " für " + n + " Verbindung" + (n > 1 ? "en" : "") + " bestellen und Hilfe bei der Einrichtung erhalten.",
      pt: "Quero encomendar o plano " + P + D + " para " + n + (n > 1 ? " conexões" : " conexão") + " e receber ajuda com a configuração.",
      it: "Vorrei ordinare il piano " + P + D + " per " + n + (n > 1 ? " connessioni" : " connessione") + " e ricevere assistenza per la configurazione.",
      nl: "Ik wil het pakket " + P + D + " bestellen voor " + n + " verbinding" + (n > 1 ? "en" : "") + " en hulp krijgen bij de installatie.",
      es: "Quiero pedir el plan " + P + D + " para " + n + (n > 1 ? " conexiones" : " conexión") + " y recibir ayuda con la configuración.",
      tr: P + D + " paketini " + n + " bağlantı için sipariş etmek ve kurulum desteği almak istiyorum.",
      en: "I would like to order the " + P + " plan" + D + " for " + n + " connection" + (n > 1 ? "s" : "") + " and get help with the setup."
    };
    return M[L] || M.en;
  }

  function go(url) {
    var w = null;
    try { w = window.open(url, "_blank"); } catch (e) {}
    if (!w) location.href = url;
  }

  window.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("a,button,[role=button],input[type=submit]") : null;
    if (!t) return;
    var href = t.getAttribute("href") || "";
    var buy = isBuy(t), card = buy ? findCard(t) : null;
    var urlPlan = buy ? param(href, ["plan", "package", "pack", "offer", "offre", "formule", "forfait", "paket", "plano"]).replace(/[-_]+/g, " ") : "";
    if (!card && urlPlan) card = document.createElement("div");
    if (card) {
      var raw = urlPlan || planName(t, card);
      var plan = raw.split(/\s+[-\u2014\u2013|\u00b7:]\s+|\s*\(/)[0].replace(STRIP, "").replace(TAIL, "").trim();
      var dm = raw.match(DUR), dur = dm ? dm[1] + " " + dm[2].toLowerCase() : duration(card, plan);
      if (dm && plan.replace(DUR, "").trim() === "") dur = "";
      if (!plan && dur) { plan = dur; dur = ""; }
      var n = connections(card, href);
      if (n < 1 || n > 10) n = 1;
      var msg = message(plan || "", dur, n);
      var url = "https://wa.me/" + waNumber() + "?text=" + encodeURIComponent(msg);
      window.__waLast = { plan: plan, duration: dur, connections: n, url: url };
      e.preventDefault(); e.stopImmediatePropagation();
      if (!window.__waDry) go(url);
      return;
    }
    if (/wa\.me\/|api\.whatsapp\.com/.test(href)) { e.stopImmediatePropagation(); }
  }, true);
})();
