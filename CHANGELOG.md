# Changelog

All notable changes to the Chaos AI Minecraft project are documented here.

## [1.1.0] - 2025-01-12

### Added

#### Complete AI Bot Trio
- **TheArchitect** (`ai-bots/openai-bot/index.js`) - GPT-4o-mini powered building expert
  - Specializes in construction advice, resource gathering, and base planning
  - Responds to building-related questions from players
  - Cost-effective model selection for extended gameplay

- **TheExplorer** (`ai-bots/gemini-bot/index.js`) - Gemini 2.5 Flash powered scout
  - Specializes in area reconnaissance, threat detection, and pathfinding
  - Reports nearby dangers and points of interest
  - Fastest response times of the trio

#### Bot Features (All Bots)
- **Spam Prevention**: 30-second cooldown on hurt callouts to prevent chat flooding
- **Player Greeting**: Bots greet players when they join the server
- **Auto-Follow**: Bots automatically follow the designated player on spawn
- **Team Coordination**: Bots communicate with each other and coordinate actions
- **Cost-Effective Models**: All bots use budget-friendly API tiers

#### Documentation
- `CHANGELOG.md` - This file, tracking all project changes
- Updated `README.md` with accurate bot information and commands
- Updated `AGENTS.md` with complete bot documentation

### Changed

#### TheOracle Updates (`ai-bots/claude-bot/index.js`)
- Upgraded from basic implementation to full-featured bot
- Changed model from `claude-sonnet-4` to `claude-3-5-haiku-20241022` (75% cost reduction)
- Added spam prevention with `lastHurtCallout` cooldown
- Added `setupPlayerJoinListener()` for welcoming players
- Added team coordination callouts

#### Package Configuration (`ai-bots/shared/package.json`)
- Fixed script paths: `gpt-bot` → `openai-bot`
- Added `explorer` script for Gemini bot
- Updated `all` script to run all three bots concurrently

### Removed

#### Duplicate Files
- `server/docker-compose.yml` - Was exact duplicate of root `docker-compose.yml`

#### Stray Directories
- `{server,ai-controller,ai-bots` - Brace expansion artifact

### Fixed

- Documentation now accurately reflects the three-bot architecture
- Removed references to non-existent Grok bot ("The Trickster")
- Removed references to non-existent Warden bot
- Fixed project structure in README to show correct directory names

---

## [1.0.0] - 2025-01-10

### Added
- Initial project structure
- Minecraft server with Docker (itzg/minecraft-server)
- AI Controller (FastAPI) for chat, chaos events, and quests
- TheOracle Claude bot (basic implementation)
- Discord bot integration (optional)
- n8n workflow automation
- Setup script for DigitalOcean deployment
- Chaos events system (meteor showers, phantom plagues, etc.)

---

## Development Artifacts Cleaned (2025-01-12)

The following files were removed from `/tmp/` during codebase cleanup:

### Bot Iterations (16 files deleted)
- `enhanced-oracle.js`, `enhanced-oracle-v2.js`
- `oracle-bot-fixed.js`
- `architect-bot.js`, `architect-bot-v2.js`, `architect-bot-fixed.js`
- `explorer-bot.js`, `explorer-bot-fixed.js`
- `collaborative-oracle.js`, `collaborative-architect.js`, `collaborative-explorer.js`
- `chatty-oracle.js`, `chatty-architect.js`, `chatty-explorer.js`
- `action-executor.js`, `goal-manager.js`

### Unrelated Files (~1.7GB deleted)
- `l4d2_ai_deploy/` directory (Left 4 Dead 2 AI - wrong project)
- `l4d2-training-*.tar.gz`, `l4d2_ai.tar.gz`, `l4d2_ai.b64`
- `llama.cpp/` repository (152MB)
- Various log files (`director_*.log`, `bot_*.log`, `export_*.log`)
- Python prototypes (`multi_personality.py`, `compact_ai.py`)
- Miscellaneous development artifacts

---

## API Costs Comparison

| Bot | Previous Model | Current Model | Approx. Savings |
|-----|---------------|---------------|-----------------|
| TheOracle | claude-sonnet-4 | claude-3-5-haiku | ~75% |
| TheArchitect | gpt-4o | gpt-4o-mini | ~95% |
| TheExplorer | gemini-2.5-flash | gemini-2.5-flash | (already optimal) |

---

## File Structure (Post-Cleanup)

```
chaos-ai-minecraft/
├── docker-compose.yml          # Single Docker orchestration
├── README.md                   # Project overview and usage
├── AGENTS.md                   # AI agent documentation
├── CLAUDE.md                   # Claude Code configuration
├── CHANGELOG.md                # This file
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # MIT License
├── .env.example                # Environment template
├── .gitignore                  # Git ignore patterns
│
├── ai-bots/                    # Mineflayer AI bots
│   ├── claude-bot/
│   │   └── index.js            # TheOracle (Claude 3.5 Haiku)
│   ├── openai-bot/
│   │   └── index.js            # TheArchitect (GPT-4o-mini)
│   ├── gemini-bot/
│   │   └── index.js            # TheExplorer (Gemini 2.5 Flash)
│   └── shared/
│       ├── base-bot.js         # Shared bot framework
│       └── package.json        # Node.js dependencies
│
├── ai-controller/              # FastAPI orchestration service
│   ├── main.py                 # API endpoints
│   ├── events.py               # Chaos event system
│   ├── personas.py             # AI character definitions
│   ├── minecraft.py            # RCON commands
│   ├── quests.py               # Quest generation
│   ├── Dockerfile              # Container build
│   └── requirements.txt        # Python dependencies
│
├── discord-bot/                # Optional Discord integration
│   ├── bot.py                  # Discord bot
│   ├── Dockerfile              # Container build
│   └── requirements.txt        # Python dependencies
│
├── n8n-workflows/
│   └── chaos-automation.json   # Automation workflows
│
├── scripts/
│   └── setup.sh                # Server provisioning
│
├── server/
│   ├── config/                 # Server configuration (empty)
│   └── mods/                   # Server mods (empty)
│
└── docs/
    └── images/                 # Documentation assets (empty)
```
