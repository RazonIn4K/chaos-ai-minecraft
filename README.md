# 🌪️ Chaos AI Minecraft Server

A Minecraft server where **multiple AI models exist as characters in your world**, interact with players, compete with each other, and dynamically shape gameplay.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Minecraft](https://img.shields.io/badge/Minecraft-1.21.1-green.svg)](https://www.minecraft.net/)
[![Docker](https://img.shields.io/badge/Docker-Required-blue.svg)](https://www.docker.com/)

![Chaos AI Banner](docs/images/banner.png)

## 🎯 Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CHAOS AI MINECRAFT ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │   MINECRAFT     │     │   AI CONTROLLER │     │    AI BOTS      │       │
│  │   (Fabric)      │◄───►│   (FastAPI)     │◄───►│  (Mineflayer)   │       │
│  │   Port 25565    │     │   Port 3000     │     │  Join as players│       │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘       │
│           │                       │                        │                │
│           │ RCON                  │ API                    │ AI Calls       │
│           ▼                       ▼                        ▼                │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                         REDIS (State/Events)                     │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│           │                       │                        │                │
│           ▼                       ▼                        ▼                │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │     CLAUDE      │     │      GPT        │     │     GEMINI      │       │
│  │   "The Oracle"  │     │ "The Architect" │     │  "The Explorer" │       │
│  │   Team Leader   │     │ Building Expert │     │  Scout/Navigator│       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🤖 AI Characters

| Character | Model | Role | Capabilities |
|-----------|-------|------|--------------|
| **The Oracle** | Claude 3.5 Haiku | Team Leader | Wise guidance, team coordination, strategic planning |
| **The Architect** | GPT-4o-mini | Building Expert | Construction advice, resource gathering, base planning |
| **The Explorer** | Gemini 2.5 Flash | Scout/Navigator | Area reconnaissance, threat detection, pathfinding |

All bots join as actual players using Mineflayer and respond to in-game chat!

## ⚡ Chaos Events

Random events trigger every 2-4 hours:

- ☄️ **Meteor Shower** - Fireballs rain from sky
- 👻 **Phantom Plague** - Phantoms spawn everywhere (even daytime)
- ✨ **Golden Hour** - Luck boost + free golden apples
- 🔄 **Gravity Flip** - Everyone levitates briefly
- 🎉 **Mob Rave** - Named mobs spawn, everyone glows
- 💎 **Treasure Drop** - Items fall from sky
- ⚡ **Speed Demon** - Massive speed boost
- 💥 **Creeper Convention** - Named creepers spawn

## 🚀 Quick Start

### Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose
- API Keys: Anthropic (Claude), OpenAI, Google (Gemini)
- A server (DigitalOcean, AWS, or local machine)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/chaos-ai-minecraft.git
cd chaos-ai-minecraft

# Copy environment template
cp .env.example .env

# Edit with your API keys
nano .env

# Run the setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start everything
docker compose up -d
```

### Connect

- **Minecraft Java**: `YOUR_SERVER_IP:25565`
- **Minecraft Bedrock**: `YOUR_SERVER_IP:19132`
- **AI API**: `http://YOUR_SERVER_IP:3000`
- **BlueMap**: `http://YOUR_SERVER_IP:8100`

## 📁 Project Structure

```
chaos-ai-minecraft/
├── docker-compose.yml      # Main Docker composition
├── ai-controller/          # FastAPI AI orchestration service
│   ├── main.py             # API endpoints
│   ├── events.py           # Chaos event definitions
│   ├── personas.py         # AI character definitions
│   └── Dockerfile
├── ai-bots/                # Mineflayer AI player bots
│   ├── shared/             # Shared bot framework & dependencies
│   ├── claude-bot/         # The Oracle (Claude)
│   ├── openai-bot/         # The Architect (GPT-4o-mini)
│   └── gemini-bot/         # The Explorer (Gemini)
├── discord-bot/            # Discord integration (optional)
├── n8n-workflows/          # Automation workflows
├── scripts/                # Setup and management scripts
└── docs/                   # Documentation
```

## 🎮 Usage

### In-Game Chat Commands

Talk directly to the bots in-game! They respond to their names:

```
TheOracle help me find diamonds
TheArchitect how do I build a castle?
TheExplorer what's nearby?
follow me                    # All bots follow you
protect me                   # Bots become bodyguards
help                        # Show available commands
```

### API Endpoints

```bash
# Trigger chaos event
curl -X POST http://localhost:3000/chaos/trigger

# Chat with AI
curl -X POST http://localhost:3000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"player": "Steve", "message": "Hello!", "persona": "oracle"}'

# Start AI debate
curl -X POST "http://localhost:3000/ai/debate?topic=Diamonds%20or%20Netherite"

# Generate quest
curl -X POST http://localhost:3000/quest/generate/PlayerName
```

### Management Scripts

```bash
./scripts/start.sh          # Start all services
./scripts/stop.sh           # Stop all services
./scripts/backup.sh         # Manual backup
./scripts/whitelist.sh add PlayerName
./scripts/chaos-event.sh    # Trigger random event
```

## 💰 Cost Estimate

| Component | Monthly Cost |
|-----------|--------------|
| DigitalOcean 8GB Droplet | $48 |
| AI APIs (estimated usage) | $15-30 |
| **Total** | **~$60-80** |

## 📖 Documentation

- [Full Setup Guide](docs/SETUP.md)
- [AI Configuration](docs/AI_CONFIG.md)
- [Chaos Events](docs/CHAOS_EVENTS.md)
- [Discord Bot](docs/DISCORD_BOT.md)
- [n8n Integration](docs/N8N_INTEGRATION.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🔒 Security

- All API keys stored in environment variables
- RCON restricted to localhost by default
- Whitelist enabled and enforced
- fail2ban installed for SSH protection
- See [Security Guide](docs/SECURITY.md) for hardening tips

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- [itzg/minecraft-server](https://github.com/itzg/docker-minecraft-server) - Docker image
- [Mineflayer](https://github.com/PrismarineJS/mineflayer) - Bot framework
- [PaperMC](https://papermc.io/) / [Fabric](https://fabricmc.net/) - Server software
- Anthropic, OpenAI, Google - AI APIs

---

**Built for maximum chaos. Have fun! 🌪️**
