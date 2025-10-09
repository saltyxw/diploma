"use client"
import { io } from "socket.io-client";
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const socket = io("http://172.24.185.207:3001");
    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });
    socket.on('statsUpdate', (stats) => {
      console.log(stats);
    });

    return () => {
      socket.disconnect();
    };
  }, []);
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        hello
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
      </footer>
    </div>
  );
}
