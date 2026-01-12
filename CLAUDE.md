# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chaos AI Minecraft is a multi-AI integration system where four AI models (Claude, GPT-4, Grok, Gemini) exist as interactive characters in a Minecraft world. The system orchestrates AI personalities that interact with players, compete with each other, and trigger dynamic chaos events.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  MINECRAFT SERVER (Fabric 1.21.1, Port 25565)              │
│      ↕ RCON (Port 25575)                                    │
│  AI CONTROLLER (FastAPI, Port 3000)                        │
│      ↕ API Calls                                            │
│  REDIS (State/Events, Port 6379)                           │
│      ↕ AI API Calls                                         │
│  AI BOTS (Mineflayer) ←→ External AI Services              │
│  (Claude/GPT/Grok/Gemini as player bots)                   │
└─────────────────────────────────────────────────────────────┘
```

**Key Components:**
- `ai-controller/` - Python FastAPI service for AI orchestration and RCON commands
- `ai-bots/` - Node.js Mineflayer bots that join as players (one per AI persona)
- `server/` - Docker Compose configuration and Minecraft server setup
- `discord-bot/` - Optional Discord integration

## Build and Run Commands

```bash
# Start all services
cd server && docker compose up -d

# View Minecraft server logs
docker logs -f minecraft-chaos

# View AI controller logs
docker logs -f chaos-ai-controller

# Restart all services
cd server && docker compose restart

# Stop all services
cd server && docker compose down

# Add player to whitelist
docker exec minecraft-chaos rcon-cli "whitelist add PlayerName"
```

## API Testing

```bash
# Health check
curl http://localhost:3000/health

# Trigger chaos event
curl -X POST http://localhost:3000/chaos/trigger

# Chat with AI persona
curl -X POST http://localhost:3000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"player":"Steve","message":"Hello!","persona":"oracle"}'

# Generate quest for player
curl -X POST http://localhost:3000/quest/generate/PlayerName

# Start AI debate
curl -X POST "http://localhost:3000/ai/debate?topic=Diamonds%20or%20Netherite"
```

## AI Personas

| Persona | Model | Role | Bot Trigger |
|---------|-------|------|-------------|
| The Oracle | Claude (Sonnet 4) | Wise guide, hints, quests | `@oracle` |
| The Architect | GPT-4o | Building advice, construction | `@architect` |
| The Trickster | Grok-Beta | Chaos, pranks, memes | `@trickster` |
| The Warden | Gemini 1.5-Pro | Threat monitoring, balance | `@warden` |

**Important constraint:** AI responses are limited to 100 characters for Minecraft chat.

## Adding Chaos Events

Edit `ai-controller/events.py` and add to the `CHAOS_EVENTS` list:

```python
{
    "name": "Event Name",
    "announce": "§c§l🎉 ANNOUNCEMENT! 🎉",
    "description": "What this event does",
    "commands": ["minecraft command 1", "minecraft command 2"],
    "delay_between": 0.5
}
```

## Adding AI Personas

1. Edit `ai-controller/personas.py` - add to `AI_PERSONAS` dict
2. Create bot in `ai-bots/` directory following `claude-bot/` structure
3. Extend `ai-bots/shared/base-bot.js` for shared functionality

## Environment Setup

Copy `.env.example` to `.env` and configure:
- API keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `GOOGLE_API_KEY`
- RCON password: `RCON_PASSWORD` (change from default)
- Chaos timing: `CHAOS_INTERVAL_MIN`, `CHAOS_INTERVAL_MAX` (hours between events)

## Code Style

- **Python (ai-controller/)**: PEP 8, type hints, async/await patterns
- **JavaScript (ai-bots/)**: ESLint, async/await, JSDoc for complex functions
- **Docker**: Multi-stage builds, non-root users where possible
