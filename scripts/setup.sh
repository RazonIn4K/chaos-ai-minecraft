#!/bin/bash
# =============================================================================
# CHAOS AI MINECRAFT SERVER - Main Setup Script
# =============================================================================
# Run this on a fresh Ubuntu 22.04/24.04 server
# =============================================================================

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     CHAOS AI MINECRAFT SERVER - Setup                         ║"
echo "║     Multi-AI Integration • Chaos Events • Bot Players        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo ./setup.sh)"
    exit 1
fi

# -----------------------------------------------------------------------------
# 1. SYSTEM UPDATE
# -----------------------------------------------------------------------------
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y
apt install -y curl wget git ufw fail2ban htop jq unzip

# -----------------------------------------------------------------------------
# 2. INSTALL DOCKER
# -----------------------------------------------------------------------------
echo "[2/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose plugin
apt install -y docker-compose-plugin

echo "Docker version: $(docker --version)"
echo "Docker version: $(docker --version)"
# docker compose version check skipped (v2 is standard now)

# -----------------------------------------------------------------------------
# 3. INSTALL NODE.JS (for AI bots)
# -----------------------------------------------------------------------------
echo "[3/8] Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# -----------------------------------------------------------------------------
# 4. CONFIGURE FIREWALL
# -----------------------------------------------------------------------------
echo "[4/8] Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 25565/tcp comment 'Minecraft Java'
ufw allow 25565/udp comment 'Minecraft Java UDP'
ufw allow 19132/udp comment 'Bedrock via Geyser'
ufw allow 8100/tcp comment 'BlueMap Web UI'
# RCON and API should be restricted in production
# ufw allow 25575/tcp comment 'RCON'
# ufw allow 3000/tcp comment 'AI API'
ufw --force enable

echo "Firewall configured:"
ufw status

# -----------------------------------------------------------------------------
# 5. CREATE DIRECTORIES
# -----------------------------------------------------------------------------
echo "[5/8] Creating directory structure..."
INSTALL_DIR=${INSTALL_DIR:-/opt/chaos-minecraft}

mkdir -p ${INSTALL_DIR}
mkdir -p ${INSTALL_DIR}/server/{data,mods,config,backups}
mkdir -p ${INSTALL_DIR}/logs

# Copy files if running from repo
if [ -f "../docker-compose.yml" ]; then
    cp ../docker-compose.yml ${INSTALL_DIR}/server/
    cp -r ../ai-controller ${INSTALL_DIR}/
    cp -r ../ai-bots ${INSTALL_DIR}/
    cp -r ../discord-bot ${INSTALL_DIR}/
    cp ../.env.example ${INSTALL_DIR}/.env.example
fi

# -----------------------------------------------------------------------------
# 6. SETUP ENVIRONMENT
# -----------------------------------------------------------------------------
echo "[6/8] Setting up environment..."

if [ ! -f "${INSTALL_DIR}/.env" ]; then
    if [ -f "${INSTALL_DIR}/.env.example" ]; then
        cp ${INSTALL_DIR}/.env.example ${INSTALL_DIR}/.env
        echo ""
        echo "⚠️  IMPORTANT: Edit ${INSTALL_DIR}/.env with your API keys!"
        echo "    nano ${INSTALL_DIR}/.env"
        echo ""
    fi
fi

# -----------------------------------------------------------------------------
# 7. INSTALL BOT DEPENDENCIES
# -----------------------------------------------------------------------------
echo "[7/8] Installing AI bot dependencies..."

if [ -d "${INSTALL_DIR}/ai-bots/shared" ]; then
    cd ${INSTALL_DIR}/ai-bots/shared
    npm install
fi

# -----------------------------------------------------------------------------
# 8. CREATE MANAGEMENT SCRIPTS
# -----------------------------------------------------------------------------
echo "[8/8] Creating management scripts..."

# Start script
cat > ${INSTALL_DIR}/start.sh << 'SCRIPT'
#!/bin/bash
cd "$(dirname "$0")/server"
echo "Starting Chaos AI Minecraft Server..."
docker compose --env-file ../.env up -d
echo ""
echo "Services starting:"
echo "  - Minecraft: localhost:25565"
echo "  - AI Controller: http://localhost:3000"
echo ""
echo "Check logs: docker logs -f minecraft-chaos"
SCRIPT
chmod +x ${INSTALL_DIR}/start.sh

# Stop script
cat > ${INSTALL_DIR}/stop.sh << 'SCRIPT'
#!/bin/bash
cd "$(dirname "$0")/server"
echo "Stopping all services..."
docker compose down
echo "All services stopped."
SCRIPT
chmod +x ${INSTALL_DIR}/stop.sh

# Restart script
cat > ${INSTALL_DIR}/restart.sh << 'SCRIPT'
#!/bin/bash
cd "$(dirname "$0")/server"
echo "Restarting services..."
docker compose restart
echo "Services restarted."
SCRIPT
chmod +x ${INSTALL_DIR}/restart.sh

# Backup script
cat > ${INSTALL_DIR}/backup.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="$(dirname "$0")/server/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="minecraft_backup_${TIMESTAMP}.tar.gz"

echo "Creating backup: ${BACKUP_NAME}"

# Announce to players
docker exec minecraft-chaos rcon-cli "say §e[Server] Starting backup..." 2>/dev/null || true

# Save world
docker exec minecraft-chaos rcon-cli "save-all" 2>/dev/null || true
sleep 5

# Create backup
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}" -C "$(dirname "$0")/server/data" . 2>/dev/null

# Announce completion
docker exec minecraft-chaos rcon-cli "say §a[Server] Backup complete!" 2>/dev/null || true

# Keep only last 7 backups
cd "${BACKUP_DIR}"
ls -t *.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm

echo "Backup complete: ${BACKUP_DIR}/${BACKUP_NAME}"
SCRIPT
chmod +x ${INSTALL_DIR}/backup.sh

# Whitelist script
cat > ${INSTALL_DIR}/whitelist.sh << 'SCRIPT'
#!/bin/bash
case "$1" in
  add)
    docker exec minecraft-chaos rcon-cli "whitelist add $2"
    ;;
  remove)
    docker exec minecraft-chaos rcon-cli "whitelist remove $2"
    ;;
  list)
    docker exec minecraft-chaos rcon-cli "whitelist list"
    ;;
  *)
    echo "Usage: $0 {add|remove|list} [PlayerName]"
    exit 1
    ;;
esac
SCRIPT
chmod +x ${INSTALL_DIR}/whitelist.sh

# Chaos event script
cat > ${INSTALL_DIR}/chaos-event.sh << 'SCRIPT'
#!/bin/bash
curl -s -X POST http://localhost:3000/chaos/trigger | jq .
SCRIPT
chmod +x ${INSTALL_DIR}/chaos-event.sh

# AI chat script
cat > ${INSTALL_DIR}/ai-chat.sh << 'SCRIPT'
#!/bin/bash
PERSONA=${1:-oracle}
MESSAGE=${2:-"Hello there"}

curl -s -X POST http://localhost:3000/ai/chat \
  -H "Content-Type: application/json" \
  -d "{\"player\": \"Console\", \"message\": \"$MESSAGE\", \"persona\": \"$PERSONA\"}" | jq .
SCRIPT
chmod +x ${INSTALL_DIR}/ai-chat.sh

# Setup cron jobs
echo "[*] Setting up automated tasks..."
(crontab -l 2>/dev/null || true; echo "# Chaos AI Minecraft") | crontab -
(crontab -l 2>/dev/null; echo "0 4 * * * ${INSTALL_DIR}/backup.sh >> /var/log/minecraft-backup.log 2>&1") | crontab -

# -----------------------------------------------------------------------------
# DONE
# -----------------------------------------------------------------------------
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     SETUP COMPLETE!                                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Edit your environment file with API keys:"
echo "   nano ${INSTALL_DIR}/.env"
echo ""
echo "2. Start the server:"
echo "   ${INSTALL_DIR}/start.sh"
echo ""
echo "3. Watch logs until you see 'Done':"
echo "   docker logs -f minecraft-chaos"
echo ""
echo "4. Add players to whitelist:"
echo "   ${INSTALL_DIR}/whitelist.sh add YourName"
echo ""
echo "MANAGEMENT:"
echo "   ${INSTALL_DIR}/start.sh        - Start server"
echo "   ${INSTALL_DIR}/stop.sh         - Stop server"
echo "   ${INSTALL_DIR}/backup.sh       - Manual backup"
echo "   ${INSTALL_DIR}/chaos-event.sh  - Trigger chaos"
echo ""
echo "Server files: ${INSTALL_DIR}"
echo ""
