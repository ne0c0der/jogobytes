import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyOwnerEdit,
  assertStatusData,
  changedComponentStatuses,
  commitMessage,
  decodeUtf8Base64,
  encodeUtf8Base64,
  githubPutBody,
  overallStatus,
  serializeStatus,
} from "./model.mjs";

const seed = JSON.parse(readFileSync(new URL("./status.json", import.meta.url), "utf8"));

test("seeded status file is public-ready", () => {
  assertStatusData(seed);
  assert.equal(overallStatus(seed.components), "operational");
  assert.ok(seed.incidents.length >= 1);
  assert.equal(seed.incidents[0].title, "Public status page opened");
  assert.ok(seed.incidents[0].updates[0].message.length > 0);
});

test("overall status follows the worst component", () => {
  assert.equal(overallStatus([{ status: "operational" }, { status: "maintenance" }]), "maintenance");
  assert.equal(overallStatus([{ status: "maintenance" }, { status: "degraded" }]), "degraded");
  assert.equal(
    overallStatus([{ status: "degraded" }, { status: "major_outage" }, { status: "maintenance" }]),
    "major_outage",
  );
});

test("owner edit changes only selected components and publishes one incident", () => {
  const changes = changedComponentStatuses(seed.components, [
    { id: "website", status: "operational" },
    { id: "api", status: "degraded" },
    { id: "builds", status: "operational" },
  ]);
  assert.deepEqual(changes, [{ id: "api", status: "degraded" }]);

  const now = new Date("2026-10-02T22:15:30.000Z");
  const next = applyOwnerEdit(seed, {
    changes,
    incident: {
      title: "API latency",
      message: "API responses are slow. Website and Builds are unaffected.",
      state: "investigating",
    },
    now,
  });

  assert.equal(next.components.find((item) => item.id === "api").status, "degraded");
  assert.equal(next.components.find((item) => item.id === "website").status, "operational");
  assert.equal(seed.components.find((item) => item.id === "api").status, "operational");
  assert.equal(next.incidents[0].title, "API latency");
  assert.equal(next.incidents[0].state, "investigating");
  assert.equal(next.incidents[0].updates[0].message.includes("slow"), true);
  assert.equal(next.incidents[1].title, "Public status page opened");
  assert.equal(next.updatedAt, "2026-10-02T22:15:30.000Z");
  assert.equal(overallStatus(next.components), "degraded");
});

test("status-only publish does not invent an incident", () => {
  const next = applyOwnerEdit(seed, {
    changes: [{ id: "builds", status: "maintenance" }],
    now: new Date("2026-10-03T00:00:00.000Z"),
  });
  assert.equal(next.incidents.length, seed.incidents.length);
  assert.equal(next.components.find((item) => item.id === "builds").status, "maintenance");
  assert.equal(next.updatedAt, "2026-10-03T00:00:00.000Z");
});

test("empty publish and bad incidents are rejected", () => {
  assert.throws(() => applyOwnerEdit(seed, { changes: [] }), /Nothing to publish/);
  assert.throws(
    () =>
      applyOwnerEdit(seed, {
        changes: [],
        incident: { title: " ", message: "Update", state: "investigating" },
      }),
    /title is required/,
  );
  assert.throws(() => changedComponentStatuses(seed.components, [{ id: "missing", status: "operational" }]), /Unknown component/);
});

test("github payload round-trips the status file", () => {
  const contentText = serializeStatus(seed);
  assert.ok(contentText.endsWith("\n"));
  const body = githubPutBody({
    message: "status: API degraded",
    contentText,
    sha: "abc123",
    branch: "main",
  });
  assert.equal(body.branch, "main");
  assert.equal(body.sha, "abc123");
  assert.equal(decodeUtf8Base64(body.content), contentText);
  assert.equal(decodeUtf8Base64(encodeUtf8Base64("café")), "café");
  assert.throws(() => githubPutBody({ message: "status", contentText, sha: "", branch: "main" }), /sha/);
});

test("commit message names the owner change and stays short", () => {
  const next = applyOwnerEdit(seed, {
    changes: [{ id: "api", status: "degraded" }],
    incident: { title: "API latency", message: "Slow responses.", state: "monitoring" },
    now: new Date("2026-10-02T22:15:30.000Z"),
  });
  const message = commitMessage({ previous: seed, next, incidentTitle: "API latency" });
  assert.match(message, /^status: API degraded; incident: API latency$/);

  const long = commitMessage({
    previous: seed,
    next,
    incidentTitle: "A".repeat(80),
  });
  assert.ok(long.length <= 72);
  assert.ok(long.endsWith("..."));
});
