#!/bin/bash

# Setup shell aliases for auto-commit functionality
# Run this once: source setup-aliases.sh

echo "🔧 Setting up auto-commit aliases..."

# Add to your shell profile (zsh)
SHELL_PROFILE="$HOME/.zshrc"

# Create backup
if [ -f "$SHELL_PROFILE" ]; then
    cp "$SHELL_PROFILE" "$SHELL_PROFILE.backup.$(date +%Y%m%d)"
    echo "📋 Backed up existing .zshrc"
fi

# Add aliases to shell profile
cat >> "$SHELL_PROFILE" << 'EOF'

# Prompt House Premium Auto-commit aliases
alias acp='git add . && git commit -m "Auto-commit: $(date)" && git push'
alias acpm='function _acpm() { git add . && git commit -m "$1" && git push; }; _acpm'
alias gac='git add . && git commit -m'
alias gacp='function _gacp() { git add . && git commit -m "$1" && git push; }; _gacp'
alias status='git status'
alias quickcommit='./auto-commit.sh'

EOF

echo "✅ Aliases added to $SHELL_PROFILE"
echo ""
echo "🚀 Available commands after restarting terminal or running 'source ~/.zshrc':"
echo "   acp              - Auto-commit with timestamp and push"
echo "   acpm 'message'   - Auto-commit with custom message and push"
echo "   gac 'message'    - Git add all and commit (no push)"
echo "   gacp 'message'   - Git add all, commit, and push"
echo "   status           - Quick git status"
echo "   quickcommit      - Run the auto-commit.sh script"
echo ""
echo "💡 To apply now: source ~/.zshrc"
