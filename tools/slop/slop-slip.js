/*
 * Slop Slip v1
 *
 * A small, backend-free handoff format for an Archive release or one exact
 * browser-playable file. This script deliberately exposes a browser global so
 * the static player and quiet embed can use the same validation rules.
 */
(function exposeSlopSlip(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.SlopSlipProtocol = api;
}(typeof globalThis === "undefined" ? undefined : globalThis, function createSlopSlip() {
  "use strict";

  const VERSION = "1";
  const RELEASE_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,199}$/;
  const PLAYABLE_FILE = /\.(mp3|ogg|m4a)$/i;
  const MAX_START_SECONDS = 7 * 24 * 60 * 60;

  function firstText(value) {
    if (Array.isArray(value)) return firstText(value[0]);
    return typeof value === "string" ? value.trim() : "";
  }

  function safeFile(file) {
    return typeof file === "string"
      && file.length > 0
      && file.length <= 1500
      && !file.startsWith("/")
      && !file.includes("\\")
      && !/[\u0000-\u001f]/.test(file)
      && !file.split("/").some(function (part) { return part === "." || part === ".."; })
      && PLAYABLE_FILE.test(file);
  }

  function startAt(value) {
    if (value === undefined || value === null || value === "") return null;
    const seconds = Number(value);
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > MAX_START_SECONDS) return null;
    return Math.floor(seconds);
  }

  function normaliseReference(value) {
    if (!value || typeof value !== "object") return null;
    const release = typeof value.release === "string" ? value.release.trim() : "";
    const file = value.file === undefined || value.file === null || value.file === "" ? null : value.file;
    if (!RELEASE_ID.test(release) || (file !== null && !safeFile(file))) return null;

    const ref = { release: release, file: file };
    const hasStart = value.at !== undefined && value.at !== null;
    const at = startAt(value.at);
    if (hasStart && at === null) return null;
    if (!file && at !== null) return null;
    if (at !== null) ref.at = at;
    return ref;
  }

  function parseSlipHash(hash) {
    const raw = typeof hash === "string" ? hash.replace(/^#/, "") : "";
    const params = new URLSearchParams(raw);
    if (params.get("v") !== VERSION) return null;
    return normaliseReference({
      release: params.get("r"),
      file: params.get("f"),
      at: params.get("at")
    });
  }

  function looksLikeSlip(hash) {
    const raw = typeof hash === "string" ? hash.replace(/^#/, "") : "";
    const params = new URLSearchParams(raw);
    return params.has("v") || params.has("r") || params.has("f");
  }

  function serialiseSlip(reference) {
    const ref = normaliseReference(reference);
    if (!ref) throw new TypeError("A Slop Slip needs a valid Archive release and playable file.");
    const params = new URLSearchParams({ v: VERSION, r: ref.release });
    if (ref.file) params.set("f", ref.file);
    if (ref.at !== undefined) params.set("at", String(ref.at));
    return params.toString();
  }

  function buildSlipUrl(baseUrl, reference, options) {
    const settings = options || {};
    let url = new URL(baseUrl);
    if (settings.embed) {
      const directory = new URL(url);
      directory.search = "";
      directory.hash = "";
      const lastPart = directory.pathname.split("/").pop() || "";
      if (!directory.pathname.endsWith("/") && !/\.[A-Za-z0-9]{1,12}$/.test(lastPart)) {
        directory.pathname += "/";
      }
      url = new URL(settings.embedPath || "embed.html", directory);
    }
    url.search = "";
    url.hash = serialiseSlip(reference);
    return url.href;
  }

  function archiveAudioUrl(track) {
    const ref = normaliseReference({
      release: track && (track.id || track.releaseId),
      file: track && track.file
    });
    if (!ref || !ref.file) throw new TypeError("A playable Slop Slip track needs an Archive release and file.");
    return "https://archive.org/download/" + encodeURIComponent(ref.release) + "/" + ref.file.split("/").map(encodeURIComponent).join("/");
  }

  function isPrivate(file) {
    const value = file && file.private;
    return value === true || ["1", "true", "yes"].includes(String(value).toLowerCase());
  }

  function isPlayableArchiveFile(file) {
    return !!file && !isPrivate(file) && safeFile(file.name || "");
  }

  function displayFileName(file) {
    return String(file || "").split("/").pop().replace(/\.[^.]+$/, "") || "Untitled track";
  }

  function resolveMetadata(reference, payload) {
    const ref = normaliseReference(reference);
    if (!ref) throw new TypeError("Invalid Slop Slip reference.");
    const metadata = payload && typeof payload.metadata === "object" ? payload.metadata : {};
    const release = {
      id: ref.release,
      title: firstText(metadata.title) || ref.release,
      artist: firstText(metadata.creator) || "Artist not listed",
      archiveUrl: "https://archive.org/details/" + encodeURIComponent(ref.release)
    };

    if (!ref.file) return { reference: ref, release: release, track: null };

    const files = Array.isArray(payload && payload.files) ? payload.files : [];
    const file = files.find(function (candidate) {
      return candidate && candidate.name === ref.file && isPlayableArchiveFile(candidate);
    });
    if (!file) throw new Error("That track is not available to play on the Internet Archive.");

    const track = {
      id: ref.release,
      file: ref.file,
      title: firstText(file.title) || displayFileName(ref.file),
      artist: firstText(file.creator) || release.artist,
      release: release.title
    };
    if (ref.at !== undefined) track.at = ref.at;
    return { reference: ref, release: release, track: track };
  }

  async function resolveSlip(reference, fetchImpl) {
    const ref = normaliseReference(reference);
    if (!ref) throw new TypeError("Invalid Slop Slip reference.");
    const request = fetchImpl || globalThis.fetch;
    if (typeof request !== "function") throw new TypeError("A fetch implementation is required to resolve a Slop Slip.");
    const response = await request("https://archive.org/metadata/" + encodeURIComponent(ref.release));
    if (!response || !response.ok) throw new Error("The Internet Archive release could not be reached.");
    return resolveMetadata(ref, await response.json());
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const remainder = String(value % 60).padStart(2, "0");
    return hours ? String(hours) + ":" + String(minutes).padStart(2, "0") + ":" + remainder : String(minutes) + ":" + remainder;
  }

  function shareText(track, url) {
    const artist = firstText(track && track.artist) || "Artist not listed";
    const title = firstText(track && track.title) || "Untitled track";
    const release = firstText(track && track.release);
    return artist + " — " + title + (release ? " · " + release : "") + "\n" + url;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function embedCode(track, url) {
    const parts = [firstText(track && track.artist), firstText(track && track.title)].filter(Boolean);
    const title = parts.join(" — ") || "Slop player";
    return '<iframe src="' + escapeHtml(url) + '" title="' + escapeHtml("Slop: " + title) + '" loading="lazy" width="360" height="152" frameborder="0"></iframe>';
  }

  return Object.freeze({
    VERSION: VERSION,
    RELEASE_ID: RELEASE_ID,
    PLAYABLE_FILE: PLAYABLE_FILE,
    normaliseReference: normaliseReference,
    parseSlipHash: parseSlipHash,
    looksLikeSlip: looksLikeSlip,
    serialiseSlip: serialiseSlip,
    buildSlipUrl: buildSlipUrl,
    archiveAudioUrl: archiveAudioUrl,
    resolveMetadata: resolveMetadata,
    resolveSlip: resolveSlip,
    formatTime: formatTime,
    shareText: shareText,
    embedCode: embedCode
  });
}));
