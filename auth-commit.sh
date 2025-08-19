#!/bin/bash

# Authenticated Auto-commit and Push Script
# Handles different Git authentication methods
# Usage: ./auth-commit.sh [commit-message] [--token] [--ssh] [--credential-helper]

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Authenticated Git Auto-commit & Push${NC}"
echo "=============================================="

# Parse arguments
COMMIT_MSG=""
AUTH_METHOD="auto"

while [[ $# -gt 0 ]]; do
    case $1 in
        --token)
            AUTH_METHOD="token"
            shift
            ;;
        --ssh)
            AUTH_METHOD="ssh"
            shift
            ;;
        --credential-helper)
            AUTH_METHOD="credential"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [commit-message] [--token] [--ssh] [--credential-helper]"
            echo ""
            echo "Authentication methods:"
            echo "  --token             Use Personal Access Token"
            echo "  --ssh               Use SSH key authentication"
            echo "  --credential-helper Use Git credential helper"
            echo "  (no flag)           Auto-detect best method"
            echo ""
            echo "Examples:"
            echo "  $0 'Fix authentication bug'"
            echo "  $0 'Add new feature' --token"
            echo "  $0 --ssh"
            exit 0
            ;;
        *)
            if [[ -z "$COMMIT_MSG" ]]; then
                COMMIT_MSG="$1"
            fi
            shift
            ;;
    esac
done

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

# Get current branch and remote info
BRANCH=$(git branch --show-current)
REMOTE_URL=$(git config --get remote.origin.url)

echo -e "${BLUE}📂 Branch: ${BRANCH}${NC}"
echo -e "${BLUE}🌐 Remote: ${REMOTE_URL}${NC}"

# Auto-detect authentication method if not specified
if [[ "$AUTH_METHOD" == "auto" ]]; then
    if [[ "$REMOTE_URL" == git@* ]]; then
        AUTH_METHOD="ssh"
    elif [[ "$REMOTE_URL" == https://* ]]; then
        # Check if credential helper is configured
        if git config --get credential.helper > /dev/null 2>&1; then
            AUTH_METHOD="credential"
        else
            AUTH_METHOD="token"
        fi
    fi
fi

echo -e "${PURPLE}🔐 Authentication method: ${AUTH_METHOD}${NC}"

# Setup authentication based on method
case $AUTH_METHOD in
    "ssh")
        echo -e "${BLUE}🔑 Using SSH key authentication${NC}"
        # Check if SSH agent is running and has keys
        if ! ssh-add -l > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  SSH agent not running or no keys loaded${NC}"
            echo -e "${YELLOW}💡 Tip: Run 'ssh-add ~/.ssh/id_rsa' to add your SSH key${NC}"
        fi
        ;;
        
    "token")
        echo -e "${BLUE}🎫 Using Personal Access Token${NC}"
        # Check if token is stored in git config
        if ! git config --get credential.helper > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️  No credential helper configured${NC}"
            echo -e "${YELLOW}💡 Git will prompt for username/token on push${NC}"
            echo -e "${YELLOW}💡 Username: your-github-username${NC}"
            echo -e "${YELLOW}💡 Password: your-personal-access-token${NC}"
        fi
        ;;
        
    "credential")
        echo -e "${BLUE}🔐 Using Git credential helper${NC}"
        HELPER=$(git config --get credential.helper)
        echo -e "${BLUE}📋 Credential helper: ${HELPER}${NC}"
        ;;
        
    *)
        echo -e "${YELLOW}⚠️  Unknown authentication method, proceeding with default${NC}"
        ;;
esac

# Stage all changes
echo -e "${BLUE}📝 Staging changes...${NC}"
git add .

# Show what's being committed
echo -e "${BLUE}📋 Changes to be committed:${NC}"
git diff --cached --name-status | head -10
TOTAL_FILES=$(git diff --cached --name-only | wc -l)
if [[ $TOTAL_FILES -gt 10 ]]; then
    echo -e "${YELLOW}... and $((TOTAL_FILES - 10)) more files${NC}"
fi

# Generate commit message if not provided
if [[ -z "$COMMIT_MSG" ]]; then
    CHANGED_FILES=$(git diff --cached --name-only | head -3)
    FILE_COUNT=$(git diff --cached --name-only | wc -l)
    
    if [[ $FILE_COUNT -eq 1 ]]; then
        COMMIT_MSG="Update $(echo $CHANGED_FILES | xargs basename)"
    elif [[ $FILE_COUNT -le 3 ]]; then
        COMMIT_MSG="Update $(echo $CHANGED_FILES | xargs -I {} basename {} | tr '\n' ', ' | sed 's/, $//')"
    else
        COMMIT_MSG="Update $FILE_COUNT files - $(date '+%Y-%m-%d %H:%M')"
    fi
fi

echo -e "${BLUE}💬 Commit message: ${COMMIT_MSG}${NC}"

# Commit changes
echo -e "${BLUE}✅ Committing changes...${NC}"
git commit -m "$COMMIT_MSG"

# Push changes with authentication
echo -e "${BLUE}🚀 Pushing to remote (${AUTH_METHOD})...${NC}"

case $AUTH_METHOD in
    "ssh")
        # Use SSH
        git push origin "$BRANCH"
        ;;
    "token"|"credential")
        # Use HTTPS with credentials
        git push origin "$BRANCH"
        ;;
    *)
        # Default push
        git push origin "$BRANCH"
        ;;
esac

# Show final status
COMMIT_HASH=$(git rev-parse --short HEAD)
echo -e "${GREEN}🎉 Successfully committed and pushed!${NC}"
echo -e "${GREEN}📋 Commit: ${COMMIT_HASH} - ${COMMIT_MSG}${NC}"
echo -e "${GREEN}🌐 Branch: ${BRANCH}${NC}"
echo -e "${GREEN}🔐 Auth: ${AUTH_METHOD}${NC}"

echo -e "${BLUE}=============================================="
echo -e "✅ Authenticated commit and push completed!${NC}"
