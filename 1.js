const fs = require("fs");
const path = require("path");

const LOG_PATH = path.join(__dirname, "access.log");

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomIP() {
  return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}`;
}

function randomUA() {
  const uas = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/117.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/16.0 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
    "curl/7.64.1",
    "PostmanRuntime/7.28.4",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
  ];
  return uas[randomInt(0, uas.length - 1)];
}

function formatDate(d) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const day = String(d.getDate()).padStart(2,"0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2,"0");
  const min = String(d.getMinutes()).padStart(2,"0");
  const sec = String(d.getSeconds()).padStart(2,"0");
  return `${day}/${month}/${year}:${hour}:${min}:${sec} +0000`;
}

function makeLine(ip, url, status, ua, date) {
  const method = "GET";
  const size = randomInt(100, 5000);
  const ref = "-";
  return `${ip} - - [${formatDate(date)}] "${method} ${url} HTTP/1.1" ${status} ${size} "${ref}" "${ua}"`;
}

// Нормальні користувачі (з випадковими помилками)
function generateNormal(ip, startDate) {
  const urls = ["/","/home","/about","/contact","/products","/products/123",
                "/api/v1/products","/api/v1/cart","/api/v1/order","/api/v1/login"];
  const lines = [];
  const count = randomInt(150, 400);
  let date = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const url = urls[randomInt(0, urls.length - 1)];

    // Нормальні мають 2% шанс на помилку
    const status = Math.random() < 0.02 ? randomInt(400, 500) : randomInt(200, 302);

    const ua = randomUA();
    date.setSeconds(date.getSeconds() + randomInt(1, 10));
    lines.push(makeLine(ip, url, status, ua, new Date(date)));
  }
  return lines;
}

// Brute force (частково "стелс", не завжди бот)
function generateBruteForce(ip, startDate) {
  const lines = [];
  let date = new Date(startDate);

  for (let i = 0; i < randomInt(200, 500); i++) {
    const url = `/api/v1/login?user=admin&pass=${randomInt(1000, 9999)}`;
    const status = Math.random() < 0.6 ? 401 : 403;

    // 30% шанс що UA буде нормальний (стелс)
    const ua = Math.random() < 0.3 ? randomUA() : "Mozilla/5.0 (MaliciousBot/1.0)";

    date.setSeconds(date.getSeconds() + randomInt(1, 3));
    lines.push(makeLine(ip, url, status, ua, new Date(date)));
  }
  return lines;
}

// Scanning (частково нормальні статуси)
function generateScanning(ip, startDate) {
  const urls = ["/admin", "/api/v1/admin", "/admin/login", "/dashboard", "/config"];
  const lines = [];
  let date = new Date(startDate);

  for (let i = 0; i < randomInt(150, 350); i++) {
    const url = urls[i % urls.length];
    const status = Math.random() < 0.3 ? 403 : 200;
    const ua = Math.random() < 0.5 ? "Mozilla/5.0 (MaliciousScanner/1.0)" : randomUA();
    date.setSeconds(date.getSeconds() + randomInt(1, 3));
    lines.push(makeLine(ip, url, status, ua, new Date(date)));
  }
  return lines;
}

// DDoS (частково помилки 500)
function generateDDoS(ip, startDate) {
  const url = "/api/v1/products";
  const lines = [];
  let date = new Date(startDate);

  for (let i = 0; i < randomInt(500, 900); i++) {
    const status = Math.random() < 0.05 ? 500 : 200;
    const ua = Math.random() < 0.2 ? randomUA() : "Mozilla/5.0 (DDoSBot/1.0)";
    date.setMilliseconds(date.getMilliseconds() + randomInt(20, 80));
    lines.push(makeLine(ip, url, status, ua, new Date(date)));
  }
  return lines;
}

function generateUniqueIP(existingIPs) {
  let ip;
  do {
    ip = randomIP();
  } while (existingIPs.has(ip));
  existingIPs.add(ip);
  return ip;
}

function main() {
  const lines = [];
  const baseDate = new Date("2023-10-10T13:00:00Z");

  const usedIPs = new Set();

  // Нормальні IP (800)
  for (let i = 0; i < 800; i++) {
    const ip = generateUniqueIP(usedIPs);
    lines.push(...generateNormal(ip, baseDate));
  }

  // Атакуючі IP (200)
  for (let i = 0; i < 200; i++) {
    const ip = generateUniqueIP(usedIPs);
    const t = i % 4;
    if (t === 0) lines.push(...generateBruteForce(ip, baseDate));
    if (t === 1) lines.push(...generateScanning(ip, baseDate));
    if (t === 2) lines.push(...generateDDoS(ip, baseDate));
    if (t === 3) lines.push(...generateBruteForce(ip, baseDate));
  }

  fs.writeFileSync(LOG_PATH, lines.join("\n"));
  console.log("🟢 access.log створено!");
}

main();
