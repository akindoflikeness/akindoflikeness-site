/* global SlopSlipProtocol */
(function bootSlopEmbed(root) {
  "use strict";

  const protocol = root.SlopSlipProtocol;
  const select = function (selector) { return document.querySelector(selector); };
  const audio = select("#embedAudio");
  let current = null;

  function show(message, isError) {
    select("#state").textContent = message;
    select("#state").classList.toggle("error", !!isError);
  }

  function parentSlopUrl(reference) {
    return protocol.buildSlipUrl(new URL("./", root.location.href).href, reference);
  }

  function seekAt(seconds) {
    if (seconds === undefined) return;
    audio.addEventListener("loadedmetadata", function () {
      const maximum = Number.isFinite(audio.duration) ? Math.max(0, audio.duration - 0.05) : seconds;
      audio.currentTime = Math.min(seconds, maximum);
    }, { once: true });
  }

  async function startPlayback() {
    if (!current) return;
    try {
      select("#playEmbed").disabled = true;
      audio.src = protocol.archiveAudioUrl(current.track);
      seekAt(current.track.at);
      await audio.play();
      select("#playEmbed").textContent = "Playing";
    } catch (error) {
      show("Playback could not start. Try opening Slop.", true);
    } finally {
      select("#playEmbed").disabled = false;
    }
  }

  async function boot() {
    const reference = protocol.parseSlipHash(root.location.hash);
    if (!reference || !reference.file) {
      show("This embed needs an exact Slop track link.", true);
      return;
    }
    try {
      current = await protocol.resolveSlip(reference);
      select("#cover").src = "https://archive.org/services/img/" + encodeURIComponent(current.release.id);
      select("#cover").alt = "Cover for " + current.release.title;
      select("#title").textContent = current.track.title;
      select("#artist").textContent = current.track.artist + " · " + current.track.release;
      select("#openSlop").href = parentSlopUrl(reference);
      select("#openArchive").href = current.release.archiveUrl;
      select("#card").hidden = false;
      show("");
    } catch (error) {
      show(error && error.message ? error.message : "This embed could not be opened.", true);
    }
  }

  select("#playEmbed").addEventListener("click", startPlayback);
  audio.addEventListener("ended", function () {
    select("#playEmbed").textContent = "Play";
  });
  boot();
}(typeof globalThis === "undefined" ? undefined : globalThis));
