export const STATUS_IDS = ["operational", "degraded", "major_outage", "maintenance"];

export const STATUS_LABEL = {
  operational: "Operational",
  degraded: "Degraded",
  major_outage: "Major outage",
  maintenance: "Maintenance",
};

export const STATUS_SUMMARY = {
  operational: "All systems operational",
  degraded: "Degraded performance",
  major_outage: "Major outage",
  maintenance: "Under maintenance",
};

export const INCIDENT_STATES = ["investigating", "identified", "monitoring", "resolved"];

export const INCIDENT_STATE_LABEL = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

const RANK = {
  operational: 0,
  maintenance: 1,
  degraded: 2,
  major_outage: 3,
};

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function assertStatusData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Status data must be an object.");
  }
  if (!Array.isArray(data.components) || data.components.length === 0) {
    throw new Error("Status data needs at least one component.");
  }
  if (!Array.isArray(data.incidents)) {
    throw new Error("Status data needs an incidents array.");
  }

  const ids = new Set();
  for (const component of data.components) {
    if (!component || typeof component.id !== "string" || typeof component.name !== "string") {
      throw new Error("Each component needs an id and a name.");
    }
    if (!STATUS_IDS.includes(component.status)) {
      throw new Error(`Unknown status for ${component.name}.`);
    }
    if (ids.has(component.id)) throw new Error(`Duplicate component id ${component.id}.`);
    ids.add(component.id);
  }

  for (const incident of data.incidents) {
    if (!incident || typeof incident.id !== "string" || typeof incident.title !== "string") {
      throw new Error("Each incident needs an id and a title.");
    }
    if (!INCIDENT_STATES.includes(incident.state)) {
      throw new Error(`Unknown state for incident ${incident.id}.`);
    }
    if (!Array.isArray(incident.updates) || incident.updates.length === 0) {
      throw new Error(`Incident ${incident.id} needs at least one update.`);
    }
    for (const update of incident.updates) {
      if (!update || typeof update.id !== "string" || typeof update.message !== "string") {
        throw new Error(`Incident ${incident.id} has an update missing an id or message.`);
      }
      if (!INCIDENT_STATES.includes(update.state)) {
        throw new Error(`Unknown state for update ${update.id}.`);
      }
    }
  }

  return data;
}

export function overallStatus(components) {
  let worst = "operational";
  for (const component of components) {
    if (!(component.status in RANK)) throw new Error(`Unknown status: ${component.status}`);
    if (RANK[component.status] > RANK[worst]) worst = component.status;
  }
  return worst;
}

export function changedComponentStatuses(baseline, selected) {
  if (!Array.isArray(baseline) || !Array.isArray(selected)) {
    throw new Error("Component lists must be arrays.");
  }
  const changes = [];
  for (const component of selected) {
    if (!STATUS_IDS.includes(component.status)) {
      throw new Error(`Unknown status: ${component.status}`);
    }
    const previous = baseline.find((item) => item.id === component.id);
    if (!previous) throw new Error(`Unknown component: ${component.id}`);
    if (previous.status !== component.status) {
      changes.push({ id: component.id, status: component.status });
    }
  }
  return changes;
}

export function setComponentStatuses(data, updates) {
  const next = clone(data);
  assertStatusData(next);
  for (const update of updates) {
    if (!STATUS_IDS.includes(update.status)) throw new Error(`Unknown status: ${update.status}`);
    const component = next.components.find((item) => item.id === update.id);
    if (!component) throw new Error(`Unknown component: ${update.id}`);
    component.status = update.status;
  }
  return next;
}

function stampFromDate(now) {
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) throw new Error("Incident time is invalid.");
  const iso = date.toISOString();
  return { iso, stamp: iso.replace(/[-:.]/g, "") };
}

export function publishIncident(data, { title, message, state, now = new Date() }) {
  const next = clone(data);
  assertStatusData(next);
  const cleanTitle = String(title ?? "").trim();
  const cleanMessage = String(message ?? "").trim();
  if (!cleanTitle) throw new Error("Incident title is required.");
  if (!cleanMessage) throw new Error("Incident update is required.");
  if (cleanTitle.length > 120) throw new Error("Incident title must be 120 characters or fewer.");
  if (cleanMessage.length > 2000) throw new Error("Incident update must be 2000 characters or fewer.");
  if (!INCIDENT_STATES.includes(state)) throw new Error("Incident state is required.");

  const { iso, stamp } = stampFromDate(now);
  next.incidents.unshift({
    id: `inc-${stamp}`,
    title: cleanTitle,
    state,
    createdAt: iso,
    updates: [
      {
        id: `upd-${stamp}`,
        state,
        message: cleanMessage,
        publishedAt: iso,
      },
    ],
  });
  next.updatedAt = iso;
  return next;
}

export function touchUpdatedAt(data, now = new Date()) {
  const next = clone(data);
  const { iso } = stampFromDate(now);
  next.updatedAt = iso;
  return next;
}

export function serializeStatus(data) {
  assertStatusData(data);
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function encodeUtf8Base64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeUtf8Base64(content) {
  const binary = atob(String(content).replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function githubPutBody({ message, contentText, sha, branch }) {
  if (!message || !String(message).trim()) throw new Error("Commit message is required.");
  if (!sha) throw new Error("Existing file sha is required.");
  if (!branch) throw new Error("Branch is required.");
  return {
    message,
    content: encodeUtf8Base64(contentText),
    sha,
    branch,
  };
}

export function commitMessage({ previous, next, incidentTitle }) {
  const changes = [];
  for (const component of next.components) {
    const before = previous.components.find((item) => item.id === component.id);
    if (!before || before.status !== component.status) {
      changes.push(`${component.name} ${STATUS_LABEL[component.status].toLowerCase()}`);
    }
  }
  if (incidentTitle) changes.push(`incident: ${incidentTitle.trim()}`);
  const detail = changes.join("; ") || "refresh";
  const message = `status: ${detail}`;
  return message.length > 72 ? `${message.slice(0, 69)}...` : message;
}

export function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso ?? "");
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export function applyOwnerEdit(data, { changes, incident, now = new Date() }) {
  assertStatusData(data);
  if ((!changes || changes.length === 0) && !incident) {
    throw new Error("Nothing to publish.");
  }
  let next = setComponentStatuses(data, changes ?? []);
  if (incident) next = publishIncident(next, { ...incident, now });
  else next = touchUpdatedAt(next, now);
  return next;
}
