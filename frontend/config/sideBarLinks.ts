import {
  PcCase,
  Settings,
  Terminal,
  LayoutDashboard,
  UserX,
} from "lucide-react";

export const sideBarLinks = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "System Analytic", href: "/system-state", icon: PcCase },
  { name: "Logs", href: "/logs", icon: Terminal },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Blocked IPs", href: "/blocked-ips", icon: UserX },
];
