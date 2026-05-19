const fs = require("fs");
const readline = require("readline");

const fileStream = fs.createReadStream("access.log");

const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity,
});

const ipStats = {};

rl.on("line", (line) => {
  const ipMatch = line.match(/^(\d+\.\d+\.\d+\.\d+)/);
  if (!ipMatch) return;
  const ip = ipMatch[1];

  const endpointMatch = line.match(/"GET\s+([^"]+)\s+HTTP\/[0-9.]+"/);
  if (!endpointMatch) return;
  const endpoint = endpointMatch[1];

  const statusMatch = line.match(/"\s+(\d{3})\s+\d+\s+"/);
  if (!statusMatch) return;
  const status = parseInt(statusMatch[1]);

  const uaMatch = line.match(/"([^"]+)"\s*$/);
  const ua = uaMatch ? uaMatch[1] : "";

  if (!ipStats[ip]) {
    ipStats[ip] = {
      requests: 0,
      endpoints: new Set(),
      errors: 0,
      uaLen: 0,
      adminHits: 0,
    };
  }

  const s = ipStats[ip];
  s.requests++;
  s.endpoints.add(endpoint);
  if (status >= 400) s.errors++;
  if (endpoint.includes("/admin") || endpoint.includes("/login")) s.adminHits++;
  s.uaLen = ua.length;
});

rl.on("close", () => {
  const rows = [];

  for (const ip in ipStats) {
    const s = ipStats[ip];
    const requestRate = s.requests;
    const uniqueEndpoints = s.endpoints.size;
    const errorRate = s.errors / s.requests;
    const uaLen = s.uaLen;
    const adminHits = s.adminHits;

    // М'якший критерій label
    const isAttack =
      (requestRate > 700 && errorRate > 0.2) ||
      (adminHits > 20 && errorRate > 0.1) ||
      (requestRate > 500 && adminHits > 10) ||
      Math.random() < 0.05; // 5% випадкових помилок

    rows.push({
      ip,
      requestRate,
      uniqueEndpoints,
      errorRate,
      uaLen,
      adminHits,
      label: isAttack ? 1 : 0,
    });
  }

  const csv =
    "ip,requestRate,uniqueEndpoints,errorRate,uaLen,adminHits,label\n" +
    rows
      .map((r) =>
        `${r.ip},${r.requestRate},${r.uniqueEndpoints},${r.errorRate.toFixed(3)},${r.uaLen},${r.adminHits},${r.label}`
      )
      .join("\n");

  fs.writeFileSync("dataset.csv", csv);
  console.log("🟢 dataset.csv створено!");
});
