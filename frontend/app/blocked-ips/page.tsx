"use client";
import { useEffect, useState, useMemo } from "react";
import socket from "@/socket";

interface StatsData {
  blockedIPs: string[];
  whitelist: string[];
}

export default function IPManagementPage() {
  const [data, setData] = useState<StatsData>({
    blockedIPs: [],
    whitelist: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [manualIP, setManualIP] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    socket.on("statsUpdate", (newData: StatsData) => {
      setData({
        blockedIPs: newData.blockedIPs || [],
        whitelist: newData.whitelist || [],
      });
    });

    socket.emit("requestStats");

    return () => {
      socket.off("statsUpdate");
    };
  }, []);

  // Об'єднуємо списки для відображення
  const allItems = useMemo(() => {
    const blocked = data.blockedIPs.map((ip) => ({ ip, status: "blocked" }));
    const white = data.whitelist.map((ip) => ({ ip, status: "whitelist" }));

    return [...blocked, ...white].filter((item) =>
      item.ip.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [data, searchTerm]);

  // Логіка пагінації
  const totalPages = Math.ceil(allItems.length / itemsPerPage) || 1;
  const paginatedItems = allItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Обробники подій
  const handleUnblock = (ip: string) => socket.emit("unblockIP", ip);
  const handleWhitelist = (ip: string) => socket.emit("addToWhitelist", ip);
  const handleRemoveWhitelist = (ip: string) =>
    socket.emit("removeFromWhitelist", ip);

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualIP) {
      socket.emit("addToWhitelist", manualIP);
      setManualIP("");
    }
  };

  return (
    <main className="p-6  min-h-screen text-neutral-200 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              IP Control Center
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              Manage blocked addresses and trusted exceptions
            </p>
          </div>

          <form onSubmit={handleManualAdd} className="flex gap-2">
            <input
              type="text"
              placeholder="Add IP to Whitelist..."
              value={manualIP}
              onChange={(e) => setManualIP(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 px-3 py-2 rounded-lg text-sm outline-none focus:border-blue-500 transition-all"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Add
            </button>
          </form>
        </header>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by IP..."
            className="bg-neutral-900 border border-neutral-800 px-4 py-3 rounded-xl w-full max-w-md outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-800/50 text-neutral-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Address</th>
                <th className="px-6 py-4 font-semibold">Security Status</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <tr
                    key={`${item.status}-${item.ip}`}
                    className="hover:bg-neutral-800/30 transition-colors group"
                  >
                    <td className="px-6 py-4 font-mono text-sm text-neutral-300">
                      {item.ip}
                    </td>
                    <td className="px-6 py-4">
                      {item.status === "blocked" ? (
                        <span className="bg-red-500/10 text-red-500 px-2.5 py-1 rounded-full text-[11px] font-bold border border-red-500/20 uppercase">
                          Blocked
                        </span>
                      ) : (
                        <span className="bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full text-[11px] font-bold border border-blue-500/20 uppercase">
                          Whitelisted
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        {item.status === "blocked" ? (
                          <>
                            <button
                              onClick={() => handleUnblock(item.ip)}
                              className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-green-600 text-xs font-semibold transition-all"
                            >
                              Unblock
                            </button>
                            <button
                              onClick={() => handleWhitelist(item.ip)}
                              className="px-3 py-1.5 rounded-md bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white text-xs font-semibold transition-all"
                            >
                              Trust IP
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRemoveWhitelist(item.ip)}
                            className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-red-600 text-xs font-semibold transition-all"
                          >
                            Remove Trust
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-20 text-center text-neutral-600 italic"
                  >
                    No addresses found in security lists
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 px-2">
            <p className="text-xs text-neutral-500">
              Showing page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-20 hover:bg-neutral-800 transition-all"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm disabled:opacity-20 hover:bg-neutral-800 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
