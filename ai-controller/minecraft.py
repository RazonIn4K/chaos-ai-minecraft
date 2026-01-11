"""
MINECRAFT HELPERS
RCON commands and Minecraft server interaction utilities
"""

import os
import re
from typing import List, Optional
from mcrcon import MCRcon

# =============================================================================
# CONFIGURATION
# =============================================================================

RCON_HOST = os.getenv("RCON_HOST", "localhost")
RCON_PORT = int(os.getenv("RCON_PORT", 25575))
RCON_PASSWORD = os.getenv("RCON_PASSWORD", "")

# Minecraft color codes
COLORS = {
    "black": "0",
    "dark_blue": "1",
    "dark_green": "2",
    "dark_aqua": "3",
    "dark_red": "4",
    "purple": "5",
    "gold": "6",
    "gray": "7",
    "dark_gray": "8",
    "blue": "9",
    "green": "a",
    "aqua": "b",
    "red": "c",
    "pink": "d",
    "yellow": "e",
    "white": "f"
}

# =============================================================================
# RCON COMMANDS
# =============================================================================

def rcon_command(command: str) -> str:
    """
    Execute RCON command on Minecraft server
    
    Args:
        command: The command to execute
        
    Returns:
        Command output string
    """
    try:
        with MCRcon(RCON_HOST, RCON_PASSWORD, port=RCON_PORT) as mcr:
            return mcr.command(command)
    except ConnectionRefusedError:
        return "RCON Error: Connection refused - is the server running?"
    except Exception as e:
        return f"RCON Error: {str(e)}"

def mc_say(message: str, color: str = "white") -> str:
    """
    Broadcast message to all players using tellraw
    
    Args:
        message: Message to broadcast
        color: Color name (white, red, gold, etc.)
        
    Returns:
        RCON response
    """
    # Escape quotes in message
    safe_message = message.replace('"', '\\"').replace("'", "\\'")
    
    # Use tellraw for colored messages
    json_text = f'{{"text":"{safe_message}","color":"{color}"}}'
    return rcon_command(f'tellraw @a {json_text}')

def mc_title(title: str, subtitle: str = "", fade_in: int = 10, stay: int = 70, fade_out: int = 20) -> None:
    """
    Show title to all players
    
    Args:
        title: Main title text
        subtitle: Subtitle text (optional)
        fade_in: Fade in time in ticks
        stay: Stay time in ticks
        fade_out: Fade out time in ticks
    """
    # Set timing
    rcon_command(f'title @a times {fade_in} {stay} {fade_out}')
    
    # Show title
    safe_title = title.replace('"', '\\"')
    rcon_command(f'title @a title {{"text":"{safe_title}","bold":true}}')
    
    # Show subtitle if provided
    if subtitle:
        safe_subtitle = subtitle.replace('"', '\\"')
        rcon_command(f'title @a subtitle {{"text":"{safe_subtitle}"}}')

def mc_actionbar(message: str) -> str:
    """
    Show action bar message to all players
    
    Args:
        message: Message to show
        
    Returns:
        RCON response
    """
    safe_message = message.replace('"', '\\"')
    return rcon_command(f'title @a actionbar {{"text":"{safe_message}"}}')

def mc_whisper(player: str, message: str) -> str:
    """
    Send private message to specific player
    
    Args:
        player: Player name
        message: Message to send
        
    Returns:
        RCON response
    """
    return rcon_command(f'tell {player} {message}')

# =============================================================================
# PLAYER MANAGEMENT
# =============================================================================

def get_online_players(list_output: Optional[str] = None) -> List[str]:
    """
    Get list of online players
    
    Args:
        list_output: Pre-fetched output from 'list' command (optional)
        
    Returns:
        List of player names
    """
    if list_output is None:
        list_output = rcon_command("list")
    
    # Parse "There are X of Y players online: player1, player2, ..."
    if ":" in list_output:
        players_part = list_output.split(":")[-1].strip()
        if players_part:
            return [p.strip() for p in players_part.split(",") if p.strip()]
    return []

def whitelist_add(player: str) -> str:
    """Add player to whitelist"""
    return rcon_command(f"whitelist add {player}")

def whitelist_remove(player: str) -> str:
    """Remove player from whitelist"""
    return rcon_command(f"whitelist remove {player}")

def whitelist_list() -> str:
    """Get whitelist"""
    return rcon_command("whitelist list")

def kick_player(player: str, reason: str = "You have been kicked") -> str:
    """Kick a player"""
    return rcon_command(f'kick {player} {reason}')

def op_player(player: str) -> str:
    """Give operator status to player"""
    return rcon_command(f"op {player}")

def deop_player(player: str) -> str:
    """Remove operator status from player"""
    return rcon_command(f"deop {player}")

# =============================================================================
# WORLD MANAGEMENT
# =============================================================================

def save_world() -> str:
    """Save the world"""
    return rcon_command("save-all")

def set_time(time: str) -> str:
    """
    Set world time
    
    Args:
        time: Time value (day, night, noon, midnight, or ticks)
    """
    return rcon_command(f"time set {time}")

def set_weather(weather: str, duration: int = 300) -> str:
    """
    Set weather
    
    Args:
        weather: Weather type (clear, rain, thunder)
        duration: Duration in seconds
    """
    return rcon_command(f"weather {weather} {duration}")

def get_seed() -> str:
    """Get world seed"""
    return rcon_command("seed")

# =============================================================================
# ENTITY COMMANDS
# =============================================================================

def summon_entity(
    entity_type: str,
    x: str = "~",
    y: str = "~", 
    z: str = "~",
    nbt: str = ""
) -> str:
    """
    Summon an entity
    
    Args:
        entity_type: Entity type (e.g., minecraft:zombie)
        x, y, z: Coordinates (default: relative to executor)
        nbt: NBT data string (optional)
    """
    cmd = f"execute at @r run summon {entity_type} {x} {y} {z}"
    if nbt:
        cmd += f" {nbt}"
    return rcon_command(cmd)

def kill_entities(entity_type: str, radius: int = 50) -> str:
    """
    Kill entities of a type within radius
    
    Args:
        entity_type: Entity type (e.g., minecraft:zombie)
        radius: Radius in blocks
    """
    return rcon_command(f"kill @e[type={entity_type},distance=..{radius}]")

def give_item(player: str, item: str, count: int = 1) -> str:
    """
    Give item to player
    
    Args:
        player: Player name (or @a for all)
        item: Item ID (e.g., minecraft:diamond)
        count: Number of items
    """
    return rcon_command(f"give {player} {item} {count}")

def apply_effect(
    player: str,
    effect: str,
    duration: int = 30,
    amplifier: int = 0
) -> str:
    """
    Apply effect to player
    
    Args:
        player: Player name (or @a for all)
        effect: Effect ID (e.g., minecraft:speed)
        duration: Duration in seconds
        amplifier: Effect level (0 = level 1)
    """
    return rcon_command(f"effect give {player} {effect} {duration} {amplifier}")

def clear_effects(player: str) -> str:
    """Clear all effects from player"""
    return rcon_command(f"effect clear {player}")

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def teleport_player(player: str, x: float, y: float, z: float) -> str:
    """Teleport player to coordinates"""
    return rcon_command(f"tp {player} {x} {y} {z}")

def teleport_to_player(player: str, target: str) -> str:
    """Teleport player to another player"""
    return rcon_command(f"tp {player} {target}")

def play_sound(
    sound: str,
    player: str = "@a",
    volume: float = 1.0,
    pitch: float = 1.0
) -> str:
    """
    Play sound to player(s)
    
    Args:
        sound: Sound ID (e.g., minecraft:entity.wither.ambient)
        player: Target selector
        volume: Volume (0.0 to 1.0)
        pitch: Pitch (0.5 to 2.0)
    """
    return rcon_command(f"execute at {player} run playsound {sound} master {player} ~ ~ ~ {volume} {pitch}")

def broadcast_advancement(player: str, message: str) -> str:
    """Fake an advancement notification"""
    safe_message = message.replace('"', '\\"')
    return rcon_command(
        f'tellraw @a {{"text":"[{player} has made the advancement {safe_message}]","color":"green"}}'
    )
