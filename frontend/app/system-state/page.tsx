"use client";

import socket from "@/socket";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { IServerStats } from "@/types/serverDataTypes";
import VisualCard from "@/components/VisualCard";
import TextCard from "@/components/TextCard";

export default function ServerPerformance() {
  const [stats, setStats] = useState<IServerStats | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    socket.on("statsUpdate", (data: IServerStats) => {
      setStats(data);

      setHistory((prev) => {
        const newPoint = {
          time: new Date().toLocaleTimeString().slice(0, 5),
          cpu: Number(data.systemMetrics?.cpuLoad) || 0,
          ram: Number(data.systemMetrics?.ramUsage) || 0,
        };
        const updated = [...prev, newPoint];
        return updated.slice(-20);
      });
    });

    return () => {
      socket.off("statsUpdate");
    };
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="font-sans p-5 min-h-screen text-white">
      <h1 className="text-4xl font-bold mb-10 text-center">
        Server Health Monitor
      </h1>

      <main className="max-w-[1400px] mx-auto space-y-8">
        {/* СЕКЦІЯ ТВОЇХ TEXT CARDS */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center">
          <TextCard
            text="CPU LOAD"
            value={stats?.systemMetrics?.cpuLoad || "0"}
          />
          <TextCard
            text="RAM USAGE (%)"
            value={`${stats?.systemMetrics?.ramUsage || 0}%`}
          />
          <TextCard
            text="UPTIME"
            value={formatUptime(stats?.systemMetrics?.processUptime || 0)}
          />
          <TextCard
            text="TOTAL RAM"
            value={`${stats?.systemMetrics?.totalMemGB || 0} GB`}
          />
        </section>

        {/* СЕКЦІЯ ТВОЇХ VISUAL CARDS З ГРАФІКАМИ */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <VisualCard>
            <h2 className="text-xl font-semibold mb-6 text-gray-200 text-center">
              CPU Load History
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#374151"
                />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCpu)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </VisualCard>

          <VisualCard>
            <h2 className="text-xl font-semibold mb-6 text-gray-200 text-center">
              RAM Consumption (%)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#374151"
                />
                <XAxis
                  dataKey="time"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ram"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRam)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </VisualCard>
        </div>
      </main>
    </div>
  );
}
