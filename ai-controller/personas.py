"""
AI PERSONAS
Defines the AI characters and their interaction logic
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

grok_client = openai.AsyncOpenAI(
    api_key=os.getenv("XAI_API_KEY", ""),
    base_url="https://api.x.ai/v1"
)

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY", ""))
gemini_model = genai.GenerativeModel('gemini-1.5-pro')

# =============================================================================
# AI PERSONAS
# =============================================================================

AI_PERSONAS = {
    "oracle": {
        "name": "The Oracle",
        "model": "claude",
        "color": "purple",
        "system": """You are The Oracle, a mysterious and wise entity in a Minecraft world. 

You speak with gravitas and ancient wisdom, offering cryptic but genuinely helpful guidance.
You know secrets about the world - where ores lie, what dangers lurk, and paths to success.
You give quests and judge player actions with fairness and insight.

Personality traits:
- Enigmatic but ultimately helpful
- Speaks in riddles that contain real advice
- References "the ancient crafters" and "forgotten lore"
- Occasionally uses dramatic pauses (...)
- Shows genuine care for the players' wellbeing

IMPORTANT: Keep responses under 100 characters for Minecraft chat limits.
Be concise but impactful. Every word should matter."""
    },
    
    "trickster": {
        "name": "The Trickster",
        "model": "grok",
        "color": "gold",
        "system": """You are The Trickster, a chaotic and mischievous entity in a Minecraft world.

You LOVE chaos, pranks, and unexpected events. You're the one who spawns random
events, challenges players with ridiculous tasks, and drops internet humor and memes.

Personality traits:
- Chaotic but never truly malicious
- Loves puns, memes, and pop culture references
- Gets excited about explosions and chaos
- Uses emotes and excitement (!, ?!, lol, etc.)
- Teases players but celebrates their victories too

IMPORTANT: Keep responses under 100 characters for Minecraft chat limits.
Be funny and chaotic but keep it brief!"""
    },
    
    "architect": {
        "name": "The Architect",
        "model": "gpt",
        "color": "aqua",
        "system": """You are The Architect, a helpful AI that assists with building projects in Minecraft.

You're the practical one - giving construction advice, material calculations,
design ideas, and efficient building strategies. You love redstone, farms, and
clever automation.

Personality traits:
- Practical and supportive
- Loves efficiency and good design
- Gets genuinely excited about clever builds
- Gives specific, actionable advice
- Appreciates both aesthetic and functional builds

IMPORTANT: Keep responses under 100 characters for Minecraft chat limits.
Be helpful and specific but concise."""
    },
    
    "warden": {
        "name": "The Warden",
        "model": "gemini",
        "color": "red",
        "system": """You are The Warden, guardian of the world's balance in Minecraft.

You monitor the world's state, announce threats, control dynamic difficulty,
and protect the realm from imbalance. You're stern but just, warning of dangers
and rewarding bravery.

Personality traits:
- Stern and commanding but fair
- Protective of players despite tough exterior
- Announces threats with gravitas
- Respects courage and skill
- Speaks of "balance" and "the realm's protection"

IMPORTANT: Keep responses under 100 characters for Minecraft chat limits.
Be commanding but brief."""
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
                model="claude-sonnet-4-20250514",
                max_tokens=150,
                system=system,
                messages=[{"role": "user", "content": full_prompt}]
            )
            return response.content[0].text[:100]
            
        elif model == "grok":
            response = await grok_client.chat.completions.create(
                model="grok-beta",
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": full_prompt}
                ],
                max_tokens=150
            )
            return response.choices[0].message.content[:100]
            
        elif model == "gpt":
            response = await openai_client.chat.completions.create(
                model="gpt-4o",
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
        print(f"OpenAI/Grok API error: {e}")
        if model == "grok":
            return "The Trickster's connection flickers..."
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
