/* global SlopSlipProtocol */
(function exposeSlopSlipUI(root) {
  "use strict";

  const protocol = root && root.SlopSlipProtocol;
  if (!protocol) return;

  function byId(id) {
    return document.getElementById(id);
  }

  function legacyCopy(value) {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    if (!copied) throw new Error("Clipboard unavailable");
    return Promise.resolve();
  }

  function copyWithFallback(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value).catch(function () {
        return legacyCopy(value);
      });
    }
    return legacyCopy(value);
  }

  function prettyTrack(track) {
    return [track.artist || "Artist not listed", track.title || "Untitled track"].join(" — ");
  }

  function isShareAbort(error) {
    return error && error.name === "AbortError";
  }

  function install(options) {
    const settings = options || {};
    const toast = typeof settings.toast === "function" ? settings.toast : function () {};
    const button = byId("shareCurrent");
    const dialog = byId("shareDialog");
    if (!button || !dialog) return { destroy: function () {} };

    const heading = byId("shareHeading");
    const context = byId("shareContext");
    const includeTime = byId("shareStartAt");
    const timeLabel = byId("shareStartAtLabel");
    const copyLink = byId("copySlip");
    const nativeShare = byId("nativeShare");
    const copyEmbed = byId("copyEmbed");
    const close = byId("closeShare");
    const releaseBody = byId("releaseBody");

    function currentTrack() {
      return typeof settings.getCurrentTrack === "function" ? settings.getCurrentTrack() : null;
    }

    function currentPosition() {
      const value = typeof settings.getPosition === "function" ? settings.getPosition() : 0;
      return Number.isFinite(value) && value >= 1 ? Math.floor(value) : null;
    }

    function reference() {
      const track = currentTrack();
      if (!track) return null;
      const at = includeTime && includeTime.checked ? currentPosition() : null;
      return protocol.normaliseReference({
        release: track.id || track.releaseId,
        file: track.file,
        at: at
      });
    }

    function normalUrl() {
      return protocol.buildSlipUrl(settings.baseUrl || root.location.href, reference());
    }

    function embeddedUrl() {
      return protocol.buildSlipUrl(settings.baseUrl || root.location.href, reference(), { embed: true });
    }

    function refreshDialog(resetStartTime) {
      const track = currentTrack();
      const at = currentPosition();
      if (!track) return;
      heading.textContent = prettyTrack(track);
      context.textContent = track.release ? "From " + track.release : "Exact track handoff";
      includeTime.disabled = at === null;
      if (resetStartTime) includeTime.checked = at !== null;
      timeLabel.textContent = at === null
        ? "Start at this moment (not available yet)"
        : "Start at " + protocol.formatTime(at);
      copyEmbed.disabled = !track.file;
    }

    function sync() {
      const track = currentTrack();
      button.disabled = !track;
      button.setAttribute("aria-label", track ? "Share " + prettyTrack(track) : "Share current track");
      button.title = track ? "Pass the spoon" : "Choose a track to share";
    }

    async function copyLinkText() {
      const track = currentTrack();
      if (!track) return;
      await copyWithFallback(protocol.shareText(track, normalUrl()));
      toast("Slip copied. Pass the spoon.");
    }

    async function shareNatively() {
      const track = currentTrack();
      if (!track) return;
      const url = normalUrl();
      if (!navigator.share) return copyLinkText();
      try {
        await navigator.share({
          title: prettyTrack(track) + " · slop",
          text: track.release ? "From " + track.release : "A track from Slop",
          url: url
        });
      } catch (error) {
        if (!isShareAbort(error)) toast("Could not open the share sheet.");
      }
    }

    async function copyEmbedCode() {
      const track = currentTrack();
      if (!track || !track.file) return;
      await copyWithFallback(protocol.embedCode(track, embeddedUrl()));
      toast("Quiet embed copied. It will never autoplay.");
    }

    function installReleaseCopy() {
      if (!releaseBody || releaseBody.querySelector("#copyReleaseSlip")) return;
      const source = releaseBody.querySelector('.detailtop a[href^="https://archive.org/details/"]');
      if (!source) return;
      let release;
      try {
        release = decodeURIComponent(new URL(source.href).pathname.split("/").pop() || "");
      } catch (error) {
        return;
      }
      const ref = protocol.normaliseReference({ release: release });
      if (!ref) return;

      const copyRelease = document.createElement("button");
      copyRelease.id = "copyReleaseSlip";
      copyRelease.className = "shareRelease";
      copyRelease.type = "button";
      copyRelease.textContent = "Copy release Slip";
      copyRelease.title = "Copy an exact link to this Archive release";
      copyRelease.addEventListener("click", function () {
        const title = releaseBody.querySelector(".detailtop h2")?.textContent?.trim() || release;
        const url = protocol.buildSlipUrl(settings.baseUrl || root.location.href, ref);
        copyWithFallback(title + " · slop\n" + url)
          .then(function () { toast("Release Slip copied. Pass the spoon."); })
          .catch(function () { toast("Could not copy the release Slip."); });
      });
      source.insertAdjacentElement("afterend", copyRelease);
    }

    function seekWhenReady(track) {
      const audio = settings.audio;
      const at = track && track.at;
      if (!audio || at === undefined) return;
      const expectedSource = protocol.archiveAudioUrl(track);

      function cleanUp() {
        audio.removeEventListener("loadedmetadata", seek);
        audio.removeEventListener("error", cancel);
      }

      function seek() {
        if (audio.src !== expectedSource) {
          cleanUp();
          return;
        }
        cleanUp();
        const maximum = Number.isFinite(audio.duration) ? Math.max(0, audio.duration - 0.05) : at;
        audio.currentTime = Math.min(at, maximum);
      }

      function cancel() {
        if (audio.src === expectedSource) cleanUp();
      }

      audio.addEventListener("loadedmetadata", seek);
      audio.addEventListener("error", cancel);
    }

    async function openIncomingSlip() {
      const hash = root.location.hash;
      if (!protocol.looksLikeSlip(hash)) return;
      const ref = protocol.parseSlipHash(hash);
      if (!ref) {
        toast("This Slop Slip is malformed or no longer supported.");
        return;
      }
      try {
        const resolved = await protocol.resolveSlip(ref);
        if (resolved.track) {
          const prepared = settings.prepareTrack(resolved.track);
          seekWhenReady(resolved.track);
          await prepared;
          toast("A spoonful is ready: " + prettyTrack(resolved.track) + ". Press play to listen.");
        } else if (typeof settings.openRelease === "function") {
          await settings.openRelease({
            identifier: resolved.release.id,
            title: resolved.release.title,
            creator: resolved.release.artist,
            subject: []
          });
          toast("A release is ready: " + resolved.release.title + ".");
        }
      } catch (error) {
        toast(error && error.message ? error.message : "This Slop Slip could not be opened.");
      }
    }

    button.addEventListener("click", function () {
      if (!currentTrack()) return;
      refreshDialog(true);
      dialog.showModal();
    });
    close.addEventListener("click", function () { dialog.close(); });
    includeTime.addEventListener("change", function () { refreshDialog(false); });
    copyLink.addEventListener("click", function () {
      copyLinkText().catch(function () { toast("Could not copy the Slip."); });
    });
    nativeShare.addEventListener("click", function () {
      shareNatively().catch(function () { toast("Could not share the Slip."); });
    });
    copyEmbed.addEventListener("click", function () {
      copyEmbedCode().catch(function () { toast("Could not copy the embed."); });
    });

    if (typeof settings.onTrackChange === "function") settings.onTrackChange(sync);
    const releaseObserver = typeof MutationObserver === "function" && releaseBody
      ? new MutationObserver(installReleaseCopy)
      : null;
    if (releaseObserver) releaseObserver.observe(releaseBody, { childList: true, subtree: true });
    installReleaseCopy();
    sync();
    openIncomingSlip();

    return {
      sync: sync,
      openIncomingSlip: openIncomingSlip,
      destroy: function () {
        if (releaseObserver) releaseObserver.disconnect();
      }
    };
  }

  root.SlopSlipUI = Object.freeze({ install: install });
}(typeof globalThis === "undefined" ? undefined : globalThis));
