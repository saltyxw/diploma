#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

LOG_FILE="/var/log/ip_blocker.log"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo -e "$2$1${NC}"
}

if [ $# -lt 3 ]; then
    echo "Usage: $0 <IP> <TIMEOUT> <REASON>"
    echo "  IP - IP address to block"
    echo "  TIMEOUT - block duration in seconds"
    echo "  REASON - reason for blocking"
    exit 1
fi

IP="$1"
TIMEOUT="$2"
REASON="$3"

if ! echo "$IP" | grep -Eq '^([0-9]{1,3}\.){3}[0-9]{1,3}$'; then
    log_message "Error: Invalid IP address format: $IP" "$RED"
    exit 1
fi

if [[ "$IP" == "127.0.0.1" ]] || [[ "$IP" == "localhost" ]]; then
    log_message "Error: Cannot block localhost" "$RED"
    exit 1
fi

if iptables -L INPUT -n | grep -q "$IP"; then
    log_message "ℹ IP $IP is already blocked in iptables" "$YELLOW"
    exit 0
fi

log_message "Blocking IP: $IP for $TIMEOUT seconds. Reason: $REASON" "$RED"
iptables -I INPUT -s "$IP" -j DROP
log_message "Successfully blocked IP: $IP" "$GREEN"

{
    sleep "$TIMEOUT"
    iptables -D INPUT -s "$IP" -j DROP 2>/dev/null && \
    log_message "Automatically unblocked IP: $IP after $TIMEOUT seconds" "$GREEN"
} &

echo $! > "/tmp/ip_unblock_${IP//./_}.pid"

exit 0
