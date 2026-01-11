"""
CHAOS AI CONTROLLER
Central orchestration API for multi-AI Minecraft integration
"""

import os
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import redis.asyncio as redis

from personas import AI_PERSONAS, get_ai_response
from events import CHAOS_EVENTS, trigger_chaos_event
from minecraft import rcon_command, mc_say, mc_title, get_online_players
from quests import generate_quest


# =============================================================================
# CONFIGURATION
# =============================================================================

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# =============================================================================
# REDIS CONNECTION
# =============================================================================

redis_pool = None

async def get_redis():
    global redis_pool
    if redis_pool is None:
        redis_pool = redis.from_url(REDIS_URL, decode_responses=True)
    return redis_pool

# =============================================================================
# FASTAPI APP
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    print("🚀 Chaos AI Controller starting...")
    # Initialize Redis connection
    await get_redis()
    yield
    # Cleanup
    global redis_pool
    if redis_pool:
        await redis_pool.close()
    print("👋 Chaos AI Controller shutting down...")

app = FastAPI(
    title="Chaos AI Controller",
    description="Multi-AI Minecraft orchestration API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class ChatMessage(BaseModel):
    player: str
    message: str
    persona: str = "oracle"

class CommandRequest(BaseModel):
    command: str

class AnnounceRequest(BaseModel):
    message: str
    title: bool = False
    color: str = "white"

# =============================================================================
# HEALTH & STATUS ENDPOINTS
# =============================================================================

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Chaos AI Controller",
        "version": "1.0.0",
        "status": "online",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    # Check RCON connection
    try:
        result = rcon_command("list")
        rcon_status = "ok" if "players" in result.lower() else "error"
    except Exception as e:
        rcon_status = f"error: {str(e)}"
    
    # Check Redis connection
    try:
        r = await get_redis()
        await r.ping()
        redis_status = "ok"
    except Exception as e:
        redis_status = f"error: {str(e)}"
    
    return {
        "status": "healthy" if rcon_status == "ok" and redis_status == "ok" else "degraded",
        "rcon": rcon_status,
        "redis": redis_status,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/players")
async def get_players():
    """Get online players"""
    result = rcon_command("list")
    players = get_online_players(result)
    return {
        "raw": result,
        "players": players,
        "count": len(players)
    }

# =============================================================================
# AI CHAT ENDPOINTS
# =============================================================================

@app.get("/ai/personas")
async def list_personas():
    """List available AI personas"""
    return {
        persona: {
            "name": config["name"],
            "model": config["model"],
            "color": config["color"],
            "description": config["system"][:100] + "..."
        }
        for persona, config in AI_PERSONAS.items()
    }

@app.post("/ai/chat")
async def ai_chat(msg: ChatMessage):
    """Chat with an AI persona"""
    if msg.persona not in AI_PERSONAS:
        raise HTTPException(status_code=400, detail=f"Unknown persona: {msg.persona}")
    
    response = await get_ai_response(msg.persona, msg.message, msg.player)
    
    # Send to Minecraft
    persona_config = AI_PERSONAS[msg.persona]
    name = persona_config["name"]
    color = persona_config["color"]
    
    mc_say(f"§7[{name}]§r {response}", color)
    
    # Log to Redis
    r = await get_redis()
    await r.lpush("chat:log", f"{datetime.now().isoformat()}|{msg.persona}|{msg.player}|{msg.message}|{response}")
    await r.ltrim("chat:log", 0, 999)  # Keep last 1000 messages
    
    return {
        "persona": msg.persona,
        "name": name,
        "response": response,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/ai/debate")
async def ai_debate(topic: str = Query(..., description="Topic for the AIs to debate")):
    """Have all AIs debate a topic"""
    responses = {}
    
    # Announce debate start
    mc_title("§d§l🎭 AI DEBATE 🎭", f"§7Topic: {topic[:50]}")
    await asyncio.sleep(2)
    
    for persona in ["oracle", "trickster", "architect", "warden"]:
        prompt = f"Give your brief opinion on this Minecraft debate topic: {topic}"
        response = await get_ai_response(persona, prompt, "Debate")
        responses[persona] = response
        
        # Send to Minecraft with delay
        persona_config = AI_PERSONAS[persona]
        mc_say(f"§7[{persona_config['name']}]§r {response}")
        await asyncio.sleep(3)  # Delay between responses
    
    # Log debate
    r = await get_redis()
    await r.lpush("debates:log", f"{datetime.now().isoformat()}|{topic}|{responses}")
    
    return {
        "topic": topic,
        "responses": responses,
        "timestamp": datetime.now().isoformat()
    }

# =============================================================================
# CHAOS EVENT ENDPOINTS
# =============================================================================

@app.get("/chaos/events")
async def list_chaos_events():
    """List all available chaos events"""
    return {
        "events": [
            {"name": event["name"], "announce": event["announce"]}
            for event in CHAOS_EVENTS
        ],
        "count": len(CHAOS_EVENTS)
    }

@app.post("/chaos/trigger")
async def trigger_chaos(
    background_tasks: BackgroundTasks,
    event_name: Optional[str] = Query(None, description="Specific event to trigger")
):
    """Trigger a chaos event (random or specific)"""
    event = await trigger_chaos_event(event_name)
    
    # Log to Redis
    r = await get_redis()
    await r.lpush("chaos:events", f"{datetime.now().isoformat()}|{event['name']}")
    await r.ltrim("chaos:events", 0, 99)  # Keep last 100 events
    
    return {
        "event": event["name"],
        "status": "triggered",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/chaos/history")
async def chaos_history(limit: int = Query(10, ge=1, le=100)):
    """Get chaos event history"""
    r = await get_redis()
    events = await r.lrange("chaos:events", 0, limit - 1)
    return {
        "events": events,
        "count": len(events)
    }

# =============================================================================
# QUEST ENDPOINTS
# =============================================================================

@app.post("/quest/generate/{player}")
async def generate_player_quest(player: str):
    """Generate a quest for a player"""
    quest = await generate_quest(player)
    
    # Announce in game
    mc_title(f"§6NEW QUEST", f"§e{quest['title']}")
    mc_say(f"§7[The Oracle]§r {player}, your quest: {quest['description']}")
    
    # Store in Redis
    r = await get_redis()
    await r.hset(f"quest:{player}", mapping=quest)
    
    return quest

@app.get("/quest/{player}")
async def get_player_quest(player: str):
    """Get active quest for a player"""
    r = await get_redis()
    quest = await r.hgetall(f"quest:{player}")
    if not quest:
        raise HTTPException(status_code=404, detail=f"No active quest for {player}")
    return quest

@app.delete("/quest/{player}")
async def complete_quest(player: str):
    """Mark a quest as complete"""
    r = await get_redis()
    quest = await r.hgetall(f"quest:{player}")
    if not quest:
        raise HTTPException(status_code=404, detail=f"No active quest for {player}")
    
    await r.delete(f"quest:{player}")
    mc_say(f"§a✓ {player} has completed: {quest.get('title', 'Unknown Quest')}!")
    
    return {"status": "completed", "quest": quest}

# =============================================================================
# RCON & ANNOUNCEMENTS
# =============================================================================

@app.post("/rcon")
async def execute_rcon(req: CommandRequest):
    """Execute raw RCON command"""
    result = rcon_command(req.command)
    return {
        "command": req.command,
        "result": result,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/announce")
async def announce(req: AnnounceRequest):
    """Announce message to all players"""
    if req.title:
        mc_title(req.message)
    else:
        mc_say(req.message, req.color)
    return {"status": "sent", "message": req.message}

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
