/* The site player. Streams from archive.org: the derived MP3 when the item has one, the FLAC otherwise.
   Reads the release list from <script id="catalogue">, wires every [data-play] button (and the track
   rows that hold one), and marks whatever is playing with .is-playing / .is-paused on the button and
   on its [data-slug] container. */
(function () {
  "use strict";
  var catEl = document.getElementById("catalogue"), player = document.getElementById("player"), audio = document.getElementById("audio");
  if (!catEl || !player || !audio) return;
  var CAT = JSON.parse(catEl.textContent), albums = CAT.albums;
  var $ = function (id) { return document.getElementById(id); };
  var state = { album: null, track: -1, paused: true, formats: {} };

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function mmss(s) { s = Math.round(s || 0); return Math.floor(s / 60) + ":" + pad(s % 60); }
  function enc(name) { return encodeURIComponent(name).replace(/'/g, "%27"); }
  function flacUrl(a, t) { return a.download + "/" + enc(t.flac); }
  function mp3Url(a, t) { return a.download + "/" + enc(t.flac.replace(/\.flac$/, ".mp3")); }
  function bySlug(slug) { for (var i = 0; i < albums.length; i++) if (albums[i].slug === slug) return albums[i]; return null; }
  function tryPlay() { var p = audio.play(); if (p && p.catch) p.catch(function () {}); }

  /* archive.org lists which derived files exist; without the answer we just use the FLAC. */
  function learnFormats(a) {
    if (state.formats[a.slug] || typeof fetch !== "function") return Promise.resolve(state.formats[a.slug] || {});
    return fetch("https://archive.org/metadata/" + a.identifier + "/files", { mode: "cors" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var have = {};
        (d.result || []).forEach(function (f) { if (/\.mp3$/.test(f.name)) have[f.name] = true; });
        state.formats[a.slug] = have; return have;
      })
      .catch(function () { state.formats[a.slug] = {}; return {}; });
  }

  function setSource(a, t) {
    var have = state.formats[a.slug] || {}, mp3 = t.flac.replace(/\.flac$/, ".mp3");
    audio.src = have[mp3] ? mp3Url(a, t) : flacUrl(a, t);
    audio.dataset.fallback = have[mp3] ? flacUrl(a, t) : "";
  }

  /* The cover in the player: the picture the page already shows for this album when it has loaded
     (so it comes from the cache), else each of the album's covers in turn: the 800 px web copy on
     archive.org, then the original. Without the fallback a missing web copy left the player blank. */
  function showCover(a) {
    var el = $("p-cover"), list = a.covers.slice(), img = document.querySelector('[data-slug="' + a.slug + '"] img');
    if (img && img.complete && img.naturalWidth) list.unshift(img.currentSrc || img.src);
    el.onerror = function () { if (list.length) el.src = list.shift(); else el.onerror = null; };
    el.onload = function () { try { if (navigator.mediaSession && navigator.mediaSession.metadata) navigator.mediaSession.metadata.artwork = artwork(); } catch (e) {} };
    el.src = list.shift();
  }
  function artwork() {
    var c = $("p-cover"), src = c.currentSrc || c.src;
    if (!src || !c.naturalWidth || /^data:/.test(src)) return [];
    return [{ src: src, sizes: c.naturalWidth + "x" + c.naturalHeight, type: /\.png(\?|$)/i.test(src) ? "image/png" : "image/jpeg" }];
  }

  function playTrack(a, i) {
    if (i < 0 || i >= a.tracks.length) return;
    if (state.album === a && state.track === i) { toggle(); return; }
    var t = a.tracks[i];
    if (state.album !== a) showCover(a);
    state.album = a; state.track = i; state.paused = false;
    player.hidden = false; document.body.classList.add("has-player");
    player.style.setProperty("--accent", a.accent);
    $("p-link").href = a.page;
    $("p-track").textContent = pad(i + 1) + "  " + t.title;
    $("p-album").textContent = a.title + " · " + a.year;
    $("p-note").textContent = "";
    $("p-dur").textContent = mmss(t.seconds); $("p-cur").textContent = "0:00"; $("p-bar").style.width = "0";
    mark();
    learnFormats(a).then(function () {
      if (state.album !== a || state.track !== i) return;
      setSource(a, t); tryPlay(); announce(a, t);
    });
  }
  function toggle() { if (!state.album) return; if (audio.paused) tryPlay(); else audio.pause(); }
  function step(d) { if (!state.album) return; var n = state.track + d; if (n >= 0 && n < state.album.tracks.length) playTrack(state.album, n); }

  /* what is playing, shown on the buttons and their containers */
  function mark() {
    var a = state.album, slug = a ? a.slug : null;
    var els = document.querySelectorAll("[data-play], [data-slug]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i], s = el.getAttribute("data-play") || el.getAttribute("data-slug"), tr = el.getAttribute("data-track");
      var on = slug && s === slug && (tr === null || +tr === state.track);
      el.classList.toggle("is-playing", !!on && !state.paused);
      el.classList.toggle("is-paused", !!on && state.paused);
    }
    $("p-play").classList.toggle("is-playing", !!a && !state.paused);
  }

  /* lock screens and media keys */
  function announce(a, t) {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: CAT.artist, album: a.title, artwork: artwork() });
      navigator.mediaSession.setActionHandler("play", tryPlay);
      navigator.mediaSession.setActionHandler("pause", function () { audio.pause(); });
      navigator.mediaSession.setActionHandler("previoustrack", function () { step(-1); });
      navigator.mediaSession.setActionHandler("nexttrack", function () { step(1); });
    } catch (e) {}
  }

  document.addEventListener("click", function (e) {
    if (!e.target.closest) return;
    var b = e.target.closest("[data-play]");
    if (!b) { var row = e.target.closest(".track"); if (row && !e.target.closest("a")) b = row.querySelector("[data-play]"); }
    if (!b) return;
    var a = bySlug(b.getAttribute("data-play")); if (!a) return;
    var tr = b.getAttribute("data-track");
    if (tr !== null) playTrack(a, +tr);
    else if (state.album === a) toggle();
    else playTrack(a, 0);
  });

  audio.addEventListener("play", function () { state.paused = false; mark(); });
  audio.addEventListener("pause", function () { state.paused = true; mark(); });
  audio.addEventListener("timeupdate", function () {
    var d = audio.duration || (state.album && state.album.tracks[state.track].seconds) || 0;
    $("p-cur").textContent = mmss(audio.currentTime);
    $("p-bar").style.width = d ? (100 * audio.currentTime / d) + "%" : "0";
  });
  audio.addEventListener("durationchange", function () { if (isFinite(audio.duration) && audio.duration) $("p-dur").textContent = mmss(audio.duration); });
  audio.addEventListener("ended", function () { step(1); });
  audio.addEventListener("error", function () {
    if (audio.dataset.fallback) { audio.src = audio.dataset.fallback; audio.dataset.fallback = ""; tryPlay(); return; }
    $("p-note").textContent = "can't reach archive.org from here";
    state.paused = true; mark();
  });

  $("p-play").addEventListener("click", toggle);
  $("p-prev").addEventListener("click", function () { if (audio.currentTime > 4) audio.currentTime = 0; else step(-1); });
  $("p-next").addEventListener("click", function () { step(1); });
  $("p-seek").addEventListener("click", function (e) {
    var d = audio.duration; if (!isFinite(d) || !d) return;
    var r = e.currentTarget.getBoundingClientRect(); audio.currentTime = d * (e.clientX - r.left) / r.width;
  });

  /* volume: the slider fills to its level, and the level is remembered between visits */
  var vol = $("p-vol"), mute = $("p-mute");
  try { var v = localStorage.getItem("akol-volume"); if (v !== null && isFinite(+v)) audio.volume = Math.min(1, Math.max(0, +v)); } catch (e) {}
  function paintVol() {
    var level = audio.muted ? 0 : audio.volume;
    vol.value = level; vol.style.setProperty("--vol", (level * 100) + "%");
    mute.classList.toggle("is-muted", audio.muted || audio.volume === 0);
  }
  vol.addEventListener("input", function () { audio.volume = +vol.value; audio.muted = false; try { localStorage.setItem("akol-volume", vol.value); } catch (e) {} paintVol(); });
  mute.addEventListener("click", function () { audio.muted = !audio.muted; paintVol(); });
  audio.addEventListener("volumechange", paintVol);
  paintVol();

  addEventListener("keydown", function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)) return;
    if (e.code === "Space" && state.album) { e.preventDefault(); toggle(); }
  });
})();
