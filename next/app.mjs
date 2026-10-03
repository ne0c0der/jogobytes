import {
  COLUMN_LABEL,
  COLUMNS,
  STORAGE_KEY,
  addItem,
  emptyBoard,
  moveItem,
  parseBoard,
  removeItem,
  toStaticHtml,
  transferItem,
} from "./board.mjs";

const boardRoot = document.querySelector("#board");
const exportBox = document.querySelector("#export-html");
const copyStatus = document.querySelector("#copy-status");

let board = loadBoard();

function loadBoard() {
  try {
    return parseBoard(localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyBoard();
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch {
    // The board still works until this page is closed.
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function actionButton(action, item, label, disabled) {
  const button = el("button", "ghost", label);
  button.type = "button";
  button.dataset.action = action;
  button.dataset.id = item.id;
  button.disabled = disabled;
  button.setAttribute("aria-label", `${label}: ${item.text}`);
  return button;
}

function renderItem(column, item, index, count) {
  const li = el("li", "item");
  li.dataset.id = item.id;
  li.tabIndex = -1;
  li.append(el("p", "", item.text));
  const actions = el("div", "item-actions");
  actions.append(
    actionButton("up", item, "Up", index === 0),
    actionButton("down", item, "Down", index === count - 1),
  );
  for (const target of COLUMNS) {
    if (target === column) continue;
    const button = actionButton("move", item, `To ${COLUMN_LABEL[target]}`, false);
    button.dataset.target = target;
    actions.append(button);
  }
  actions.append(actionButton("remove", item, "Remove", false));
  li.append(actions);
  return li;
}

function renderItems() {
  for (const column of COLUMNS) {
    const slot = boardRoot.querySelector(`[data-column="${column}"] [data-items]`);
    slot.replaceChildren();
    const items = board[column];
    if (items.length === 0) {
      slot.append(el("p", "empty", "Nothing filed."));
      continue;
    }
    const list = el("ol", "item-list");
    items.forEach((item, index) => list.append(renderItem(column, item, index, items.length)));
    slot.append(list);
  }
  exportBox.value = toStaticHtml(board);
}

function focusItem(id) {
  const item = boardRoot.querySelector(`li[data-id="${CSS.escape(id)}"]`);
  item?.focus();
}

boardRoot.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  const column = form.closest("[data-column]")?.dataset.column;
  const input = form.querySelector("input");
  try {
    board = addItem(board, column, input.value);
  } catch {
    input.setAttribute("aria-invalid", "true");
    input.focus();
    return;
  }
  input.removeAttribute("aria-invalid");
  input.value = "";
  persist();
  renderItems();
  input.focus();
});

boardRoot.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  const column = button.closest("[data-column]")?.dataset.column;
  const id = button.dataset.id;
  const action = button.dataset.action;
  try {
    if (action === "up") board = moveItem(board, column, id, -1);
    else if (action === "down") board = moveItem(board, column, id, 1);
    else if (action === "move") board = transferItem(board, column, id, button.dataset.target);
    else if (action === "remove") board = removeItem(board, column, id);
    else return;
  } catch {
    return;
  }
  persist();
  renderItems();
  if (action === "remove") {
    boardRoot.querySelector(`[data-column="${column}"] input`)?.focus();
    return;
  }
  focusItem(id);
});

document.querySelector("#copy-html").addEventListener("click", async () => {
  const html = toStaticHtml(board);
  exportBox.value = html;
  try {
    await navigator.clipboard.writeText(html);
    copyStatus.textContent = "Copied the HTML block.";
    copyStatus.className = "result ok";
  } catch {
    exportBox.focus();
    exportBox.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    copyStatus.textContent = copied
      ? "Copied the HTML block."
      : "The HTML block is selected. Copy it from the box.";
    copyStatus.className = copied ? "result ok" : "result";
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  board = parseBoard(event.newValue);
  renderItems();
});

renderItems();
persist();
