/* 하늘 배경 — 서울의 해 위치와 현재 날씨에 맞춰 배경색을 아주 옅게 바꾼다.
   작품 이미지와 글 위에는 덮지 않고, 페이지 맨 뒤에만 깔린다. */
(function () {
  'use strict';
  var LAT = 37.5665, LON = 126.978;           // 서울
  var WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=' + LAT + '&longitude=' + LON +
                    '&current=weather_code,cloud_cover&timezone=Asia%2FSeoul';
  var CACHE_KEY = 'sky-weather-v1', CACHE_MS = 30 * 60 * 1000;
  var weather = { cloud: 0.15, kind: 'clear' };

  // 태양 고도(도) — NOAA 근사식
  function sunAltitude(date) {
    var rad = Math.PI / 180;
    var d = date.getTime() / 86400000 - 10957.5;            // J2000 기준 일수
    var g = (357.529 + 0.98560028 * d) * rad;
    var q = 280.459 + 0.98564736 * d;
    var L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
    var e = (23.439 - 0.00000036 * d) * rad;
    var ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    var dec = Math.asin(Math.sin(e) * Math.sin(L));
    var gmst = (18.697374558 + 24.06570982441908 * d) % 24;
    var lst = (gmst * 15 + LON) * rad;
    var ha = lst - ra;
    var lat = LAT * rad;
    return Math.asin(Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha)) / rad;
  }

  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function mix(a, b, t) { return [0, 1, 2].map(function (i) { return a[i] + (b[i] - a[i]) * t; }); }
  function css(c) { return 'rgb(' + c.map(function (v) { return Math.round(v); }).join(',') + ')'; }

  // 해 고도별 위/아래 색. 모두 아주 밝은 색이라 검은 글씨가 잘 읽힌다.
  var MORNING = [
    [-90, '#D2D7E1', '#E0E3EA'],   // 밤 — 푸른 회색, 조금 어둡게
    [-12, '#D9DAE5', '#E5E5EC'],   // 새벽 어스름
    [-4,  '#EEE6EC', '#F6EEEA'],   // 여명 — 옅은 라벤더·복숭아
    [2,   '#F7E9E1', '#FBF3EC'],   // 해 뜰 무렵
    [12,  '#F9F2E8', '#FCF9F4'],   // 아침 햇살
    [30,  '#F9F9F6', '#FDFDFB'],   // 한낮
    [90,  '#FAFAF8', '#FEFEFD']
  ];
  var EVENING = [
    [-90, '#D2D7E1', '#E0E3EA'],
    [-12, '#D8D9E4', '#E4E5EB'],
    [-4,  '#EDE3E8', '#F5EAE6'],   // 노을 끝 — 옅은 장밋빛 보라
    [2,   '#F6E3DA', '#FAEFE7'],   // 해 질 녘
    [12,  '#F9EFE3', '#FCF7F0'],   // 늦은 오후
    [30,  '#F9F9F6', '#FDFDFB'],
    [90,  '#FAFAF8', '#FEFEFD']
  ];

  function skyColors(now) {
    var alt = sunAltitude(now);
    var later = sunAltitude(new Date(now.getTime() + 10 * 60000));
    var table = later >= alt ? MORNING : EVENING;
    var i = 0;
    while (i < table.length - 2 && alt > table[i + 1][0]) i++;
    var a = table[i], b = table[i + 1];
    var t = Math.max(0, Math.min(1, (alt - a[0]) / (b[0] - a[0])));
    var top = mix(hex(a[1]), hex(b[1]), t), bottom = mix(hex(a[2]), hex(b[2]), t);

    // 날씨: 구름은 회색 쪽으로, 비는 차갑게, 눈은 밝고 차갑게, 안개는 뿌옇게
    var grey = hex('#ECECEA');
    top = mix(top, grey, weather.cloud * 0.55);
    bottom = mix(bottom, grey, weather.cloud * 0.35);
    if (weather.kind === 'rain') { top = mix(top, hex('#E2E7EC'), 0.45); bottom = mix(bottom, hex('#EBEEF1'), 0.3); }
    if (weather.kind === 'snow') { top = mix(top, hex('#EEF2F6'), 0.5); bottom = mix(bottom, hex('#F7F9FB'), 0.4); }
    if (weather.kind === 'fog')  { top = mix(top, hex('#EDEDEC'), 0.6); bottom = mix(bottom, hex('#F3F3F2'), 0.5); }
    return { top: top, bottom: bottom };
  }

  function kindOf(code) {
    if (code === 45 || code === 48) return 'fog';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
    return 'clear';
  }

  function applyWeather(cur) {
    if (!cur) return;
    weather = { cloud: Math.max(0, Math.min(1, (cur.cloud_cover || 0) / 100)), kind: kindOf(cur.weather_code) };
    paint();
  }

  function loadWeather() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && Date.now() - c.t < CACHE_MS) { applyWeather(c.cur); return; }
    } catch (e) { /* 저장소를 못 쓰면 그냥 새로 받는다 */ }
    if (!window.fetch) return;
    fetch(WEATHER_URL).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j || !j.current) return;
      applyWeather(j.current);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), cur: j.current })); } catch (e) {}
    }).catch(function () { /* 날씨를 못 받아도 해 위치만으로 동작 */ });
  }

  var layer;
  function paint() {
    if (!layer) return;
    var c = skyColors(new Date());
    layer.style.background = 'linear-gradient(to bottom, ' + css(c.top) + ' 0%, ' + css(c.bottom) + ' 70%)';
  }

  function start() {
    layer = document.createElement('div');
    layer.id = 'sky';
    layer.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(layer, document.body.firstChild);
    paint();
    requestAnimationFrame(function () { layer.classList.add('ready'); });
    loadWeather();
    setInterval(paint, 60 * 1000);
    setInterval(loadWeather, CACHE_MS);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  window.__sky = { sunAltitude: sunAltitude, skyColors: skyColors, setWeather: function (w) { weather = w; paint(); } };
})();
