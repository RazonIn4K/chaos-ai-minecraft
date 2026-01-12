"""
CHAOS EVENTS
Defines all the random chaos events that can trigger in the world
"""

import random
import asyncio
from typing import Optional
from minecraft import rcon_command, mc_say, mc_title

# =============================================================================
# CHAOS EVENT DEFINITIONS
# =============================================================================

CHAOS_EVENTS = [
    {
        "name": "Meteor Shower",
        "announce": "§c§l☄ METEOR SHOWER INCOMING! ☄",
        "description": "Fireballs rain from the sky!",
        "commands": [
            "execute at @r run summon minecraft:fireball ~ ~50 ~ {Motion:[0.0,-1.0,0.0]}",
            "execute at @r run summon minecraft:fireball ~ ~50 ~ {Motion:[0.0,-1.0,0.0]}",
            "execute at @r run summon minecraft:fireball ~ ~50 ~ {Motion:[0.0,-1.0,0.0]}",
            "execute at @r run summon minecraft:fireball ~ ~55 ~ {Motion:[0.0,-1.0,0.0]}",
            "execute at @r run summon minecraft:fireball ~ ~55 ~ {Motion:[0.0,-1.0,0.0]}"
        ],
        "delay_between": 0.5
    },
    {
        "name": "Phantom Plague",
        "announce": "§5§l👻 THE PHANTOMS HAVE AWAKENED! 👻",
        "description": "Phantoms spawn everywhere - even in daytime!",
        "commands": [
            "execute at @a run summon minecraft:phantom ~ ~10 ~",
            "execute at @a run summon minecraft:phantom ~ ~15 ~",
            "execute at @a run summon minecraft:phantom ~ ~12 ~ {Size:2}"
        ],
        "delay_between": 1.0
    },
    {
        "name": "Golden Hour",
        "announce": "§e§l✨ GOLDEN HOUR! Everything shines! ✨",
        "description": "Luck boost and free golden apples!",
        "commands": [
            "give @a minecraft:golden_apple 2",
            "effect give @a minecraft:luck 300 2",
            "effect give @a minecraft:glowing 60 0"
        ],
        "delay_between": 0.5
    },
    {
        "name": "Gravity Flip",
        "announce": "§b§l🔄 GRAVITY FLUCTUATION DETECTED! 🔄",
        "description": "Everyone starts floating!",
        "commands": [
            "effect give @a minecraft:levitation 10 1",
            "execute at @a run particle minecraft:end_rod ~ ~ ~ 1 1 1 0.1 50",
            "effect give @a minecraft:slow_falling 30 1"
        ],
        "delay_between": 0.5
    },
    {
        "name": "Mob Rave",
        "announce": "§d§l🎉 MOB RAVE PARTY! 🎉",
        "description": "Named mobs spawn and everyone glows!",
        "commands": [
            "execute at @r run summon minecraft:zombie ~ ~ ~ {CustomName:'\"DJ Zombie\"',CustomNameVisible:1b}",
            "execute at @r run summon minecraft:skeleton ~ ~ ~ {CustomName:'\"MC Skeleton\"',CustomNameVisible:1b}",
            "execute at @r run summon minecraft:spider ~ ~ ~ {CustomName:'\"Break Dancer\"',CustomNameVisible:1b}",
            "effect give @a minecraft:glowing 60 1",
            "effect give @a minecraft:speed 60 1"
        ],
        "delay_between": 0.8
    },
    {
        "name": "Treasure Drop",
        "announce": "§6§l💎 TREASURE FROM THE SKY! 💎",
        "description": "Valuable items fall from above!",
        "commands": [
            "execute at @r run summon minecraft:item ~ ~20 ~ {Item:{id:\"minecraft:diamond\",Count:3b}}",
            "execute at @r run summon minecraft:item ~ ~20 ~ {Item:{id:\"minecraft:emerald\",Count:5b}}",
            "execute at @r run summon minecraft:item ~ ~25 ~ {Item:{id:\"minecraft:netherite_scrap\",Count:1b}}",
            "execute at @r run summon minecraft:item ~ ~22 ~ {Item:{id:\"minecraft:golden_apple\",Count:2b}}"
        ],
        "delay_between": 0.3
    },
    {
        "name": "Speed Demon",
        "announce": "§a§l⚡ SPEED DEMON MODE ACTIVATED! ⚡",
        "description": "Massive speed and haste boost!",
        "commands": [
            "effect give @a minecraft:speed 120 3",
            "effect give @a minecraft:haste 120 2",
            "effect give @a minecraft:jump_boost 120 2"
        ],
        "delay_between": 0.5
    },
    {
        "name": "Creeper Convention",
        "announce": "§2§l💥 CREEPER CONVENTION IN SESSION! 💥",
        "description": "Named creepers spawn - they just want to be friends!",
        "commands": [
            "execute at @r run summon minecraft:creeper ~ ~ ~ {Fuse:60,CustomName:'\"Steve\"',CustomNameVisible:1b}",
            "execute at @r run summon minecraft:creeper ~ ~ ~ {Fuse:60,CustomName:'\"Bob\"',CustomNameVisible:1b}",
            "execute at @r run summon minecraft:creeper ~ ~ ~ {Fuse:60,CustomName:'\"Gerald\"',CustomNameVisible:1b}",
            "execute at @r run summon minecraft:creeper ~ ~ ~ {Fuse:60,CustomName:'\"Kevin\"',CustomNameVisible:1b}"
        ],
        "delay_between": 1.0
    },
    {
        "name": "Thunder Dome",
        "announce": "§9§l⛈ THUNDER DOME ACTIVATED! ⛈",
        "description": "Lightning strikes everywhere!",
        "commands": [
            "weather thunder 300",
            "execute at @r run summon minecraft:lightning_bolt ~ ~ ~",
            "execute at @r run summon minecraft:lightning_bolt ~ ~ ~5",
            "execute at @r run summon minecraft:lightning_bolt ~5 ~ ~"
        ],
        "delay_between": 1.5
    },
    {
        "name": "Potion Roulette",
        "announce": "§c§l🧪 POTION ROULETTE! 🧪",
        "description": "Random potion effects for everyone!",
        "commands": [
            "effect give @a minecraft:strength 60 1",
            "effect give @a minecraft:regeneration 60 1",
            "effect give @a minecraft:night_vision 120 0",
            "effect give @a minecraft:fire_resistance 60 0"
        ],
        "delay_between": 0.5
    },
    {
        "name": "Hungry Games",
        "announce": "§4§l🍖 THE HUNGRY GAMES BEGIN! 🍖",
        "description": "Sudden hunger and food drops!",
        "commands": [
            "effect give @a minecraft:hunger 30 2",
            "execute at @r run summon minecraft:item ~ ~10 ~ {Item:{id:\"minecraft:cooked_beef\",Count:16b}}",
            "execute at @r run summon minecraft:item ~ ~10 ~ {Item:{id:\"minecraft:golden_carrot\",Count:8b}}",
            "execute at @r run summon minecraft:item ~ ~10 ~ {Item:{id:\"minecraft:cake\",Count:1b}}"
        ],
        "delay_between": 0.5
    },
    {
        "name": "Wither Warning",
        "announce": "§0§l💀 THE WITHER STIRS... 💀",
        "description": "Wither skeletons spawn and ominous sounds play!",
        "commands": [
            "execute at @r run summon minecraft:wither_skeleton ~ ~ ~",
            "execute at @r run summon minecraft:wither_skeleton ~ ~ ~",
            "execute at @a run playsound minecraft:entity.wither.ambient master @s ~ ~ ~ 1 0.5",
            "effect give @a minecraft:darkness 10 0"
        ],
        "delay_between": 1.0
    },
    {
        "name": "Enderman Convention",
        "announce": "§5§l👁 THE ENDERMEN GATHER... 👁",
        "description": "Endermen spawn - don't look at them!",
        "commands": [
            "execute at @r run summon minecraft:enderman ~ ~ ~",
            "execute at @r run summon minecraft:enderman ~ ~ ~",
            "execute at @r run summon minecraft:enderman ~ ~ ~",
            "execute at @a run playsound minecraft:entity.enderman.stare master @s"
        ],
        "delay_between": 1.0
    },
    {
        "name": "XP Bonanza",
        "announce": "§a§l✦ XP BONANZA! ✦",
        "description": "Experience orbs rain from the sky!",
        "commands": [
            "execute at @a run summon minecraft:experience_orb ~ ~5 ~ {Value:100}",
            "execute at @a run summon minecraft:experience_orb ~ ~5 ~ {Value:100}",
            "execute at @a run summon minecraft:experience_orb ~ ~5 ~ {Value:100}",
            "execute at @a run summon minecraft:experience_orb ~ ~5 ~ {Value:50}"
        ],
        "delay_between": 0.3
    },
    {
        "name": "Peaceful Moment",
        "announce": "§f§l🕊 A MOMENT OF PEACE... 🕊",
        "description": "All hostile mobs nearby vanish!",
        "commands": [
            "kill @e[type=minecraft:zombie,distance=..50]",
            "kill @e[type=minecraft:skeleton,distance=..50]",
            "kill @e[type=minecraft:creeper,distance=..50]",
            "kill @e[type=minecraft:spider,distance=..50]",
            "effect give @a minecraft:regeneration 30 2",
            "effect give @a minecraft:saturation 10 0"
        ],
        "delay_between": 0.5
    }
]

# =============================================================================
# EVENT TRIGGERING
# =============================================================================

async def trigger_chaos_event(event_name: Optional[str] = None) -> dict:
    """
    Trigger a chaos event
    
    Args:
        event_name: Specific event to trigger, or None for random
        
    Returns:
        The triggered event dict
    """
    # Select event
    if event_name:
        event = next((e for e in CHAOS_EVENTS if e["name"].lower() == event_name.lower()), None)
        if not event:
            # Random fallback if event not found
            event = random.choice(CHAOS_EVENTS)
    else:
        event = random.choice(CHAOS_EVENTS)
    
    # Announce with title
    mc_title("§c⚠ CHAOS EVENT ⚠", event["announce"])
    await asyncio.sleep(1)
    mc_say(event["announce"])
    
    # Wait for dramatic effect
    await asyncio.sleep(2)
    
    # Execute commands
    delay = event.get("delay_between", 0.5)
    for cmd in event["commands"]:
        try:
            await asyncio.to_thread(rcon_command, cmd)
        except Exception as e:
            print(f"Failed to execute command '{cmd}': {e}")
        await asyncio.sleep(delay)
    
    return event

def get_event_by_name(name: str) -> Optional[dict]:
    """Get an event by name"""
    return next((e for e in CHAOS_EVENTS if e["name"].lower() == name.lower()), None)

def list_event_names() -> list:
    """List all event names"""
    return [e["name"] for e in CHAOS_EVENTS]
