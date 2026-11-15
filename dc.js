/* 김은우 포트폴리오 — 페이지 동작 스크립트
   각 페이지의 <template id="dc"> 안 마크업을 Component.renderVals() 값으로 채워 그린다.
   {{값}} 치환, <sc-for list as>, <sc-if value>, on* 이벤트를 지원한다. */
(function () {
  'use strict';

  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) {
      Object.assign(this.state, typeof patch === 'function' ? patch(this.state) : patch);
      schedule();
    }
  }
  window.DCLogic = DCLogic;

  var comp = null, tpl = null, root = null, queued = false;
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; render(); });
  }

  function lookup(scope, path) {
    if (path == null) return undefined;
    var v = scope, keys = path.trim().split('.');
    for (var i = 0; i < keys.length; i++) {
      if (v == null) return undefined;
      v = v[keys[i]];
    }
    return v;
  }
  function single(str) {
    var m = (str || '').trim().match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    return m ? m[1] : null;
  }
  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = lookup(scope, p);
      return v == null ? '' : String(v);
    });
  }

  function setHandler(el, type, fn) {
    el.__h = el.__h || {};
    if (!(type in el.__h)) {
      el.addEventListener(type, function (e) { var f = el.__h[type]; if (f) f(e); });
    }
    el.__h[type] = fn;
  }

  function build(node, scope, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    var tag = node.localName;
    if (tag === 'sc-for') {
      var list = lookup(scope, single(node.getAttribute('list'))) || [];
      var as = node.getAttribute('as') || 'item';
      list.forEach(function (item, i) {
        var s = Object.create(scope); s[as] = item; s.$index = i;
        node.childNodes.forEach(function (c) { build(c, s, out); });
      });
      return;
    }
    if (tag === 'sc-if') {
      if (lookup(scope, single(node.getAttribute('value')))) node.childNodes.forEach(function (c) { build(c, scope, out); });
      return;
    }
    var el = document.createElementNS(node.namespaceURI, node.localName);
    for (var i = 0; i < node.attributes.length; i++) {
      var a = node.attributes[i], name = a.name;
      if (name.indexOf('hint-') === 0) continue;
      if (name.indexOf('on') === 0 && single(a.value)) {
        var fn = lookup(scope, single(a.value));
        if (typeof fn === 'function') setHandler(el, name.slice(2).toLowerCase(), fn);
        continue;
      }
      el.setAttribute(name, interp(a.value, scope));
    }
    var kids = node.content ? node.content.childNodes : node.childNodes;
    kids.forEach(function (c) { build(c, scope, el); });
    out.appendChild(el);
  }

  // 바뀐 부분만 고쳐 그려서 스크롤 위치·이미지가 유지되게 한다.
  function morph(oldP, newP) {
    var news = Array.prototype.slice.call(newP.childNodes);
    for (var i = 0; i < news.length; i++) {
      var n = news[i], o = oldP.childNodes[i];
      if (!o) { oldP.appendChild(n); continue; }
      if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName) { oldP.replaceChild(n, o); continue; }
      if (n.nodeType === 3) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; continue; }
      if (n.nodeType !== 1) continue;
      for (var j = o.attributes.length - 1; j >= 0; j--) {
        var an = o.attributes[j].name;
        if (!n.hasAttribute(an)) o.removeAttribute(an);
      }
      for (var k = 0; k < n.attributes.length; k++) {
        var at = n.attributes[k];
        if (o.getAttribute(at.name) !== at.value) o.setAttribute(at.name, at.value);
      }
      var nh = n.__h || {}, oh = o.__h || {};
      Object.keys(oh).forEach(function (t) { if (!(t in nh)) oh[t] = null; });
      Object.keys(nh).forEach(function (t) { setHandler(o, t, nh[t]); });
      morph(o, n);
    }
    while (oldP.childNodes.length > news.length) oldP.removeChild(oldP.lastChild);
  }

  function render() {
    var vals = comp.renderVals ? comp.renderVals() : {};
    var frag = document.createElement('div');
    tpl.content.childNodes.forEach(function (c) { build(c, vals, frag); });
    if (!root.firstChild) { while (frag.firstChild) root.appendChild(frag.firstChild); }
    else morph(root, frag);
  }

  document.addEventListener('DOMContentLoaded', function () {
    tpl = document.getElementById('dc');
    root = document.getElementById('dc-root');
    /* global Component */
    comp = new Component({});
    if (!comp.state) comp.state = {};
    render();
  });

  // 작품 이미지 저장 막기: 오른쪽 클릭·끌어서 저장
  document.addEventListener('contextmenu', function (e) { if (e.target.tagName === 'IMG') e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { if (e.target.tagName === 'IMG') e.preventDefault(); });
})();
