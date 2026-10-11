(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SlopGenres = api;
})(globalThis, () => {
  "use strict";
  const normal = (s) =>
    String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  function index(data) {
    if (
      data?.version !== 1 ||
      !Array.isArray(data.genres) ||
      !Array.isArray(data.families)
    )
      throw Error("Unsupported genre directory.");
    const byId = new Map(),
      names = new Map(),
      children = new Map();
    for (const g of data.genres) {
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(g.id) ||
        byId.has(g.id) ||
        typeof g.label !== "string" ||
        !g.label.trim() ||
        typeof g.note !== "string" ||
        !g.note.trim() ||
        !Array.isArray(g.parents) ||
        !Array.isArray(g.related) ||
        !Array.isArray(g.aliases) ||
        !(g.tag === null || (typeof g.tag === "string" && g.tag.trim()))
      )
        throw Error("Invalid or duplicate genre: " + g.id);
      if (new Set(g.aliases).size !== g.aliases.length)
        throw Error("Duplicate alias: " + g.id);
      byId.set(g.id, g);
      children.set(g.id, []);
      for (const label of [g.label, ...g.aliases]) {
        if (typeof label !== "string" || !label.trim())
          throw Error("Invalid alias");
        const key = normal(label);
        if (names.has(key) && names.get(key) !== g.id)
          throw Error("Ambiguous name: " + label);
        names.set(key, g.id);
      }
    }
    for (const g of byId.values())
      for (const kind of ["parents", "related"]) {
        if (new Set(g[kind]).size !== g[kind].length)
          throw Error("Duplicate relationship: " + g.id);
        for (const id of g[kind]) {
          if (!byId.has(id) || id === g.id)
            throw Error("Broken relationship: " + g.id);
          if (kind === "parents") children.get(id).push(g.id);
        }
      }
    const done = new Set(),
      visiting = new Set();
    function visit(id) {
      if (visiting.has(id)) throw Error("Cyclic parent routes");
      if (done.has(id)) return;
      visiting.add(id);
      byId.get(id).parents.forEach(visit);
      visiting.delete(id);
      done.add(id);
    }
    byId.forEach((g) => visit(g.id));
    if (
      new Set(data.families).size !== data.families.length ||
      data.families.some((id) => !byId.has(id))
    )
      throw Error("Invalid families");
    const compare = (a, b) =>
      byId.get(a).label.localeCompare(byId.get(b).label, "en");
    const descendants = new Map();
    function below(id) {
      if (descendants.has(id)) return descendants.get(id);
      const ids = new Set();
      for (const child of children.get(id)) {
        ids.add(child);
        below(child).forEach((x) => ids.add(x));
      }
      const result = [...ids].sort(compare);
      descendants.set(id, result);
      return result;
    }
    byId.forEach((g) => below(g.id));
    const reachable = new Set(
      data.families.flatMap((id) => [id, ...below(id)]),
    );
    if (reachable.size !== byId.size) throw Error("Genre has no family route");
    return {
      byId,
      names,
      children,
      descendants,
      families: [...data.families],
      compare,
      all: [...byId.keys()].sort(compare),
    };
  }
  function rng(seed) {
    let a = 2166136261;
    for (const c of String(seed)) {
      a ^= c.charCodeAt(0);
      a = Math.imul(a, 16777619);
    }
    return () => {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(ids, random) {
    const a = [...ids];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // Equal quotas per family; fresh entries first, then recent entries if needed.
  function sample(idx, seed, recent = [], limit = 4) {
    const random = rng(seed),
      old = new Set(recent),
      age = new Map(recent.map((id, i) => [id, i])),
      used = new Set(),
      result = [];
    for (const family of shuffle(idx.families, random)) {
      const pool = shuffle(idx.descendants.get(family), random);
      const ordered = [
        ...pool.filter((x) => !old.has(x) && !used.has(x)),
        ...pool
          .filter((x) => old.has(x) && !used.has(x))
          .sort((a, b) => age.get(a) - age.get(b)),
        ...pool.filter((x) => used.has(x)),
      ];
      const ids = ordered.slice(0, Math.max(0, limit));
      ids.forEach((x) => used.add(x));
      result.push({ family, ids });
    }
    return result;
  }
  function matches(idx, term) {
    const q = normal(term);
    return idx.all.filter((id) => {
      const g = idx.byId.get(id);
      return [g.label, ...g.aliases].some((s) => normal(s).includes(q));
    });
  }
  return { index, normal, rng, shuffle, sample, matches };
});
