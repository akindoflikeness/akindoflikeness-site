"use strict";
// UI state is separate from the portable music library and the directory data.
(() => {
  const root = document.createElement("section");
  root.id = "genres";
  root.hidden = true;
  root.innerHTML = `<h1>Genres</h1><p class="viewDescription">Genres, offshoots and unexpected neighbours.</p>
 <div class="atlasToolbar"><label for="genreOrder">Display</label><select id="genreOrder" disabled><option value="rotate">Rotating starting points</option><option value="families">Complete families</option><option value="alpha">Everything A–Z</option></select><button id="reshuffleGenres" disabled>Reshuffle</button><span id="atlasStatus" role="status">Loading the directory…</span></div>
 <p class="atlasNote">Open a name to explore. + adds it to your search.</p>
 <div class="atlasSelection"><output id="genreCount" aria-live="polite">0 genres selected</output><div id="selectedGenres"></div><button id="searchGenres" class="primary" disabled>Search selected genres</button><button id="clearGenres">Clear selection</button><small>Matches any selected tag exactly. A parent does not automatically include its subgenres.</small></div>
 <section id="genreFocus" class="genreFocus" hidden aria-label="Genre connections" tabindex="-1"></section>
 <div id="genreOptions" class="genreAtlas"></div>
 <details id="sourceTagPanel" class="sourceTagPanel"><summary>Source tags & other names</summary><p>Unclassified tags are welcome. These are tags seen in loaded results or your liked tracks, not a complete Archive vocabulary. Tag presence does not confirm playable audio.</p><form id="customGenreForm"><label for="customGenre">Add any Archive tag</label><input id="customGenre" maxlength="200" required placeholder="An exact tag or local scene name"><button>Add tag</button></form><div id="sourceGenres"></div></details>
 <details class="atlasMethod"><summary>How these starting points are chosen</summary><p>These are overlapping browsing routes, not an authoritative history of music. A dot means a tag was seen in loaded metadata, not that playback is verified. No dot means availability is unknown.</p><p>Four entries per family, shuffled locally. Recently shown names are passed over where alternatives exist. Your arrangement stays put during this visit; Reshuffle changes it. Complete families and A–Z always include every directory entry.</p><p id="atlasStorage"></p><p>Seed: <code id="genreSeed"></code>. Selection history stays on this device and stores genre identifiers only.</p><button id="forgetGenreHistory">Forget rotation history</button><p><a href="genres.json">Genre data</a> · <a href="GENRES.md">Maintenance guide</a></p></details>`;
  $("#discover").after(root);
  let idx = null,
    seed = "",
    recentInput = [],
    starting = [],
    mode = "rotate",
    focused = null,
    queryTimer;
  const selected = new Set(),
    observed = new Set(),
    openRoutes = new Set();
  let memoryRecent = [],
    storageOK = true;
  const storageKey = "slop-genre-rotation-v1",
    sessionKey = "slop-genre-session-v1";
  function read(store, key) {
    try {
      return JSON.parse(store.getItem(key) || "null");
    } catch {
      storageOK = false;
      return null;
    }
  }
  function write(store, key, value) {
    try {
      store.setItem(key, JSON.stringify(value));
    } catch {
      storageOK = false;
    }
  }
  function recent() {
    let saved;
    try {
      saved = read(localStorage, storageKey);
    } catch {
      storageOK = false;
    }
    return Array.isArray(saved)
      ? saved
          .filter((x) => typeof x === "string" && idx.byId.has(x))
          .slice(-200)
      : memoryRecent;
  }
  function saveSession() {
    try {
      write(sessionStorage, sessionKey, {
        version: 1,
        seed,
        recentInput,
        mode,
      });
    } catch {
      storageOK = false;
    }
  }
  function storageStatus() {
    $("#atlasStorage").textContent = storageOK
      ? "Rotation preferences are saved locally."
      : "Storage is unavailable; rotation still works for this visit.";
  }
  function newStarting() {
    recentInput = recent();
    seed = Array.from(crypto.getRandomValues(new Uint32Array(2)), (x) =>
      x.toString(16),
    ).join("-");
    starting = SlopGenres.sample(idx, seed, recentInput);
    const shown = starting.flatMap((x) => x.ids);
    memoryRecent = [
      ...new Set([...recentInput.filter((x) => !shown.includes(x)), ...shown]),
    ].slice(-200);
    try {
      write(localStorage, storageKey, memoryRecent);
    } catch {
      storageOK = false;
    }
    saveSession();
    storageStatus();
  }
  function seen(g) {
    return [g.tag, g.label, ...g.aliases]
      .filter(Boolean)
      .some((s) =>
        [...observed].some(
          (t) => SlopGenres.normal(t) === SlopGenres.normal(s),
        ),
      );
  }
  function row(id, path) {
    const g = idx.byId.get(id),
      tag = g.tag;
    const kids = idx.children.get(id);
    const route = path + "/" + id;
    return `<div class="atlasNode"><div class="atlasRow"><button class="genreName" data-explore="${id}" ${focused === id ? 'aria-current="true"' : ""}>${esc(g.label)}</button>${seen(g) ? '<span class="tagSeen" title="Tag seen in loaded metadata; playback unverified" aria-label="Tag seen in loaded metadata">•</span>' : ""}${tag ? `<button class="genreAdd" data-add-tag="${esc(tag)}" aria-label="${selected.has(tag) ? "Remove" : "Add"} ${esc(g.label)}" aria-pressed="${selected.has(tag)}">${selected.has(tag) ? "−" : "+"}</button>` : ""}</div>${kids.length ? `<details class="genreBranch" data-route="${esc(route)}" data-parent="${id}" ${openRoutes.has(route) ? "open" : ""}><summary>${kids.length} narrower ${kids.length === 1 ? "route" : "routes"}</summary><div class="branchChildren">${openRoutes.has(route) ? kids.map((c) => row(c, route)).join("") : ""}</div></details>` : ""}</div>`;
  }
  function bindRows(container) {
    container
      .querySelectorAll("[data-explore]")
      .forEach((b) => (b.onclick = () => showFocus(b.dataset.explore, true)));
    container
      .querySelectorAll("[data-add-tag]")
      .forEach((b) => (b.onclick = () => toggleTag(b.dataset.addTag)));
    container.querySelectorAll(".genreBranch").forEach(
      (d) =>
        (d.ontoggle = () => {
          const path = d.dataset.route;
          if (d.open) {
            openRoutes.add(path);
            const box = d.querySelector(".branchChildren");
            if (!box.childElementCount) {
              box.innerHTML = idx.children
                .get(d.dataset.parent)
                .map((id) => row(id, path))
                .join("");
              bindRows(box);
            }
          } else openRoutes.delete(path);
        }),
    );
  }
  function updateSelection() {
    const count = selected.size;
    $("#genreCount").textContent = count + " genres selected";
    $("#selectedGenres").innerHTML = [...selected]
      .map(
        (tag) =>
          `<button data-remove-tag="${esc(tag)}" aria-label="Remove ${esc(tag)}">${esc(tag)} ×</button>`,
      )
      .join("");
    $("#selectedGenres")
      .querySelectorAll("button")
      .forEach((b) => (b.onclick = () => toggleTag(b.dataset.removeTag)));
    $("#searchGenres").disabled = !count;
    root.querySelectorAll("[data-add-tag]").forEach((b) => {
      const on = selected.has(b.dataset.addTag);
      b.textContent = on ? "−" : "+";
      b.setAttribute("aria-pressed", String(on));
      b.setAttribute(
        "aria-label",
        (on ? "Remove " : "Add ") + b.dataset.addTag,
      );
    });
  }
  function toggleTag(value) {
    const tag = value.trim().toLowerCase().slice(0, 200);
    if (!tag) return;
    if (selected.has(tag)) selected.delete(tag);
    else if (selected.size < 20) selected.add(tag);
    else toast("Choose up to 20 tags per search.");
    updateSelection();
  }
  function relation(title, ids) {
    return `<div class="genreRelations"><h3>${title}</h3>${ids.length ? ids.map((id) => `<button data-explore="${id}">${esc(idx.byId.get(id).label)}</button>`).join("") : '<span class="dim">No routes recorded yet.</span>'}</div>`;
  }
  function showFocus(id, move = false) {
    focused = id;
    const g = idx.byId.get(id),
      panel = $("#genreFocus");
    panel.hidden = false;
    panel.innerHTML = `<button id="closeGenreFocus" aria-label="Close genre connections">Close</button><h2>${esc(g.label)}</h2><p>${esc(g.note)}</p>${g.aliases.length ? `<p>Also called: ${g.aliases.map(esc).join(" · ")}</p>` : ""}<p class="dim">${seen(g) ? "Tag seen in loaded metadata. Playable recordings have not been verified." : "Recording availability not checked. Explore this tag in Search."}</p>${g.tag ? `<button data-add-tag="${esc(g.tag)}" aria-pressed="${selected.has(g.tag)}" aria-label="Add ${esc(g.label)}">+</button>` : '<p class="dim">This is a browsing family, not an Archive tag.</p>'}${relation("Broader routes", g.parents)}${relation("Narrower routes", idx.children.get(id))}${relation("Neighbouring styles", g.related)}`;
    bindRows(panel);
    updateSelection();
    $("#closeGenreFocus").onclick = () => {
      panel.hidden = true;
      focused = null;
      root.querySelector(`[data-explore="${id}"]`)?.focus();
    };
    if (move) {
      panel.focus({ preventScroll: true });
      panel.scrollIntoView({ block: "nearest" });
    }
  }
  function sourceTags() {
    const q = SlopGenres.normal($("#genreQuery").value);
    const tags = [...observed]
      .filter((t) => !q || t.includes(q))
      .sort((a, b) => a.localeCompare(b));
    $("#sourceGenres").innerHTML = tags.length
      ? (tags.length > 100
          ? '<p class="dim">Showing 100 of ' +
            tags.length +
            " loaded tags. Use the genre search above to narrow them.</p>"
          : "") +
        tags
          .slice(0, 100)
          .map(
            (t) =>
              `<div class="atlasRow"><span>${esc(t)}</span><button class="genreAdd" data-add-tag="${esc(t)}" aria-label="Add ${esc(t)}">+</button></div>`,
          )
          .join("")
      : '<p class="dim">No matching source tags loaded yet. You can add a name above.</p>';
    bindRows($("#sourceGenres"));
    updateSelection();
  }
  function render() {
    if (!idx) return;
    const q = $("#genreQuery").value.trim(),
      matches = q ? SlopGenres.matches(idx, q) : null,
      box = $("#genreOptions");
    $("#reshuffleGenres").disabled = mode !== "rotate" || !!q;
    $("#genreSeed").textContent = seed;
    let html = "";
    if (mode === "alpha" && !q)
      html = `<section class="atlasAlphabet"><h2>All ${idx.all.length} names</h2><div>${idx.all.map((id) => row(id, "alphabet")).join("")}</div></section>`;
    else {
      const groups =
        q || mode === "families"
          ? idx.families
              .slice()
              .sort(idx.compare)
              .map((family) => ({ family, ids: idx.descendants.get(family) }))
          : starting;
      for (const group of groups) {
        const family = idx.byId.get(group.family);
        let ids = group.ids;
        if (q) {
          const familyMatches = matches.includes(group.family);
          ids = idx.descendants
            .get(group.family)
            .filter((id) => familyMatches || matches.includes(id));
          if (!ids.length && !familyMatches) continue;
        } else if (mode === "families")
          ids = idx.children.get(group.family).slice().sort(idx.compare);
        html += `<section class="atlasFamily"><h2><button data-explore="${family.id}">${esc(family.label)}</button>${family.tag ? `<button class="genreAdd" data-add-tag="${esc(family.tag)}" aria-label="Add ${esc(family.label)}">+</button>` : ""}</h2><div>${ids.map((id) => row(id, group.family)).join("")}</div>${!q && mode === "rotate" ? `<details class="familyRest" data-family="${group.family}"><summary>All ${idx.descendants.get(group.family).length} names in this family</summary><div></div></details>` : ""}</section>`;
      }
    }
    box.innerHTML =
      html ||
      "<p>No directory names match. Try another name or add the exact source tag below.</p>";
    bindRows(box);
    box.querySelectorAll(".familyRest").forEach(
      (d) =>
        (d.ontoggle = () => {
          if (d.open && !d.querySelector("div").childElementCount) {
            const b = d.querySelector("div");
            b.innerHTML = idx.descendants
              .get(d.dataset.family)
              .map((id) => row(id, d.dataset.family + "/all"))
              .join("");
            bindRows(b);
            updateSelection();
          }
        }),
    );
    $("#atlasStatus").textContent = q
      ? matches.length + " matching names · shown in their families"
      : mode === "rotate"
        ? "4 starting points per family"
        : mode === "families"
          ? "All families · expand narrower routes"
          : idx.all.length + " names · alphabetical";
    sourceTags();
    storageStatus();
  }
  localSearch(
    root,
    "genreQuery",
    "Genres",
    "Find a genre or alternative name…",
    () => {
      clearTimeout(queryTimer);
      queryTimer = setTimeout(render, 100);
    },
  );
  $("#genreOrder").onchange = (e) => {
    mode = e.target.value;
    saveSession();
    render();
  };
  $("#reshuffleGenres").onclick = () => {
    newStarting();
    render();
  };
  $("#clearGenres").onclick = () => {
    selected.clear();
    updateSelection();
  };
  $("#customGenreForm").onsubmit = (e) => {
    e.preventDefault();
    const value = $("#customGenre")
      .value.replace(/[\u0000-\u001f]/g, " ")
      .trim();
    if (value && !selected.has(value.toLowerCase())) toggleTag(value);
    $("#customGenre").value = "";
  };
  $("#searchGenres").onclick = () => {
    relatedSeed = null;
    collection = "";
    genre = [...selected];
    $("#query").value = "";
    view("discover");
    showSearchResults();
    search();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  window.slopObserveGenreTags = (items) => {
    for (const d of items)
      for (const tag of tagsOf(d)) {
        if (observed.size < 300) observed.add(tag);
      }
    if (idx && currentView === "genres") {
      sourceTags();
      if (focused) showFocus(focused);
    }
  };
  $("#navGenres").onclick = $("#browseGenres").onclick = () => {
    window.slopObserveGenreTags(docs);
    window.slopObserveGenreTags(
      [...saved.values()].map((t) => ({ subject: t.tags })),
    );
    sourceTags();
    view("genres");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  $("#forgetGenreHistory").onclick = () => {
    memoryRecent = [];
    try {
      localStorage.removeItem(storageKey);
      sessionStorage.removeItem(sessionKey);
    } catch {
      storageOK = false;
    }
    recentInput = [];
    saveSession();
    storageStatus();
    toast("Genre rotation history cleared. Your current view is unchanged.");
  };
  async function load() {
    try {
      const response = await fetch("genres.json?v=1");
      if (!response.ok) throw Error();
      idx = SlopGenres.index(await response.json());
      $("#genreOrder").disabled = false;
      let session;
      try {
        session = read(sessionStorage, sessionKey);
      } catch {
        storageOK = false;
      }
      if (
        session?.version === 1 &&
        typeof session.seed === "string" &&
        session.seed.length > 0 &&
        session.seed.length < 100 &&
        Array.isArray(session.recentInput) &&
        session.recentInput.length <= 200
      ) {
        seed = session.seed;
        recentInput = session.recentInput.filter((x) => idx.byId.has(x));
        starting = SlopGenres.sample(idx, seed, recentInput);
        mode = ["rotate", "families", "alpha"].includes(session.mode)
          ? session.mode
          : "rotate";
      } else newStarting();
      $("#genreOrder").value = mode;
      window.slopObserveGenreTags(docs);
      render();
    } catch {
      $("#atlasStatus").textContent =
        "The directory could not load. Source tags and custom tag search still work.";
      $("#genreOptions").innerHTML =
        '<button id="retryGenres">Retry directory</button>';
      $("#retryGenres").onclick = load;
      $("#reshuffleGenres").disabled = true;
      $("#genreOrder").disabled = true;
    }
  }
  load();
})();
