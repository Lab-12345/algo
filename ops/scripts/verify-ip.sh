#!/bin/bash
# Checks outbound public IPv4 against AWS checkip service
# Compares against the registered static IP configured in .env

source .env 2>/dev/null || true

OUTBOUND_IP=$(curl -4s https://checkip.amazonaws.com)

echo "------------------------------------------------------"
echo " TradePilot Static IP Egress Verification Tool"
echo "------------------------------------------------------"
echo "Detected Outbound IPv4 : $OUTBOUND_IP"
echo "Configured Static IP   : ${REGISTERED_STATIC_IP:-'Not configured in .env'}"

if [ "$OUTBOUND_IP" == "$REGISTERED_STATIC_IP" ]; then
    echo " STATUS: MATCH! Egress IP matches your registered SmartAPI IP."
    exit 0
else
    echo " WARNING: MISMATCH! Outbound IP does not match REGISTERED_STATIC_IP."
    echo " Live order placement will be blocked by safety checks."
    exit 1
fi
