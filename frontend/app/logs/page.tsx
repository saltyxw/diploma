"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import socket from "@/socket";

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAutoScroll, setIsAutoScroll] = useState(true); // Контроль автопрокрутки
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    socket.emit("getLogs", { from: 0, to: 1000 }, (initialLogs: string[]) => {
      setLogs(initialLogs);
    });

    const handleNewLog = (line: string) => {
      setLogs((prev) => {
        const updated = [...prev, line];
        if (updated.length > 1000) updated.shift();
        return updated;
      });
    };

    socket.on("newLogLine", handleNewLog);
    return () => {
      socket.off("newLogLine", handleNewLog);
    };
  }, []);

  // Автопрокрутка тільки якщо ввімкнено режим "Auto-scroll"
  useEffect(() => {
    if (isAutoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isAutoScroll]);

  // Фільтрація логів за введеним текстом
  const filteredLogs = useMemo(() => {
    return logs.filter((line) =>
      line.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [logs, searchTerm]);

  return (
    <main className="p-4 font-mono bg-black text-green-400 h-screen overflow-hidden flex flex-col">
      {/* Панель керування */}
      <header className="fixed top-0 left-0 w-full bg-neutral-900 border-b border-neutral-700 p-4 z-20 flex flex-wrap gap-4 items-center">
        <h2 className="text-white font-bold mr-4">Live Logs</h2>

        {/* Поле пошуку */}
        <input
          type="text"
          placeholder="Search logs (IP, URL, Status)..."
          className="bg-black border border-neutral-600 px-3 py-1 text-sm rounded w-64 outline-none focus:border-green-500 transition-colors"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Кнопка Паузи/Автоскролу */}
        <button
          onClick={() => setIsAutoScroll(!isAutoScroll)}
          className={`px-3 py-1 text-sm rounded border transition-all ${
            isAutoScroll
              ? "bg-green-900/30 border-green-500 text-green-400"
              : "bg-red-900/30 border-red-500 text-red-400"
          }`}
        >
          {isAutoScroll ? "● Auto-scroll ON" : "║ Pause Scroll"}
        </button>

        {/* Кнопка очищення (локально) */}
        <button
          onClick={() => setLogs([])}
          className="px-3 py-1 text-sm rounded border border-neutral-500 text-neutral-300 hover:bg-neutral-700"
        >
          Clear Console
        </button>

        <div className="ml-auto text-xs text-neutral-500">
          Showing {filteredLogs.length} / {logs.length} logs
        </div>
      </header>

      {/* Контейнер для логів */}
      <div className="mt-20 overflow-y-auto grow custom-scrollbar">
        {filteredLogs.length === 0 && (
          <div className="text-neutral-600 italic p-4 text-center mt-10">
            {searchTerm
              ? "No logs matching your search..."
              : "Waiting for logs..."}
          </div>
        )}

        {filteredLogs.map((line, i) => (
          <div
            key={i}
            className="hover:bg-neutral-900 px-2 py-0.5 break-all border-l border-transparent hover:border-green-500"
          >
            <span className="text-neutral-600 mr-2 text-xs">[{i}]</span>
            {line}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </main>
  );
}
