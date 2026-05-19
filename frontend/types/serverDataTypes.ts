export interface IStats {
  blockedIPs: string[];
  endpointCounter: Record<string, string>;
  failedLoginCounter: Record<string, string>;
  userAgentCounter: Record<string, string>;
}

export interface IServerStats {
  systemMetrics: {
    cpuLoad: string;
    ramUsage: string;
    uptime: number;
    processUptime: number;
    freeMemGB: string;
    totalMemGB: string;
  };
}
