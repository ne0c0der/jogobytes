import {
  INCIDENT_STATE_LABEL,
  STATUS_LABEL,
  STATUS_SUMMARY,
  assertStatusData,
  formatTime,
  overallStatus,
} from "./model.mjs";

const root = document.querySelector("#status-root");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function pill(statusOrState, label) {
  return el("span", `pill tone-${statusOrState}`, label);
}

function incidentTone(state) {
  if (state === "resolved") return "operational";
  if (state === "monitoring") return "maintenance";
  if (state === "identified") return "major_outage";
  return "degraded";
}

function render(data) {
  assertStatusData(data);
  const overall = overallStatus(data.components);
  root.replaceChildren();

  const banner = el("section", `banner tone-${overall}`);
  banner.append(
    el("span", "dot", ""),
    el("div", "", ""),
  );
  const bannerText = banner.lastChild;
  bannerText.append(
    el("strong", "", STATUS_SUMMARY[overall]),
    el("p", "meta", `Updated ${formatTime(data.updatedAt)} UTC`),
  );
  root.append(banner);

  root.append(el("h2", "kicker", "Components"));
  const list = el("div", "component-list");
  for (const component of data.components) {
    const row = el("article", "component-row");
    const copy = el("div");
    copy.append(el("p", "name", component.name));
    if (component.description) copy.append(el("p", "meta", component.description));
    row.append(copy, pill(component.status, STATUS_LABEL[component.status]));
    list.append(row);
  }
  root.append(list);

  root.append(el("h2", "kicker", "Incident history"));
  const timeline = el("div", "timeline");
  if (data.incidents.length === 0) {
    timeline.append(el("p", "lede", "No incidents published."));
  }
  const incidents = [...data.incidents].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  for (const incident of incidents) {
    const article = el("article", "incident");
    const top = el("div", "incident-top");
    top.append(el("h3", "", incident.title), pill(incidentTone(incident.state), INCIDENT_STATE_LABEL[incident.state]));
    const updates = el("ol", "updates");
    const ordered = [...incident.updates].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
    for (const update of ordered) {
      const item = el("li");
      item.append(
        el("p", "meta", `${INCIDENT_STATE_LABEL[update.state]} · ${formatTime(update.publishedAt)} UTC`),
        el("p", "", update.message),
      );
      updates.append(item);
    }
    article.append(top, updates);
    timeline.append(article);
  }
  root.append(timeline);
}

async function main() {
  try {
    const response = await fetch("/status/status.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Status file returned ${response.status}.`);
    render(await response.json());
  } catch (error) {
    root.replaceChildren(el("p", "error", error.message || "Could not load status."));
  }
}

main();
