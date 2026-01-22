# Chaos AI Minecraft - System Architecture Guide

This document provides a deep dive into the architecture, logic, and data flow of the Chaos AI Minecraft system.

## 1. High-Level Architecture

The system consists of four main distinct components that communicate via TCP/IP and Redis.

```mermaid
graph TD
    Client[Minecraft Client] <--> MC[Minecraft Server (Fabric)]
    MC <--> |RCON (25575)| AI_API[AI Controller (FastAPI)]
    MC <--> |Chat/Events| Bots[AI Bots (Mineflayer)]

    AI_API <--> |State/Logs| Redis[(Redis)]
    AI_API <--> |HTTP| LLMs[AI Providers (Anthropic/OpenAI/Google)]

    Bots <--> |Direct API| LLMs
    Bots <--> |Coordination| AI_API
```

### Components

1.  **Minecraft Server**: The core game server running Fabric 1.21.1.
2.  **AI Controller**: A Python FastAPI service that acts as the "Director". It handles:
    - RCON commands (controlling the world).
    - Chaos Events (random triggers).
    - Chat logging and quest generation.
3.  **Redis**: The central nervous system. Stores:
    - Chat logs (`chat:log`).
    - Event history (`chaos:events`).
    - Active quests (`quest:{player}`).
4.  **AI Bots**: Independent Node.js processes using `mineflayer`. They act as "Agents" inside the game.

---

## 2. Component Analysis

### A. AI Controller (`ai-controller/`)

- **Role**: Orchestrator.
- **Key Files**:
  - `main.py`: Entry point. Exposes endpoints like `/chaos/trigger` and `/ai/chat`.
  - `events.py`: Defines the "Chaos Events" (e.g., Meteor Shower, Gravity Flip). These are executed via raw RCON commands.
  - `personas.py`: Defines the personalities (Oracle, Architect, Explorer) and handles the "Chat" endpoint logic if called via API.

### B. AI Bots (`ai-bots/`)

- **Role**: Autonomous Agents.
- **Framework**: Built on `mineflayer` and `mineflayer-pathfinder`.
- **Behavior**:
  - **Proactive Loop**: Each bot has a `setInterval` loop (20-35s) where it analyzes the environment (nearby mobs, time of day) and decides to Act or Speak.
  - **Survival**: Auto-eaing (`mineflayer-auto-eat`) and auto-equiping best armor.
  - **Interaction**: They listen to chat. If mentioned (or randomly), they query their respective AI model (Claude, GPT-4o, Gemini) for a response.
  - **Configuration**: By default, they follow the player defined in `PRIMARY_PLAYER` env var (default: 'AlikeRazon').

### C. n8n Automation (`n8n-workflows/`)

- **Role**: Scheduler / Cron.
- **Functions**:
  - Triggers Chaos Events every 3 hours.
  - Runs Health Checks every 15 minutes.
  - Initiates AI Debates every 6 hours.
  - Posts Daily Reports to Discord.

---

## 3. Data Flow

### Chat interaction

1.  **Player** types in chat: "TheOracle, help me!"
2.  **Oracle Bot** (Mineflayer) hears the event `chat`.
3.  **Oracle Bot** sends the prompt + context to **Anthropic API**.
4.  **Anthropic API** returns response: "I am coming to you!"
5.  **Oracle Bot** speaks in-game via `bot.chat()`.

### Chaos Event

1.  **n8n** (or curl) calls `POST /chaos/trigger`.
2.  **AI Controller** selects a random event from `events.py` (e.g., "Gravity Flip").
3.  **AI Controller** sends title command via RCON: `title @a title "GRAVITY FLIP"`.
4.  **AI Controller** executes effect commands via RCON: `effect give @a levitation 10`.
5.  **Redis** logs the event.

---

## 4. Customization

### Adding a New Bot

1.  Create a folder in `ai-bots/` (e.g., `warrior-bot`).
2.  Extend `AIBot` class from `shared/base-bot.js`.
3.  Implement `setupProactiveLoop` with combat logic.
4.  Add container to `docker-compose.yml`.

### Adding a Chaos Event

1.  Edit `ai-controller/events.py`.
2.  Add a new dict to `CHAOS_EVENTS` list:
    ```python
    {
        "name": "Slime Rain",
        "announce": "Squishy sounds from above...",
        "commands": ["execute at @r run summon slime ~ ~20 ~"],
        "delay_between": 0.2
    }
    ```

### Changing Primary Player

- Update `PRIMARY_PLAYER` in `.env`.
- Restart bots: `docker compose restart ai-bots`.

---

## 5. Security & Deployment

- **Ports**: 25565 (Game), 3000 (API), 6379 (Redis).
- **Firewall**: In production, ONLY 25565 should be public. Port 3000 and 6379 should be internal or firewall-restricted.
- **Secrets**: All API keys and RCON passwords are in `.env`. **Do not commit this file.**
