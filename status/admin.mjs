import {
  INCIDENT_STATES,
  INCIDENT_STATE_LABEL,
  STATUS_IDS,
  STATUS_LABEL,
  STATUS_SUMMARY,
  applyOwnerEdit,
  assertStatusData,
  changedComponentStatuses,
  commitMessage,
  decodeUtf8Base64,
  githubPutBody,
  overallStatus,
  serializeStatus,
} from "./model.mjs";

const REPO = "ne0c0der/jogobytes";
const FILE_PATH = "status/status.json";
const BRANCH = "main";
const TOKEN_KEY = "jogobytes.status.token";

const componentsRoot = document.querySelector("#components");
const form = document.querySelector("#publish-form");
const result = document.querySelector("#result");
const preview = document.querySelector("#preview-summary");
const tokenInput = document.querySelector("#token");
const forget = document.querySelector("#forget");

let baseline = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function say(message, kind) {
  result.className = `result ${kind || ""}`.trim();
  result.textContent = message;
}

function selectedComponents() {
  return baseline.components.map((component) => ({
    id: component.id,
    status: form.elements[`status-${component.id}`].value,
  }));
}

function incidentFromForm() {
  const title = form.elements.title.value;
  const message = form.elements.message.value;
  const state = form.elements.state.value;
  if (!title.trim() && !message.trim()) return null;
  return { title, message, state };
}

function renderPreview() {
  if (!baseline) return;
  try {
    const changes = changedComponentStatuses(baseline.components, selectedComponents());
    const incident = incidentFromForm();
    const previewData = incident || changes.length
      ? applyOwnerEdit(baseline, {
          changes,
          incident,
          now: new Date("2026-01-01T00:00:00.000Z"),
        })
      : baseline;
    const overall = overallStatus(previewData.components);
    const parts = [STATUS_SUMMARY[overall]];
    if (changes.length) {
      const names = changes.map((change) => {
        const component = baseline.components.find((item) => item.id === change.id);
        return `${component.name} → ${STATUS_LABEL[change.status]}`;
      });
      parts.push(names.join(", ") + ".");
    }
    if (incident) parts.push(`Incident “${incident.title.trim()}” will be published.`);
    if (!changes.length && !incident) parts.push("No unpublished changes.");
    preview.textContent = parts.join(" ");
    preview.className = `tone-${overall}`;
  } catch (error) {
    preview.textContent = error.message;
    preview.className = "error";
  }
}

function renderComponents() {
  componentsRoot.replaceChildren();
  for (const component of baseline.components) {
    const label = el("label");
    label.append(el("span", "", `${component.name} — ${component.description || component.id}`));
    const select = document.createElement("select");
    select.name = `status-${component.id}`;
    select.id = `status-${component.id}`;
    for (const status of STATUS_IDS) {
      const option = el("option", "", STATUS_LABEL[status]);
      option.value = status;
      if (status === component.status) option.selected = true;
      select.append(option);
    }
    select.addEventListener("change", renderPreview);
    label.append(select);
    componentsRoot.append(label);
  }
  renderPreview();
}

async function loadSameOrigin() {
  const response = await fetch("/status/status.json", { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load /status/status.json (${response.status}).`);
  baseline = assertStatusData(await response.json());
  renderComponents();
  say("Loaded the status currently deployed with this page.", "");
}

function token() {
  return tokenInput.value.trim();
}

async function github(path, { method = "GET", body } = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `GitHub request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

function explainGithubError(error) {
  if (error.status === 401 || error.status === 403) {
    return "GitHub rejected the token. Use a fine-grained token with Contents read and write on ne0c0der/jogobytes.";
  }
  if (error.status === 404) {
    return "status/status.json is not on main yet. Merge the status page PR, then publish.";
  }
  if (error.status === 409) {
    return "Main changed during publish. Reload this page and publish again.";
  }
  return error.message || "Publish failed.";
}

async function reloadFromMain() {
  if (!token()) {
    await loadSameOrigin();
    return;
  }
  const payload = await github(`/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`);
  baseline = assertStatusData(JSON.parse(decodeUtf8Base64(payload.content)));
  renderComponents();
  say("Loaded status/status.json from main.", "ok");
}

async function publish(event) {
  event.preventDefault();
  if (!baseline) return;
  const submit = form.querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    const changes = changedComponentStatuses(baseline.components, selectedComponents());
    const incident = incidentFromForm();
    applyOwnerEdit(baseline, { changes, incident, now: new Date() });
    if (!token()) {
      say("Paste a GitHub token to publish. The preview above is only local.", "error");
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, token());
    const current = await github(`/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`);
    const latest = assertStatusData(JSON.parse(decodeUtf8Base64(current.content)));
    const freshChanges = changedComponentStatuses(baseline.components, selectedComponents());
    const next = applyOwnerEdit(latest, { changes: freshChanges, incident, now: new Date() });
    const contentText = serializeStatus(next);
    const body = githubPutBody({
      message: commitMessage({
        previous: latest,
        next,
        incidentTitle: incident ? incident.title : "",
      }),
      contentText,
      sha: current.sha,
      branch: BRANCH,
    });
    const committed = await github(`/repos/${REPO}/contents/${FILE_PATH}`, { method: "PUT", body });
    baseline = next;
    form.elements.title.value = "";
    form.elements.message.value = "";
    renderComponents();
    const url = committed.commit?.html_url || committed.content?.html_url || "";
    say(
      url
        ? `Published to main. Cloudflare Pages will refresh https://jogobytes.com/status after this deploy: ${url}`
        : "Published to main. Cloudflare Pages will refresh https://jogobytes.com/status.",
      "ok",
    );
  } catch (error) {
    say(explainGithubError(error), "error");
  } finally {
    submit.disabled = false;
  }
}

const saved = sessionStorage.getItem(TOKEN_KEY);
if (saved) tokenInput.value = saved;

for (const state of INCIDENT_STATES) {
  const option = el("option", "", INCIDENT_STATE_LABEL[state]);
  option.value = state;
  if (state === "investigating") option.selected = true;
  form.elements.state.append(option);
}

form.elements.title.addEventListener("input", renderPreview);
form.elements.message.addEventListener("input", renderPreview);
form.elements.state.addEventListener("change", renderPreview);
form.addEventListener("submit", publish);
forget.addEventListener("click", () => {
  tokenInput.value = "";
  sessionStorage.removeItem(TOKEN_KEY);
  say("Token removed from this tab.", "");
});
document.querySelector("#reload").addEventListener("click", () => {
  reloadFromMain().catch((error) => say(explainGithubError(error), "error"));
});

loadSameOrigin().catch((error) => {
  say(error.message || "Could not load status.", "error");
  preview.textContent = "Status file did not load.";
});
