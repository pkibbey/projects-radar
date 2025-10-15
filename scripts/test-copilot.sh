#!/bin/bash

# Quick test to see if Copilot CLI is working

echo "Testing GitHub Copilot CLI..."
echo ""

# Test 1: Simple suggestion
echo "Test 1: Simple suggestion (should be fast)"
timeout 10 gh copilot suggest -t shell "echo hello world" 2>&1 | head -20

echo ""
echo "---"
echo ""

# Test 2: Explain command (what the app uses)
echo "Test 2: Explain command (what quick mode uses)"
cd /tmp
timeout 10 gh copilot explain "test" 2>&1 | head -20

echo ""
echo "---"
echo ""

echo "If both tests hung or timed out, Copilot CLI might be waiting for interactive input."
echo "This is the likely cause of the slow analysis."
echo ""
echo "Solution: Use LM Studio instead by adding ?useLmStudio=true to your requests"
