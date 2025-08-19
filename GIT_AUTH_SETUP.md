# Git CLI Authentication Setup Guide

## 🔐 **Authentication Methods for Git CLI**

### **Method 1: Personal Access Token (HTTPS) - Recommended**

#### Setup Steps:
1. **Create Personal Access Token on GitHub:**
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo`, `workflow`, `write:packages`
   - Copy the generated token (save it securely!)

2. **Configure Git Credential Helper:**
   ```bash
   # For macOS (using Keychain)
   git config --global credential.helper osxkeychain
   
   # For Linux (using cache)
   git config --global credential.helper cache
   
   # For Windows (using manager)
   git config --global credential.helper manager
   ```

3. **First Push (will prompt for credentials):**
   ```bash
   git push origin main
   # Username: your-github-username
   # Password: your-personal-access-token (not your GitHub password!)
   ```

#### Usage:
```bash
./auth-commit.sh "Your commit message"           # Auto-detects token auth
./auth-commit.sh "Your commit message" --token   # Force token auth
```

---

### **Method 2: SSH Key Authentication**

#### Setup Steps:
1. **Generate SSH Key:**
   ```bash
   ssh-keygen -t ed25519 -C "your-email@example.com"
   # Press Enter for default location (~/.ssh/id_ed25519)
   # Set a passphrase (optional but recommended)
   ```

2. **Add SSH Key to SSH Agent:**
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

3. **Add Public Key to GitHub:**
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # Copy the output and add to GitHub Settings → SSH and GPG keys
   ```

4. **Change Remote URL to SSH:**
   ```bash
   git remote set-url origin git@github.com:SDG223157/unified_prombank_mcp.git
   ```

#### Usage:
```bash
./auth-commit.sh "Your commit message" --ssh     # Use SSH authentication
```

---

### **Method 3: Git Credential Helper**

#### Setup Steps:
1. **Configure Credential Helper:**
   ```bash
   # Store credentials permanently (less secure)
   git config --global credential.helper store
   
   # Or cache for 1 hour (more secure)
   git config --global credential.helper 'cache --timeout=3600'
   ```

2. **First Push (stores credentials):**
   ```bash
   git push origin main
   # Enter username and personal access token once
   ```

#### Usage:
```bash
./auth-commit.sh "Your commit message" --credential-helper
```

---

## 🚀 **Quick Setup Commands**

### **Current Status Check:**
```bash
# Check current user config
git config --global user.name
git config --global user.email

# Check remote URL
git remote -v

# Check credential helper
git config --get credential.helper
```

### **Quick Token Setup:**
```bash
# Set up credential helper for macOS
git config --global credential.helper osxkeychain

# Set user info (if not already set)
git config --global user.name "SDG223157"
git config --global user.email "isky999@gmail.com"
```

### **Quick SSH Setup:**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "isky999@gmail.com"

# Add to SSH agent
ssh-add ~/.ssh/id_ed25519

# Change remote to SSH
git remote set-url origin git@github.com:SDG223157/unified_prombank_mcp.git
```

---

## 🔧 **Available Scripts**

### **1. Basic Auto-commit (existing):**
```bash
git acp                                          # Timestamp commit
git acpm "Your message"                          # Custom message
```

### **2. Smart Auto-commit:**
```bash
./auto-commit.sh                                 # Smart message generation
./auto-commit.sh "Custom message"                # Custom message
```

### **3. Authenticated Auto-commit (new):**
```bash
./auth-commit.sh                                 # Auto-detect auth method
./auth-commit.sh "Message"                       # With custom message
./auth-commit.sh "Message" --token               # Force token auth
./auth-commit.sh "Message" --ssh                 # Force SSH auth
./auth-commit.sh "Message" --credential-helper   # Force credential helper
```

---

## 🔍 **Troubleshooting**

### **Issue: "Authentication failed"**
**Solution:**
```bash
# Check if using personal access token (not password)
# For HTTPS: Username = GitHub username, Password = Personal Access Token
# Update stored credentials:
git config --global --unset credential.helper
git config --global credential.helper osxkeychain
```

### **Issue: "Permission denied (publickey)"**
**Solution:**
```bash
# Test SSH connection
ssh -T git@github.com

# Add SSH key to agent
ssh-add ~/.ssh/id_ed25519

# Verify SSH key is added to GitHub account
```

### **Issue: "Could not read from remote repository"**
**Solution:**
```bash
# Check remote URL
git remote -v

# For HTTPS (with token):
git remote set-url origin https://github.com/SDG223157/unified_prombank_mcp.git

# For SSH:
git remote set-url origin git@github.com:SDG223157/unified_prombank_mcp.git
```

---

## 🎯 **Recommended Setup for You**

Based on your current configuration, I recommend:

1. **Keep using HTTPS with Personal Access Token** (most reliable)
2. **Set up credential helper** to avoid repeated prompts:
   ```bash
   git config --global credential.helper osxkeychain
   ```
3. **Use the authenticated script** for automated commits:
   ```bash
   ./auth-commit.sh "Your commit message"
   ```

---

## 📋 **Security Best Practices**

1. **Personal Access Tokens:**
   - Use minimal required scopes
   - Set expiration dates
   - Regularly rotate tokens
   - Never share tokens in code or logs

2. **SSH Keys:**
   - Use strong passphrases
   - Use ed25519 keys (more secure than RSA)
   - Regularly rotate keys
   - Use SSH agent with timeout

3. **Credential Storage:**
   - Use secure credential helpers
   - Avoid storing credentials in plain text
   - Use short cache timeouts for shared machines

---

**Ready for secure, authenticated Git operations!** 🔐
