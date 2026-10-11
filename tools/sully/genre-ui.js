"use strict";
// UI state is separate from the portable music library and the directory data.
(() => {
  const root = document.createElement("section");
  root.id = "genres";
  root.hidden = true;
  root.innerHTML = `<div id="genreBrowseHeader"><h1>Genres</h1>
 <div class="atlasToolbar"><div class="genreModes" role="group" aria-label="Directory display"><button data-genre-mode="rotate" aria-pressed="true">Starting Points</button><button data-genre-mode="families" aria-pressed="false">All Families</button><button data-genre-mode="alpha" aria-pressed="false">A–Z</button></div><label class="genreOrderLabel" for="genreOrder">Display</label><select id="genreOrder" disabled><option value="rotate">Starting Points</option><option value="families">All Families</option><option value="alpha">A–Z</option></select><button id="reshuffleGenres" disabled>Reshuffle</button></div>
 <p class="atlasNote">Explore a genre, or select + to filter.</p></div>
 <div id="genreWorkspace"><div id="genreBrowse" tabindex="-1" aria-label="Genre directory"><div id="atlasStatus" role="status">Loading the directory…</div><div id="genreOptions" class="genreAtlas"></div>
 <details id="sourceTagPanel" class="sourceTagPanel"><summary>Other Tags</summary><p>Tags from your results and library. Availability varies.</p><form id="customGenreForm"><label for="customGenre">Add an Archive Tag</label><input id="customGenre" maxlength="200" required placeholder="An exact tag or local scene name"><button>Add Tag</button></form><div id="sourceGenres"></div></details>
 <details class="atlasMethod"><summary>About This Directory</summary><p>Genres can belong to several families. A dot marks a tag found in your loaded results; playback availability varies.</p><p>Four entries per family, shuffled locally. Recently shown names are passed over where alternatives exist. Your arrangement stays put during this visit; Reshuffle changes it. Complete families and A–Z always include every directory entry.</p><p id="atlasStorage"></p><p>Seed: <code id="genreSeed"></code>. Selection history stays on this device and stores genre identifiers only.</p><button id="forgetGenreHistory">Reset Suggestions</button><p><a href="genres.json">Genre Data</a> · <a href="GENRES.md">Maintenance Guide</a></p></details></div><section id="genreFocus" class="genreFocus" hidden aria-label="Genre connections" tabindex="-1"></section></div>
 <div class="atlasSelection"><button id="genreSelectionToggle" aria-expanded="false" aria-controls="genreSelectedPanel"><output id="genreCount" aria-live="polite">0 genres selected</output></button><div id="genreSelectedPanel"><div id="selectedGenres"></div><button id="clearGenres">Clear All</button></div><button id="searchGenres" class="primary" disabled>Find Recordings</button><small>Matches any selected tag · subgenres are separate</small></div>`;
  $("#discover").after(root);
  let idx = null,
    seed = "",
    recentInput = [],
    starting = [],
    mode = "rotate",
    focused = null,
    queryTimer,
    returnFocus = null;
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
  function addControl(tag, label, full = false) {
    return `<button class="${full ? "genreFilterAction" : "genreAdd"}" data-add-tag="${esc(tag)}" ${full ? 'data-full-label="true"' : ""} aria-label="Add ${esc(label)}" aria-pressed="${selected.has(tag)}"><span>${selected.has(tag) ? "✓" : "+"}</span></button>`;
  }
  function row(id, path, branches = true) {
    const g = idx.byId.get(id),
      tag = g.tag;
    const kids = idx.children.get(id);
    const route = path + "/" + id;
    return `<div class="atlasNode"><div class="atlasRow"><button class="genreName" data-explore="${id}" ${focused === id ? 'aria-current="true"' : ""}>${esc(g.label)}</button>${seen(g) ? '<span class="tagSeen" title="Tag seen in loaded metadata; playback unverified" aria-label="Tag seen in loaded metadata">•</span>' : ""}${tag ? addControl(tag, g.label) : ""}</div>${branches && kids.length ? `<details class="genreBranch" data-route="${esc(route)}" data-parent="${id}" ${openRoutes.has(route) ? "open" : ""}><summary>${kids.length} narrower ${kids.length === 1 ? "route" : "routes"}</summary><div class="branchChildren">${openRoutes.has(route) ? kids.map((c) => row(c, route)).join("") : ""}</div></details>` : ""}</div>`;
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
    const previousFocus = document.activeElement;
    const count = selected.size;
    $("#genreCount").textContent =
      count + (count === 1 ? " genre selected" : " genres selected");
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
    $("#clearGenres").disabled = !count;
    if (previousFocus?.dataset.removeTag && !previousFocus.isConnected)
      $("#genreSelectionToggle").focus();
    root.querySelectorAll("[data-add-tag]").forEach((b) => {
      const on = selected.has(b.dataset.addTag);
      b.innerHTML = b.dataset.fullLabel
        ? on
          ? "✓ Added to filters"
          : "+ Add to filters"
        : `<span>${on ? "✓" : "+"}</span>`;
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
    if (!ids.length) return "";
    return `<div class="genreRelations"><h3>${title}</h3>${ids.map((id) => row(id, "related", false)).join("")}</div>`;
  }
  function closeFocus(restore = true) {
    $("#genreFocus").hidden = true;
    $("#genreBrowse").hidden = false;
    root.classList.remove("isExploring");
    focused = null;
    if (restore)
      (returnFocus?.isConnected ? returnFocus : $("#genreQuery")).focus({
        preventScroll: true,
      });
  }
  function showFocus(id, move = false) {
    if (!focused) returnFocus = document.activeElement;
    focused = id;
    const g = idx.byId.get(id),
      panel = $("#genreFocus");
    const panelScroll =
      panel.querySelector(".genreDetailScroll")?.scrollTop || 0;
    root.classList.add("isExploring");
    $("#genreBrowse").hidden = true;
    panel.hidden = false;
    const context = g.parents.length ? g.parents : [id];
    panel.innerHTML = `<button id="closeGenreFocus">‹ Back to Directory</button><h1>Genre Connections</h1><div class="genreDetailScroll" tabindex="0" aria-label="Genre relationships"><div class="genreContext">${context
      .map(
        (parent) =>
          `<h2>${esc(idx.byId.get(parent).label)}</h2>${idx.children
            .get(parent)
            .map((child) => row(child, "context", false))
            .join("")}`,
      )
      .join(
        "",
      )}</div><div class="genreDetail"><h2 tabindex="-1" id="genreDetailTitle">${esc(g.label)}</h2><p>${esc(g.note)}</p>${g.aliases.length ? `<p>Also called: ${g.aliases.map(esc).join(" · ")}</p>` : ""}${relation("Found Under", g.parents)}${relation("Narrower Styles", idx.children.get(id))}${relation("Related Styles", g.related)}${g.tag ? addControl(g.tag, g.label, true) : '<p class="dim">This is a browsing family, not an Archive tag.</p>'}<p class="genreAvailability">${seen(g) ? "Tag seen in loaded metadata. Playable recordings have not been verified." : "Recording availability not checked."}</p></div></div>`;
    bindRows(panel);
    updateSelection();
    $("#closeGenreFocus").onclick = () => closeFocus();
    panel.querySelector(".genreDetailScroll").scrollTop = move
      ? 0
      : panelScroll;
    if (move) $("#genreDetailTitle").focus({ preventScroll: true });
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
    closeFocus(false);
    const q = $("#genreQuery").value.trim(),
      matches = q ? SlopGenres.matches(idx, q) : null,
      box = $("#genreOptions");
    $("#reshuffleGenres").disabled = mode !== "rotate" || !!q;
    $("#genreSeed").textContent = seed;
    let html = "";
    if (mode === "alpha" && !q)
      html = `<section class="atlasAlphabet"><h2>All ${idx.all.length} Names</h2><div>${idx.all.map((id) => row(id, "alphabet")).join("")}</div></section>`;
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
        html += `<section class="atlasFamily"><h2><button data-explore="${family.id}">${esc(family.label)}</button></h2><div>${ids.map((id) => row(id, group.family, mode !== "rotate" || !!q)).join("")}</div>${!q && mode === "rotate" ? `<details class="familyRest" data-family="${group.family}"><summary>Explore family · ${idx.descendants.get(group.family).length} names</summary><div></div></details>` : ""}</section>`;
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
          ? "All Families · expand narrower routes"
          : idx.all.length + " names · alphabetical";
    sourceTags();
    storageStatus();
    root.querySelectorAll("[data-genre-mode]").forEach((b) => {
      b.disabled = !idx;
      b.setAttribute("aria-pressed", String(b.dataset.genreMode === mode));
    });
  }
  localSearch(
    $("#genreBrowseHeader"),
    "genreQuery",
    "Genres",
    "Find a genre or alternative name…",
    () => {
      clearTimeout(queryTimer);
      queryTimer = setTimeout(render, 100);
    },
  );
  $("#genreBrowseHeader h1").after($("#genreBrowseHeader .contextualSearch"));
  root.querySelectorAll("[data-genre-mode]").forEach((b) => {
    b.disabled = true;
    b.onclick = () => {
      $("#genreOrder").value = b.dataset.genreMode;
      $("#genreOrder").dispatchEvent(new Event("change"));
    };
  });
  $("#genreSelectionToggle").onclick = () => {
    const open =
      $("#genreSelectionToggle").getAttribute("aria-expanded") !== "true";
    $("#genreSelectionToggle").setAttribute("aria-expanded", String(open));
    $("#genreSelectedPanel").classList.toggle("isOpen", open);
  };
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if ($("#genreSelectedPanel").classList.contains("isOpen")) {
        $("#genreSelectionToggle").click();
        $("#genreSelectionToggle").focus();
      } else if (focused) closeFocus();
    }
  });
  const previousViewChanged = window.slopViewChanged;
  window.slopViewChanged = (name) => {
    previousViewChanged?.(name);
    document.body.classList.toggle("genreView", name === "genres");
  };
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
      if (focused)
        $("#genreFocus .genreAvailability").textContent = seen(
          idx.byId.get(focused),
        )
          ? "Tag seen in loaded metadata. Playable recordings have not been verified."
          : "Recording availability not checked.";
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
