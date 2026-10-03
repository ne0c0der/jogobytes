import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  addItem,
  emptyBoard,
  moveItem,
  normalizeBoard,
  parseBoard,
  removeItem,
  toStaticHtml,
  transferItem,
} from "./board.mjs";

const page = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("./app.mjs", import.meta.url), "utf8");
const css = readFileSync(new URL("./next.css", import.meta.url), "utf8");
const home = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const headers = readFileSync(new URL("../_headers", import.meta.url), "utf8");

test("a new board is three empty columns and has no sample items", () => {
  const board = emptyBoard();
  assert.deepEqual(board, { now: [], next: [], later: [] });
  assert.equal(toStaticHtml(board).includes("<li>"), false);
});

test("adding trims text and does not mutate the previous board", () => {
  const board = emptyBoard();
  const next = addItem(board, "now", "  Ship the page  ", "a");
  assert.equal(board.now.length, 0);
  assert.deepEqual(next.now, [{ id: "a", text: "Ship the page" }]);
});

test("blank items are refused", () => {
  assert.throws(() => addItem(emptyBoard(), "next", "   "), /Write an item/);
});

test("reorder swaps within a column and stops at the ends", () => {
  let board = addItem(emptyBoard(), "now", "First", "a");
  board = addItem(board, "now", "Second", "b");
  board = addItem(board, "now", "Third", "c");
  board = moveItem(board, "now", "c", -1);
  assert.deepEqual(board.now.map((item) => item.id), ["a", "c", "b"]);
  const topped = moveItem(board, "now", "a", -1);
  assert.deepEqual(topped.now.map((item) => item.id), ["a", "c", "b"]);
  const bottomed = moveItem(board, "now", "b", 1);
  assert.deepEqual(bottomed.now.map((item) => item.id), ["a", "c", "b"]);
});

test("items can move to another column and can be removed", () => {
  let board = addItem(emptyBoard(), "later", "Wait", "a");
  board = transferItem(board, "later", "a", "next");
  assert.deepEqual(board.later, []);
  assert.equal(board.next[0].text, "Wait");
  board = removeItem(board, "next", "a");
  assert.deepEqual(board, emptyBoard());
});

test("stored junk never becomes sample items", () => {
  assert.deepEqual(parseBoard(null), emptyBoard());
  assert.deepEqual(parseBoard(""), emptyBoard());
  assert.deepEqual(parseBoard("{"), emptyBoard());
  assert.deepEqual(parseBoard("null"), emptyBoard());
  assert.deepEqual(parseBoard([]), emptyBoard());
  assert.deepEqual(parseBoard({ now: ["  ", { text: "" }, { id: "ok", text: " Kept " }] }), {
    now: [{ id: "ok", text: "Kept" }],
    next: [],
    later: [],
  });
});

test("export is one static block with escaped text and all three columns", () => {
  const html = toStaticHtml({
    now: [{ id: "a", text: "Ship it" }],
    next: [],
    later: [{ id: "b", text: `A <tag> & "quote"` }],
  });
  assert.equal(
    html,
    `<section class="next-board" aria-label="Now, Next, and Later">
  <section class="next-column">
    <h2>Now</h2>
    <ol>
      <li>Ship it</li>
    </ol>
  </section>
  <section class="next-column">
    <h2>Next</h2>
    <ol></ol>
  </section>
  <section class="next-column">
    <h2>Later</h2>
    <ol>
      <li>A &lt;tag&gt; &amp; &quot;quote&quot;</li>
    </ol>
  </section>
</section>
`,
  );
  assert.equal(html.includes("<script"), false);
});

test("normalize drops unknown columns and keeps column order", () => {
  const board = normalizeBoard({
    later: [{ id: "l", text: "Later item" }],
    extra: [{ id: "x", text: "Nope" }],
    now: [{ id: "n", text: "Now item" }],
  });
  assert.deepEqual(Object.keys(board), ["now", "next", "later"]);
  assert.equal(board.now[0].text, "Now item");
  assert.deepEqual(board.next, []);
  assert.equal(board.later[0].text, "Later item");
});

test("the page is a local file with three columns and no remote code", () => {
  assert.match(page, /href="\/next\/next\.css"/);
  assert.match(page, /src="\/next\/app\.mjs"/);
  assert.match(page, /data-column="now"/);
  assert.match(page, /data-column="next"/);
  assert.match(page, /data-column="later"/);
  assert.equal(page.includes("cdn."), false);
  assert.equal(page.includes("http://"), false);
  assert.equal((page.match(/https:\/\//g) || []).length, 1);
  assert.match(page, /https:\/\/jogobytes\.com\/next/);
  assert.equal(app.includes("fetch("), false);
  assert.equal(app.includes("indexedDB"), false);
  assert.match(app, /localStorage/);
  assert.equal(css.includes("http"), false);
  assert.match(headers, /\/next\/\*\.mjs/);
  assert.match(home, /href="\/next"/);
});

test("public copy stays off excluded topics", () => {
  const blob = `${page}\n${app}\n${css}\n${readFileSync(new URL("./board.mjs", import.meta.url), "utf8")}`;
  assert.equal(/injection|molding|moulding|plant floor|shop floor|press release/i.test(blob), false);
});
