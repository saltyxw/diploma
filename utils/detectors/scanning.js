function detectScanning(ip, url, userAgent) {
    const scanningPatterns = [
        '/admin', '/phpmyadmin', '/wp-admin', '/.env',
        '/config', '/backup', '/sql', '/debug',
        'nikto', 'sqlmap', 'nmap', 'metasploit'
    ];
    const isScanning = scanningPatterns.some(pattern =>
        url.toLowerCase().includes(pattern) ||
        userAgent.toLowerCase().includes(pattern)
    );
    if (isScanning) {
        console.log(`Scanning detected: IP ${ip} - ${url}`);
        blockIP(ip, 3600, "port_scanning");
        return true;
    }
    return false;
}

module.exports = { detectScanning }
