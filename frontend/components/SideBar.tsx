"use client";
import { useState } from "react";
import { X, Menu } from "lucide-react";
import { sideBarLinks } from "@/config/sideBarLinks";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SideBar() {
  const [open, setOpen] = useState(false);
  const currentLink = usePathname();

  const handleMenu = () => {
    setOpen((state) => !state);
  };

  const closeMenu = () => {
    setOpen(false);
  };

  return (
    <aside
      className={`${open ? "w-64" : "w-15"} min-h-screen bg-neutral-900 rounded-2xl fixed z-90 transition-all duration-500 flex flex-col gap-2`}
    >
      {!open ? (
        <Menu onClick={handleMenu} className="mt-5 mx-auto cursor-pointer" />
      ) : (
        <X onClick={handleMenu} className="mt-5 ml-auto mr-5 cursor-pointer" />
      )}

      {open &&
        sideBarLinks.map((link, index) => (
          <Link
            href={link.href}
            key={index}
            onClick={closeMenu}
            className={`flex gap-5 pl-5 hover:bg-gray-800 rounded-l-2xl p-3 ${link.href === currentLink ? "bg-gray-900" : ""}`}
          >
            <link.icon />
            <span>{link.name}</span>
          </Link>
        ))}
    </aside>
  );
}
