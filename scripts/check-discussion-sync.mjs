import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(path.resolve("solid/components/DiscussionWidget.jsx"), "utf8");
const entitySource = fs.readFileSync(path.resolve("base44/entities/DiscussionTopic.jsonc"), "utf8");
const entity = JSON.parse(entitySource);

const requiredSourceContracts = [
  ["realtime topic subscription", "DiscussionTopic.subscribe"],
  ["fallback polling", "refetchInterval: 15000"],
  ["reconnect refresh", "refetchOnReconnect: true"],
  ["immediate local cache update", "mergeTopicIntoCache"],
  ["stable request id", "saveRequestSignature"],
  ["ambiguous-write confirmation", "filter({ save_request_id: requestId }"],
  ["draft-preserving error", "your text is still here"],
];

for (const [label, contract] of requiredSourceContracts) {
  if (!source.includes(contract)) {
    throw new Error(`Discussion sync contract missing ${label}: ${contract}`);
  }
}

if (entity.properties?.save_request_id?.type !== "string") {
  throw new Error("DiscussionTopic must keep the save_request_id idempotency field");
}

if (!source.includes("onCleanup(() =>") || !source.includes("unsubscribe?.()")) {
  throw new Error("Discussion realtime subscription must be cleaned up when the widget unmounts");
}

console.log(`Discussion sync: ${requiredSourceContracts.length + 2} reliability contracts passed.`);
