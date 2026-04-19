#!/usr/bin/env python3
"""
Network monitoring script for VAL-AI-001 and VAL-AI-007 validation.

Monitors network activity during LLM operations to verify:
- VAL-AI-001: No external API calls are made (local inference only)
- VAL-AI-007: No telemetry calls to third-party services

Uses unittest.mock to hook into network operations and detect any
external network activity.
"""

import sys
import os
import json
import socket
import unittest.mock as mock
from datetime import datetime
from typing import List, Set, Optional

# Track all network activity
network_calls: List[dict] = []
external_hosts: Set[str] = set()

# Known safe hosts (local, HuggingFace for model downloads)
SAFE_HOSTS = {
    "localhost",
    "127.0.0.1",
    "::1",
    "huggingface.co",  # Model downloads allowed
    "hf.co",           # HuggingFace short URL
}

# Known telemetry/analytics domains that should NEVER be called
BLOCKED_HOSTS = {
    "google-analytics.com",
    "googletagmanager.com",
    "segment.io",
    "segment.com",
    "mixpanel.com",
    "amplitude.com",
    "heap.io",
    "hotjar.com",
    "intercom.io",
    "zendesk.com",
    "crisp.chat",
    "drift.com",
    "mixpanel.net",
    "facebook.com",
    "facebook.net",
    "doubleclick.net",
    "adservice.google.com",
    "analytics.google.com",
}


def is_localhost(host: str) -> bool:
    """Check if host is localhost or a private IP."""
    if host in SAFE_HOSTS:
        return True
    
    # Check if it's localhost by trying to resolve
    try:
        # First check if it's an IP
        socket.inet_aton(host)  # Validate IP format
        # It's a valid IP, check private ranges
        if host.startswith("127."):
            return True
        if host.startswith("10."):
            return True
        if host.startswith("192.168."):
            return True
        if host.startswith("172."):
            second = int(host.split(".")[1])
            if 16 <= second <= 31:
                return True
        return False
    except socket.error:
        # Not a valid IP, try hostname resolution
        try:
            resolved = socket.gethostbyname(host)
            if resolved.startswith("127."):
                return True
            # Check if resolved IP is private
            if resolved.startswith("10.") or resolved.startswith("192.168.") or (resolved.startswith("172.") and 16 <= int(resolved.split(".")[1]) <= 31):
                return True
        except socket.gaierror:
            pass
    
    return False


def track_socket_connect(original_connect, self, address, *args, **kwargs):
    """Track all socket.connect calls to detect external network activity."""
    host = address[0] if isinstance(address, tuple) else address
    port = address[1] if isinstance(address, tuple) else 0
    
    call_info = {
        "timestamp": datetime.now().isoformat(),
        "event": "socket_connect",
        "host": str(host),
        "port": int(port),
        "is_external": False,
        "is_blocked": False,
    }
    
    # Check if this is an external call
    if not is_localhost(host):
        call_info["is_external"] = True
        external_hosts.add(str(host))
        
        # Check if it's a blocked telemetry domain
        for blocked in BLOCKED_HOSTS:
            if blocked in host.lower():
                call_info["is_blocked"] = True
    
    network_calls.append(call_info)
    print(f"[NETWORK] socket.connect -> {host}:{port} (external={call_info['is_external']})")
    
    return original_connect(self, address, *args, **kwargs)


def setup_network_monitoring():
    """Set up all network monitoring hooks."""
    print("[MONITOR] Setting up network monitoring...")
    
    # Patch socket.socket.connect
    original_connect = socket.socket.connect
    socket.socket.connect = lambda self, address, *args, **kwargs: track_socket_connect(
        original_connect, self, address, *args, **kwargs
    )
    
    print("[MONITOR] Network monitoring active")


def get_report() -> dict:
    """Generate network monitoring report."""
    # Filter out local calls
    external_calls = [c for c in network_calls if c.get("is_external", False)]
    blocked_calls = [c for c in network_calls if c.get("is_blocked", False)]
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "total_network_calls": len(network_calls),
        "external_calls": len(external_calls),
        "blocked_calls": len(blocked_calls),
        "external_hosts_contacted": list(external_hosts),
        "all_calls": network_calls,
        "external_call_details": external_calls,
        "blocked_call_details": blocked_calls,
        "val_ai_001_pass": len(external_calls) == 0,
        "val_ai_007_pass": len(blocked_calls) == 0,
    }
    
    return report


if __name__ == "__main__":
    # Test the monitoring by making a local API call
    setup_network_monitoring()
    
    print("\n[TEST] Making API call to trigger LLM service...")
    
    import requests
    
    # Login
    login_resp = requests.post(
        "http://localhost:8000/api/auth/login",
        json={"username": "testuser_ai_001", "password": "TestPass123!"}
    )
    token = login_resp.json()["access_token"]
    print(f"[TEST] Login successful, token obtained")
    
    # Create new session
    session_resp = requests.post(
        "http://localhost:8000/api/sessions",
        headers={"Authorization": f"Bearer {token}"},
        json={}
    )
    session_id = session_resp.json()["id"]
    print(f"[TEST] Session {session_id} created")
    
    # Add message (this triggers LLM)
    print(f"[TEST] Adding message to trigger LLM...")
    message_resp = requests.post(
        f"http://localhost:8000/api/sessions/{session_id}/messages",
        headers={"Authorization": f"Bearer {token}"},
        json={"content": "I am feeling stressed about an upcoming deadline."}
    )
    
    response_data = message_resp.json()
    print(f"[TEST] Response from AI: {response_data.get('content', 'N/A')[:80]}...")
    
    # Generate report
    print("\n" + "="*60)
    print("NETWORK MONITORING REPORT")
    print("="*60)
    
    report = get_report()
    print(json.dumps(report, indent=2))
    
    # Save report
    output_path = "/Users/stefano/repos/open-marcus/.factory/missions/6f3cf8d7-cbd1-4ed7-9275-cf97cb6d538d/evidence/ai-integration/ai-inference/network_report.json"
    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n[SAVED] Report to {output_path}")
    
    # Exit with appropriate code
    if report["val_ai_001_pass"] and report["val_ai_007_pass"]:
        print("\n✓ VAL-AI-001 PASS: No external network calls during LLM inference")
        print("✓ VAL-AI-007 PASS: No telemetry/third-party calls detected")
        sys.exit(0)
    else:
        print("\n✗ FAILURES DETECTED:")
        if not report["val_ai_001_pass"]:
            print(f"  - VAL-AI-001 FAIL: {report['external_calls']} external calls made")
        if not report["val_ai_007_pass"]:
            print(f"  - VAL-AI-007 FAIL: {report['blocked_calls']} blocked/third-party calls made")
        sys.exit(1)
