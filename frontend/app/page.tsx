"use client";

import socket from "@/socket";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  BarChart,
  CartesianGrid,
  Bar,
  YAxis,
  XAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts";

import { IStats } from "@/types/serverDataTypes";
import TextCard from "@/components/TextCard";
import VisualCard from "@/components/VisualCard";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
];

export default function Home() {
  const [stats, setStats] = useState<IStats>({
    blockedIPs: [],
    endpointCounter: {},
    failedLoginCounter: {},
    userAgentCounter: {},
  });

  /* ================= SOCKET ================= */

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    socket.on("statsUpdate", (stat: IStats) => {
      console.log("New stats received:", stat);
      setStats(stat);
    });

    // Очищення при розмонтуванні
    return () => {
      socket.off("statsUpdate");
    };
  }, []);

  useEffect(() => {
    const handleUpdate = (stat: IStats) => {
      console.log("Stats received:", stat);
      setStats(stat);
    };

    socket.on("statsUpdate", handleUpdate);

    // ПРИМУСОВИЙ ЗАПИТ: якщо сокет вже підключений,
    // просимо бекенд дати нам інфу прямо зараз
    if (socket.connected) {
      socket.emit("requestStats");
    } else {
      socket.on("connect", () => {
        socket.emit("requestStats");
      });
    }

    return () => {
      socket.off("statsUpdate", handleUpdate);
    };
  }, []);

  /* ================= HELPERS ================= */

  // Допоміжна функція для безпечного парсингу довжини масивів з Redis
  const getCountFromRedis = (data: any): number => {
    if (!data) return 0;
    if (typeof data === "number") return data;
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch (e) {
      return 0;
    }
  };

  const getTopIPs = () => {
    if (!stats.endpointCounter) return [];

    const ipCounts: Record<string, number> = {};

    Object.entries(stats.endpointCounter).forEach(([key, timestamps]) => {
      const ip = key.split("-")[0];
      const count = getCountFromRedis(timestamps);
      ipCounts[ip] = (ipCounts[ip] || 0) + count;
    });

    return Object.entries(ipCounts)
      .map(([ip, requests]) => ({ ip, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);
  };

  const getTopEndpoints = () => {
    if (!stats.endpointCounter) return [];

    const endpointCounts: Record<string, number> = {};

    Object.entries(stats.endpointCounter).forEach(([key, timestamps]) => {
      const endpoint = key.split("-")[1]?.trim() || "/";
      const count = getCountFromRedis(timestamps);
      endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + count;
    });

    return Object.entries(endpointCounts)
      .map(([endpoint, requests]) => ({ endpoint, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);
  };

  const getUserAgentData = () => {
    if (!stats.userAgentCounter) return [];

    return Object.entries(stats.userAgentCounter)
      .map(([ua, data]) => ({
        name: ua.length > 25 ? ua.slice(0, 25) + "…" : ua,
        value: getCountFromRedis(data),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  };

  const getAttackTypes = () => {
    // 1. Отримуємо загальну кількість ВСІХ атак (всі запити від підозрілих IP)
    const totalRequests = getTopIPs().reduce((sum, ip) => sum + ip.requests, 0);

    // 2. Рахуємо Brute Force
    const bruteForceTotal = Object.values(
      stats.failedLoginCounter || {},
    ).reduce((sum, val) => sum + getCountFromRedis(val), 0);

    // 3. Рахуємо Scanning
    let scanningTotal = 0;
    const dangerousPatterns = ["admin", "phpmyadmin", ".env", "config", "wp-"];
    Object.entries(stats.endpointCounter || {}).forEach(([key, val]) => {
      if (dangerousPatterns.some((p) => key.toLowerCase().includes(p))) {
        scanningTotal += getCountFromRedis(val);
      }
    });

    // 4. КЛЮЧОВИЙ МОМЕНТ: DDoS - це те, що залишилось (загальне мінус специфічне)
    // Використовуємо Math.max(0, ...), щоб не отримати від'ємні значення
    const pureDdos = Math.max(
      0,
      totalRequests - scanningTotal - bruteForceTotal,
    );

    return [
      { name: "DDoS", value: pureDdos },
      { name: "Brute Force", value: bruteForceTotal },
      { name: "Scanning", value: scanningTotal },
    ].filter((a) => a.value > 0);
  };

  const attackData = getAttackTypes();

  /* ================= UI ================= */

  return (
    <div className="font-sans  min-h-screen p-8">
      <h1 className="text-center text-4xl font-bold mb-10 ">
        Analytics Dashboard
      </h1>

      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* ===== СТАТИСТИЧНІ КАРТКИ ===== */}
        <TextCard text="Blocked IPs" value={stats.blockedIPs?.length || 0} />
        <TextCard
          text="Active Endpoints"
          value={Object.keys(stats.endpointCounter || {}).length}
        />
        <TextCard
          text="Failed Logins (IPs)"
          value={Object.keys(stats.failedLoginCounter || {}).length}
        />
        <TextCard
          text="Unique User-Agents"
          value={Object.keys(stats.userAgentCounter || {}).length}
        />

        {/* ===== ТИПИ АТАК ===== */}
        <VisualCard>
          <h2 className="text-center font-bold text-gray-700 mb-4">
            Attack Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={attackData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {attackData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </VisualCard>

        {/* ===== ТОП IP ===== */}
        <VisualCard>
          <h2 className="text-center font-bold text-gray-700 mb-4">
            Top Source IPs
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getTopIPs()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="ip"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="requests" fill="#0088FE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </VisualCard>

        {/* ===== ТОП ЕНДПОІНТІВ ===== */}
        <VisualCard>
          <h2 className="text-center font-bold text-gray-700 mb-4">
            Targeted Endpoints
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getTopEndpoints()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="endpoint"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="requests" fill="#00C49F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </VisualCard>

        {/* ===== USER AGENTS ===== */}
        <VisualCard>
          <h2 className="text-center font-bold text-gray-700 mb-4">
            User-Agent Usage
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getUserAgentData()}
                dataKey="value"
                nameKey="name"
                outerRadius={80}
                fill="#FFBB28"
                label
              />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </VisualCard>
      </main>
    </div>
  );
}
