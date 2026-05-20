const http = require("http");

const CONFIG = {
  host: "localhost",
  port: 80,
  timeout: 2000,
};

const SCENARIOS = {
  LEGITIMATE: {
    name: "Нормальний трафік",
    ip: "5.5.5.5",
    count: 10,
    paths: ["/"],
    method: "GET",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0",
  },

  SCANNER: {
    name: "Сканування",
    ip: "1.1.1.1",
    count: 15,
    paths: [
      "/admin",
      "/.env",
      "/wp-admin",
      "/phpmyadmin",
      "/config.php",
      "/.git/config",
    ],
    method: "GET",
  },

  BRUTE_FORCER: {
    name: "Брутфорс",
    ip: "2.2.2.2",
    path: "/login",
    count: 20,
    method: "POST",
  },

  BAD_BOT: {
    name: "Атака ботів",
    ip: "4.4.4.4",
    count: 10,
    paths: ["/api/data?id=1' OR '1'='1", "/users?id=1;DROP TABLE users"],
    method: "GET",
    ua: "sqlmap/1.4.12#stable",
  },

  DDoS_BOT: {
    name: "L7 DDoS",
    ip: "3.3.3.3",
    count: 100,
    paths: ["/", "/home", "/catalog"],
    method: "GET",
    isParallel: true,
  },
};

async function sendRequest(scenario, i) {
  let targetPath = scenario.paths
    ? scenario.paths[i % scenario.paths.length]
    : scenario.path;

  const encodedPath = encodeURI(targetPath);

  return new Promise((resolve) => {
    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: encodedPath,
      method: scenario.method || "GET",
      headers: {
        "X-Forwarded-For": scenario.ip,
        "User-Agent":
          scenario.ua ||
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: CONFIG.timeout,
    };

    const req = http.request(options, (res) => {
      res.on("data", () => {});
      res.on("end", () => resolve(res.statusCode));
    });

    req.on("error", (e) => {
      resolve("BLOCKED");
    });

    req.on("timeout", () => {
      req.destroy();
      resolve("TIMEOUT");
    });

    if (scenario.method === "POST") {
      req.write(`username=admin&password=wrong_pass_${i}`);
    }
    req.end();
  });
}

async function runAll() {
  for (const s of Object.values(SCENARIOS)) {
    console.log(`\nАтака: ${s.name}`);

    if (s.isParallel) {
      const promises = Array.from({ length: s.count }).map((_, i) =>
        sendRequest(s, i),
      );
      await Promise.all(promises);
    } else {
      for (let i = 0; i < s.count; i++) {
        await sendRequest(s, i);
      }
    }

    await new Promise((r) => setTimeout(r, 1500));
  }
}

runAll().catch(console.error);
