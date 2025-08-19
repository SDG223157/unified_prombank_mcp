#!/bin/bash

# Auto-commit and push script for Prompt House Premium
# Usage: ./auto-commit.sh [commit-message]

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Auto-commit and push for Prompt House Premium${NC}"
echo "=============================================="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Check for uncommitted changes
if git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
    exit 0
fi

# Get current branch
BRANCH=$(git branch --show-current)
echo -e "${BLUE}📂 Current branch: ${BRANCH}${NC}"

# Stage all changes
echo -e "${BLUE}📝 Staging changes...${NC}"
git add .

# Show what's being committed
echo -e "${BLUE}📋 Changes to be committed:${NC}"
git diff --cached --name-status

# Get commit message
if [ -n "$1" ]; then
    COMMIT_MSG="$1"
else
    # Generate automatic commit message based on changed files
    CHANGED_FILES=$(git diff --cached --name-only | head -5)
    FILE_COUNT=$(git diff --cached --name-only | wc -l)
    
    if [ $FILE_COUNT -eq 1 ]; then
        COMMIT_MSG="Update $(echo $CHANGED_FILES | xargs basename)"
    elif [ $FILE_COUNT -le 3 ]; then
        COMMIT_MSG="Update $(echo $CHANGED_FILES | xargs -I {} basename {} | tr '\n' ', ' | sed 's/, $//')"
    else
        COMMIT_MSG="Update $FILE_COUNT files - $(date '+%Y-%m-%d %H:%M')"
    fi
fi

echo -e "${BLUE}💬 Commit message: ${COMMIT_MSG}${NC}"

# Commit changes
echo -e "${BLUE}✅ Committing changes...${NC}"
git commit -m "$COMMIT_MSG"

# Push changes
echo -e "${BLUE}🚀 Pushing to remote...${NC}"
git push origin "$BRANCH"

# Show final status
COMMIT_HASH=$(git rev-parse --short HEAD)
echo -e "${GREEN}🎉 Successfully committed and pushed!${NC}"
echo -e "${GREEN}📋 Commit: ${COMMIT_HASH} - ${COMMIT_MSG}${NC}"
echo -e "${GREEN}🌐 Branch: ${BRANCH}${NC}"

echo -e "${BLUE}=============================================="
echo -e "✅ Auto-commit and push completed successfully!${NC}"
