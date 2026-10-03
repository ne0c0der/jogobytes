export const COLUMNS = ["now", "next", "later"];

export const COLUMN_LABEL = {
  now: "Now",
  next: "Next",
  later: "Later",
};

export const STORAGE_KEY = "jogobytes.next.board";

export const MAX_TEXT = 280;

export function emptyBoard() {
  return { now: [], next: [], later: [] };
}

export function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function cleanText(value) {
  if (typeof value !== "string") return "";
  const text = value.replace(/\s+/g, " ").trim();
  if (!text) return "";
  return [...text].slice(0, MAX_TEXT).join("");
}

function assertColumn(column) {
  if (!COLUMNS.includes(column)) throw new Error("Unknown column.");
}

export function parseBoard(raw) {
  if (raw == null || raw === "") return emptyBoard();
  if (typeof raw === "string") {
    try {
      return normalizeBoard(JSON.parse(raw));
    } catch {
      return emptyBoard();
    }
  }
  return normalizeBoard(raw);
}

export function normalizeBoard(data) {
  const board = emptyBoard();
  if (!data || typeof data !== "object" || Array.isArray(data)) return board;
  const seen = new Set();
  for (const column of COLUMNS) {
    if (!Array.isArray(data[column])) continue;
    for (const item of data[column]) {
      const text = cleanText(typeof item === "string" ? item : item?.text);
      if (!text) continue;
      let id = "";
      if (item && typeof item === "object" && typeof item.id === "string") id = item.id.trim();
      if (!id || seen.has(id)) id = newId();
      seen.add(id);
      board[column].push({ id, text });
    }
  }
  return board;
}

export function addItem(board, column, text, id) {
  assertColumn(column);
  const cleaned = cleanText(text);
  if (!cleaned) throw new Error("Write an item before adding it.");
  const next = normalizeBoard(board);
  const seen = new Set(COLUMNS.flatMap((name) => next[name].map((item) => item.id)));
  let itemId = typeof id === "string" ? id.trim() : "";
  if (!itemId || seen.has(itemId)) itemId = newId();
  next[column].push({ id: itemId, text: cleaned });
  return next;
}

export function removeItem(board, column, id) {
  assertColumn(column);
  const next = normalizeBoard(board);
  const kept = next[column].filter((item) => item.id !== id);
  if (kept.length === next[column].length) throw new Error("Item not found.");
  next[column] = kept;
  return next;
}

export function moveItem(board, column, id, direction) {
  assertColumn(column);
  if (direction !== -1 && direction !== 1) throw new Error("Direction must be -1 or 1.");
  const next = normalizeBoard(board);
  const items = next[column];
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Item not found.");
  const target = index + direction;
  if (target < 0 || target >= items.length) return next;
  const [item] = items.splice(index, 1);
  items.splice(target, 0, item);
  return next;
}

export function transferItem(board, from, id, to) {
  assertColumn(from);
  assertColumn(to);
  const next = normalizeBoard(board);
  if (from === to) return next;
  const index = next[from].findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Item not found.");
  const [item] = next[from].splice(index, 1);
  next[to].push(item);
  return next;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function toStaticHtml(board) {
  const safe = normalizeBoard(board);
  const columns = COLUMNS.map((column) => {
    const items = safe[column];
    const list = items.length
      ? `\n${items.map((item) => `      <li>${escapeHtml(item.text)}</li>`).join("\n")}\n    `
      : "";
    return `  <section class="next-column">\n    <h2>${COLUMN_LABEL[column]}</h2>\n    <ol>${list}</ol>\n  </section>`;
  }).join("\n");
  return `<section class="next-board" aria-label="Now, Next, and Later">\n${columns}\n</section>\n`;
}
