#!/bin/bash

set -e

echo "🧪 Running comprehensive test coverage analysis..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Run tests with coverage
echo "📊 Generating coverage report..."
npm run test:coverage

# Check if coverage directory exists
if [ ! -d "coverage" ]; then
    echo "${RED}❌ Coverage directory not found!${NC}"
    exit 1
fi

echo ""
echo "${GREEN}✅ Coverage report generated!${NC}"
echo ""

# Display summary
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${BLUE}📈 COVERAGE SUMMARY${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Parse and display coverage summary
if command -v jq &> /dev/null; then
    if [ -f "coverage/coverage-summary.json" ]; then
        echo ""
        jq -r '.total | "Lines:      \(.lines.pct)% (\(.lines.covered)/\(.lines.total))\nStatements: \(.statements.pct)% (\(.statements.covered)/\(.statements.total))\nFunctions:  \(.functions.pct)% (\(.functions.covered)/\(.functions.total))\nBranches:   \(.branches.pct)% (\(.branches.covered)/\(.branches.total))"' coverage/coverage-summary.json
        echo ""
        
        # Check for low coverage files
        LOW_COVERAGE=$(jq -r 'to_entries | .[] | select(.key != "total") | select(.value.lines.pct < 70) | "\(.key): \(.value.lines.pct)%"' coverage/coverage-summary.json)
        
        if [ ! -z "$LOW_COVERAGE" ]; then
            echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo "${YELLOW}⚠️  FILES WITH LOW COVERAGE (<70%)${NC}"
            echo "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo "$LOW_COVERAGE"
            echo ""
        fi
        
        # Check for uncovered files
        UNCOVERED=$(jq -r 'to_entries | .[] | select(.key != "total") | select(.value.lines.pct == 0) | .key' coverage/coverage-summary.json)
        
        if [ ! -z "$UNCOVERED" ]; then
            echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo "${RED}❌ COMPLETELY UNCOVERED FILES (0%)${NC}"
            echo "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo "$UNCOVERED"
            echo ""
        fi
    fi
else
    echo "${YELLOW}⚠️  Install 'jq' for detailed coverage analysis: sudo apt-get install jq${NC}"
    echo ""
fi

echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "${GREEN}📁 HTML Report: coverage/lcov-report/index.html${NC}"
echo "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Try to open HTML report
if command -v xdg-open &> /dev/null; then
    echo "🌐 Opening coverage report in browser..."
    xdg-open coverage/lcov-report/index.html 2>/dev/null || true
elif command -v open &> /dev/null; then
    echo "🌐 Opening coverage report in browser..."
    open coverage/lcov-report/index.html 2>/dev/null || true
fi

# Exit with error if coverage below threshold
TOTAL_COVERAGE=$(jq -r '.total.lines.pct' coverage/coverage-summary.json 2>/dev/null || echo "0")
THRESHOLD=70

if (( $(echo "$TOTAL_COVERAGE < $THRESHOLD" | bc -l) )); then
    echo ""
    echo "${RED}❌ Coverage below threshold! Current: ${TOTAL_COVERAGE}%, Required: ${THRESHOLD}%${NC}"
    exit 1
else
    echo ""
    echo "${GREEN}✅ Coverage meets threshold! Current: ${TOTAL_COVERAGE}%, Required: ${THRESHOLD}%${NC}"
fi