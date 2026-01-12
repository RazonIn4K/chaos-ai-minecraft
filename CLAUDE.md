# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chaos AI Minecraft is a multi-AI integration system where three AI models (Claude, GPT, Gemini) exist as interactive characters in a Minecraft world. The system orchestrates AI personalities that interact with players, coordinate as a team, and trigger dynamic chaos events.

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
│  (Claude/GPT/Gemini as player bots)                        │
└─────────────────────────────────────────────────────────────┘
```

**Key Components:**
- `ai-controller/` - Python FastAPI service for AI orchestration and RCON commands
- `ai-bots/` - Node.js Mineflayer bots that join as players (one per AI persona)
  - `claude-bot/` - TheOracle (Claude 3.5 Haiku)
  - `openai-bot/` - TheArchitect (GPT-4o-mini)
  - `gemini-bot/` - TheExplorer (Gemini 2.5 Flash)
- `discord-bot/` - Optional Discord integration

## Build and Run Commands

```bash
# Start all services (from repo root)
docker compose up -d

# View Minecraft server logs
docker logs -f minecraft-chaos

# View AI controller logs
docker logs -f chaos-ai-controller

# Restart all services
docker compose restart

# Stop all services
docker compose down

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

| Persona | Model | Role | In-Game Name |
|---------|-------|------|--------------|
| The Oracle | Claude 3.5 Haiku | Team leader, wise guide | TheOracle |
| The Architect | GPT-4o-mini | Building expert, construction | TheArchitect |
| The Explorer | Gemini 2.5 Flash | Scout, navigation, threats | TheExplorer |

**Important constraint:** AI responses are limited to 100 characters for Minecraft chat.

## In-Game Bot Commands

Players can interact with bots via chat:
- `TheOracle help me find diamonds` - Ask for guidance
- `TheArchitect how do I build a castle?` - Get building advice
- `TheExplorer what's nearby?` - Scout the area
- `follow me` - All bots follow you
- `protect me` - Bots become bodyguards

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
2. Create bot in `ai-bots/` directory following existing structure
3. Extend `ai-bots/shared/base-bot.js` for shared functionality

## Environment Setup

Copy `.env.example` to `.env` and configure:
- API keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`
- RCON password: `RCON_PASSWORD` (change from default)
- Chaos timing: `CHAOS_INTERVAL_MIN`, `CHAOS_INTERVAL_MAX` (hours between events)

## Code Style

- **Python (ai-controller/)**: PEP 8, type hints, async/await patterns
- **JavaScript (ai-bots/)**: ESLint, async/await, JSDoc for complex functions
- **Docker**: Multi-stage builds, non-root users where possible

## Cost-Effective Models

All bots use budget-friendly API tiers:
- Claude 3.5 Haiku (~$0.80/M input, $4/M output)
- GPT-4o-mini (~$0.15/M input, $0.60/M output)
- Gemini 2.5 Flash (free tier available)
