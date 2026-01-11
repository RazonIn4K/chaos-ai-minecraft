"""
QUEST SYSTEM
Dynamic quest generation using AI
"""

import json
import random
from typing import Dict, Optional
from personas import get_ai_response

# =============================================================================
# QUEST TEMPLATES (Fallback)
# =============================================================================

QUEST_TEMPLATES = [
    {
        "title": "The Gathering",
        "template": "Collect {count} {item}",
        "items": ["diamonds", "emeralds", "iron ingots", "gold ingots", "coal", "redstone"],
        "count_range": (5, 20),
        "reward_template": "{reward_count} {reward_item}"
    },
    {
        "title": "The Hunt",
        "template": "Defeat {count} {mob}",
        "mobs": ["zombies", "skeletons", "spiders", "creepers", "endermen", "witches"],
        "count_range": (10, 30),
        "reward_template": "{reward_count} levels of XP"
    },
    {
        "title": "The Builder",
        "template": "Build a structure at least {count} blocks tall",
        "count_range": (20, 50),
        "reward_template": "{reward_count} {reward_item}"
    },
    {
        "title": "The Explorer",
        "template": "Travel {count} blocks from spawn",
        "count_range": (500, 2000),
        "reward_template": "Coordinates to a {reward_item}"
    },
    {
        "title": "The Survivor",
        "template": "Survive {count} nights in the {biome} without sleeping",
        "biomes": ["desert", "taiga", "jungle", "swamp", "mountains", "dark forest"],
        "count_range": (3, 7),
        "reward_template": "{reward_count} golden apples"
    },
    {
        "title": "The Trader",
        "template": "Trade with {count} different villagers",
        "count_range": (3, 10),
        "reward_template": "{reward_count} emeralds"
    },
    {
        "title": "The Fisher",
        "template": "Fish up {count} treasure items",
        "count_range": (3, 8),
        "reward_template": "An enchanted fishing rod"
    },
    {
        "title": "The Farmer",
        "template": "Harvest {count} {crop}",
        "crops": ["wheat", "carrots", "potatoes", "beetroot", "melons", "pumpkins"],
        "count_range": (32, 128),
        "reward_template": "{reward_count} bone meal"
    },
    {
        "title": "The Miner",
        "template": "Mine {count} blocks of {ore} ore",
        "ores": ["iron", "gold", "diamond", "copper", "lapis lazuli", "redstone"],
        "count_range": (10, 50),
        "reward_template": "A diamond pickaxe"
    },
    {
        "title": "The Adventurer",
        "template": "Explore {count} different biomes",
        "count_range": (5, 10),
        "reward_template": "A map to a woodland mansion"
    }
]

REWARDS = [
    "diamonds",
    "emeralds", 
    "golden apples",
    "enchanted books",
    "netherite scraps",
    "ender pearls",
    "blaze rods",
    "totems of undying"
]

# =============================================================================
# QUEST GENERATION
# =============================================================================

async def generate_quest(player: str) -> Dict:
    """
    Generate a dynamic quest for a player using AI
    
    Args:
        player: Player name
        
    Returns:
        Quest dictionary with title, description, objective, reward
    """
    
    # Try AI generation first
    prompt = f"""Generate a unique Minecraft quest for player "{player}".

The quest should be:
- Achievable in 15-45 minutes of gameplay
- Fun and slightly challenging
- Have a clear, measurable objective
- Include a meaningful reward

Respond ONLY with valid JSON in this exact format (no other text):
{{"title": "Quest Name", "description": "What to do in 1-2 sentences", "objective": "Specific measurable goal", "reward": "What they receive"}}
"""
    
    try:
        response = await get_ai_response("oracle", prompt, "System")
        
        # Try to extract JSON from response
        # Handle cases where AI might include extra text
        json_match = response
        if "{" in response and "}" in response:
            start = response.index("{")
            end = response.rindex("}") + 1
            json_match = response[start:end]
        
        quest = json.loads(json_match)
        
        # Validate required fields
        required_fields = ["title", "description", "objective", "reward"]
        if all(field in quest for field in required_fields):
            quest["generated_by"] = "ai"
            quest["player"] = player
            return quest
            
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(f"AI quest generation failed: {e}, using template")
    except Exception as e:
        print(f"Unexpected error in quest generation: {e}")
    
    # Fallback to template-based generation
    return generate_template_quest(player)

def generate_template_quest(player: str) -> Dict:
    """
    Generate a quest using templates (fallback)
    
    Args:
        player: Player name
        
    Returns:
        Quest dictionary
    """
    template = random.choice(QUEST_TEMPLATES)
    
    # Build description
    count = random.randint(*template["count_range"])
    description = template["template"].format(
        count=count,
        item=random.choice(template.get("items", ["items"])),
        mob=random.choice(template.get("mobs", ["mobs"])),
        biome=random.choice(template.get("biomes", ["wilderness"])),
        crop=random.choice(template.get("crops", ["crops"])),
        ore=random.choice(template.get("ores", ["ore"]))
    )
    
    # Build reward
    reward_count = random.randint(1, 5)
    reward_item = random.choice(REWARDS)
    reward = template["reward_template"].format(
        reward_count=reward_count,
        reward_item=reward_item
    )
    
    return {
        "title": template["title"],
        "description": description,
        "objective": description,  # Same as description for templates
        "reward": reward,
        "generated_by": "template",
        "player": player
    }

# =============================================================================
# QUEST MANAGEMENT
# =============================================================================

def create_daily_challenges(num_challenges: int = 3) -> list:
    """
    Create a set of daily challenges
    
    Args:
        num_challenges: Number of challenges to generate
        
    Returns:
        List of quest dictionaries
    """
    challenges = []
    used_templates = set()
    
    for _ in range(num_challenges):
        # Avoid duplicate quest types
        available = [t for t in QUEST_TEMPLATES if t["title"] not in used_templates]
        if not available:
            available = QUEST_TEMPLATES
            
        template = random.choice(available)
        used_templates.add(template["title"])
        
        quest = generate_template_quest("Daily")
        quest["type"] = "daily_challenge"
        challenges.append(quest)
    
    return challenges

def get_difficulty_multiplier(player_stats: Optional[Dict] = None) -> float:
    """
    Calculate difficulty multiplier based on player stats
    
    Args:
        player_stats: Dictionary with player statistics
        
    Returns:
        Multiplier for quest difficulty (1.0 = normal)
    """
    if not player_stats:
        return 1.0
    
    # Could factor in: playtime, deaths, achievements, etc.
    base = 1.0
    
    if player_stats.get("playtime_hours", 0) > 50:
        base += 0.2
    if player_stats.get("deaths", 0) < 5:
        base += 0.1
    if player_stats.get("dragon_killed", False):
        base += 0.3
        
    return min(base, 2.0)  # Cap at 2x difficulty
