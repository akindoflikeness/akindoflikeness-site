const { test } = require("node:test");
const assert = require("node:assert/strict");
const G = require("./genre-directory.js"),
  data = require("./genres.json");
test("directory validates, overlaps remain reachable, aliases resolve", () => {
  const idx = G.index(data);
  assert.ok(idx.all.length > 150);
  assert.ok(idx.descendants.get("electronic").includes("dub-techno"));
  assert.ok(idx.descendants.get("dub-reggae").includes("dub-techno"));
  assert.deepEqual(G.matches(idx, "dnb"), ["drum-and-bass"]);
  assert.ok(G.matches(idx, "musique concrete").includes("musique-concrete"));
});
test("invalid relationships, duplicate identities and cycles fail visibly", () => {
  for (const mutate of [
    (d) => d.genres.push(d.genres[0]),
    (d) => d.genres[0].parents.push("missing"),
    (d) => d.genres[0].parents.push("dark-ambient"),
    (d) => d.genres[1].aliases.push("Ambient"),
    (d) => d.genres[1].related.push("ambient", "ambient"),
  ]) {
    const copy = structuredClone(data);
    mutate(copy);
    assert.throws(() => G.index(copy));
  }
});
test("seed and recent input reproduce a balanced sample without mutating data", () => {
  const idx = G.index(data),
    before = JSON.stringify(data),
    one = G.sample(idx, "seed");
  assert.deepEqual(one, G.sample(idx, "seed"));
  assert.notDeepEqual(one, G.sample(idx, "other"));
  assert.equal(one.length, idx.families.length);
  for (const group of one) {
    assert.equal(group.ids.length, 4);
    assert.equal(new Set(group.ids).size, 4);
    assert.ok(
      group.ids.every((x) => idx.descendants.get(group.family).includes(x)),
    );
  }
  assert.equal(JSON.stringify(data), before);
});
test("fresh candidates precede recent ones, and saturated history favours oldest", () => {
  const small = {
    version: 1,
    families: ["family"],
    genres: [
      {
        id: "family",
        label: "Family",
        aliases: [],
        tag: null,
        parents: [],
        related: [],
        note: "Test",
      },
      ...Array.from({ length: 12 }, (_, i) => ({
        id: "g" + i,
        label: "Genre " + i,
        aliases: [],
        tag: "g" + i,
        parents: ["family"],
        related: [],
        note: "Test",
      })),
    ],
  };
  const idx = G.index(small),
    first = G.sample(idx, "one")[0].ids;
  const next = G.sample(idx, "two", first)[0].ids;
  assert.ok(next.every((x) => !first.includes(x)));
  const all = idx.descendants.get("family");
  assert.deepEqual(
    new Set(G.sample(idx, "three", all)[0].ids),
    new Set(all.slice(0, 4)),
  );
  // Every family gets equal space over many seeds, independent of its size.
  const real = G.index(data);
  for (let i = 0; i < 50; i++)
    assert.ok(G.sample(real, i).every((x) => x.ids.length === 4));
});
