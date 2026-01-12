# AGENTS.md

This repository hosts a multi-service Minecraft server stack with AI-driven gameplay and automation. Use this file as a quick orientation for where things live, how services connect, and what is ready vs placeholder.

## Architecture summary

- Minecraft server runs in Docker (itzg/minecraft-server). RCON is enabled for automation and AI control.
- Redis is used by the AI controller for state and event logs.
- AI controller (FastAPI) exposes HTTP endpoints for chat, chaos events, and quests.
- Mineflayer bots connect as player clients (Node.js). Only the Claude bot is implemented in this repo.
- Discord bot (Python) calls the AI controller API to expose slash commands.
- n8n workflow file schedules chaos events, health checks, debates, and daily reports.

## Top-level layout

- `README.md`: high-level overview, quick start, and architecture diagram.
- `LICENSE`, `CONTRIBUTING.md`: project metadata and contribution guidance.
- `.env.example`: environment template for server, API keys, bot names, and feature flags.
- `docker-compose.yml`: compose stack definition (see note in "Known gaps" below).
- `server/`: runtime server assets and compose file for production installs.
  - `server/docker-compose.yml`: stack definition used by the setup script.
  - `server/config/`, `server/mods/`: placeholders for server config and mod files.
- `ai-controller/`: FastAPI service.
  - `ai-controller/main.py`: API endpoints for health, chat, debate, chaos events, and quests.
  - `ai-controller/events.py`: chaos event definitions and trigger logic.
  - `ai-controller/minecraft.py`: RCON helpers (chat, titles, player and world commands).
  - `ai-controller/personas.py`: persona definitions and AI provider calls.
  - `ai-controller/quests.py`: AI-backed and template quest generation.
  - `ai-controller/requirements.txt`, `ai-controller/Dockerfile`: service dependencies and container build.
- `ai-bots/`: Mineflayer bots.
  - `ai-bots/shared/base-bot.js`: shared bot framework (movement, combat, mining, chat).
  - `ai-bots/shared/package.json`: Node dependencies and bot scripts.
  - `ai-bots/claude-bot/index.js`: Claude-based Oracle bot implementation.
- `discord-bot/`: Discord integration.
  - `discord-bot/bot.py`: slash commands and background status checks.
  - `discord-bot/requirements.txt`, `discord-bot/Dockerfile`: dependencies and container build.
- `n8n-workflows/chaos-automation.json`: n8n automation for chaos events, health checks, debates, daily reports.
- `scripts/setup.sh`: provision and install script (creates /opt/chaos-minecraft and helper scripts).
- `docs/` and `docs/images/`: placeholders for documentation assets.
- `{server,ai-controller,ai-bots`: stray directory created by brace expansion (see note below).

## Service ports and dependencies

- Minecraft: `25565/tcp` (Java), `19132/udp` (Bedrock via Geyser), `25575/tcp` (RCON), `8100/tcp` (BlueMap).
- AI controller: `3000/tcp` (FastAPI HTTP API).
- Redis: `6379/tcp` (internal state for AI controller).

## Environment configuration

See `.env.example` for the full list. The important groups are:

- Minecraft server settings (version, name, MOTD, difficulty, memory).
- RCON credentials (required for the AI controller).
- AI API keys (Anthropic, OpenAI, XAI, Google).
- Discord bot credentials (token, guild, channel IDs).
- Feature flags (enable chaos events, debates, bots, quests).

## Running services

- Provisioning: `scripts/setup.sh` is for a fresh Ubuntu server and installs into `/opt/chaos-minecraft`.
- Compose stack (after provisioning): `/opt/chaos-minecraft/server/docker-compose.yml` is the intended file.
- Local dev, from repo root:
  - `docker compose -f server/docker-compose.yml --env-file .env up -d`
- AI controller dev:
  - From `ai-controller/`: `uvicorn main:app --host 0.0.0.0 --port 3000`
- Claude bot dev:
  - From `ai-bots/shared/`: `npm install`
  - Run bot: `node ../claude-bot/index.js`
- Discord bot dev:
  - From `discord-bot/`: `python bot.py`
- n8n: import `n8n-workflows/chaos-automation.json` into your n8n instance.

## Known gaps and oddities

- `ai-bots/shared/package.json` references `gpt-bot`, `grok-bot`, and `gemini-bot`, but only `ai-bots/claude-bot` exists in this repo.
- `docker-compose.yml` at repo root uses `../ai-controller` and `../discord-bot` build contexts; the setup script expects the compose file to live under `/opt/chaos-minecraft/server` where these relative paths resolve. Prefer `server/docker-compose.yml` when running from the repo.
- `server/config/`, `server/mods/`, `docs/`, and `docs/images/` contain only `.gitkeep` placeholders.
- `{server,ai-controller,ai-bots` is a stray directory created by brace expansion; it contains `{claude-bot,grok-bot,gpt-bot,gemini-bot,shared},discord-bot,n8n-workflows,docs,scripts,.github/workflows}` which is empty.
- No automated tests are present in the repo.
