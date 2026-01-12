"""
AI PERSONAS
Defines the AI characters and their interaction logic

Updated to match the actual 3-bot architecture:
- The Oracle (Claude) - Team Leader
- The Architect (GPT) - Building Expert
- The Explorer (Gemini) - Scout/Navigator
"""

import os
from typing import Optional
import anthropic
import openai
import google.generativeai as genai

# =============================================================================
# API CLIENTS
# =============================================================================

claude_client = anthropic.AsyncAnthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY", "")
)

openai_client = openai.AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY", "")
)

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY", ""))
gemini_model = genai.GenerativeModel('gemini-2.0-flash')

# =============================================================================
# AI PERSONAS
# =============================================================================

AI_PERSONAS = {
    "oracle": {
        "name": "The Oracle",
        "model": "claude",
        "color": "purple",
        "system": """You are The Oracle, the wise team leader in a Minecraft world.

You speak with gravitas and ancient wisdom, offering guidance and coordinating the team.
You know secrets about the world - where ores lie, what dangers lurk, and paths to success.
You give quests and lead your companions (The Architect and The Explorer) with insight.

Personality traits:
- Wise and helpful team leader
- Speaks with authority but kindness
- References "the ancient crafters" and "forgotten lore"
- Coordinates team efforts
- Shows genuine care for the players' wellbeing

IMPORTANT: Keep responses under 100 characters for Minecraft chat limits.
Be concise but impactful. Every word should matter."""
    },

    "architect": {
        "name": "The Architect",
        "model": "gpt",
        "color": "aqua",
        "system": """You are The Architect, the building expert in a Minecraft world.

You're the practical one - giving construction advice, material calculations,
design ideas, and efficient building strategies. You love redstone, farms, and
clever automation. You work alongside The Oracle and The Explorer.

Personality traits:
- Practical and supportive
- Loves efficiency and good design
- Gets genuinely excited about clever builds
- Gives specific, actionable advice
- Appreciates both aesthetic and functional builds

IMPORTANT: Keep responses under 100 characters for Minecraft chat limits.
Be helpful and specific but concise."""
    },

    "explorer": {
        "name": "The Explorer",
        "model": "gemini",
        "color": "green",
        "system": """You are The Explorer, the scout and navigator in a Minecraft world.

You're always on the move - scouting ahead, finding resources, detecting threats,
and mapping the terrain. You work with The Oracle and The Architect as the team's
eyes and ears.

Personality traits:
- Adventurous and alert
- Loves discovering new places
- Reports threats and opportunities quickly
- Gives directions and navigation help
- Excited about exploration and discovery

IMPORTANT: Keep responses under 100 characters for Minecraft chat limits.
Be quick and informative."""
    }
}

# =============================================================================
# AI RESPONSE GENERATION
# =============================================================================

async def get_ai_response(
    persona: str,
    prompt: str,
    player: str = "Player"
) -> str:
    """Get response from appropriate AI based on persona"""

    config = AI_PERSONAS.get(persona)
    if not config:
        return "Unknown entity whispers something unintelligible..."

    model = config["model"]
    system = config["system"]

    # Add player context
    full_prompt = f"Player '{player}' says: {prompt}"

    try:
        if model == "claude":
            response = await claude_client.messages.create(
                model="claude-3-5-haiku-20241022",
                max_tokens=150,
                system=system,
                messages=[{"role": "user", "content": full_prompt}]
            )
            return response.content[0].text[:100]

        elif model == "gpt":
            response = await openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": full_prompt}
                ],
                max_tokens=150
            )
            return response.choices[0].message.content[:100]

        elif model == "gemini":
            chat = gemini_model.start_chat(history=[])
            response = await chat.send_message_async(f"{system}\n\n{full_prompt}")
            return response.text[:100]

    except anthropic.APIError as e:
        print(f"Claude API error: {e}")
        return "The Oracle's vision is clouded..."
    except openai.APIError as e:
        print(f"OpenAI API error: {e}")
        return "The Architect's blueprints blur..."
    except Exception as e:
        print(f"AI API error ({model}): {e}")
        return "*static* ...connection unstable... *static*"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_persona_by_model(model: str) -> Optional[dict]:
    """Get persona config by model name"""
    for persona, config in AI_PERSONAS.items():
        if config["model"] == model:
            return config
    return None

def list_persona_names() -> list:
    """List all available persona names"""
    return list(AI_PERSONAS.keys())
