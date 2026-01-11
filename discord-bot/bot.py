"""
CHAOS AI DISCORD BOT
Control your Minecraft server and interact with AI characters from Discord
"""

import os
import discord
from discord import app_commands
from discord.ext import commands, tasks
import aiohttp
import asyncio
from datetime import datetime

# Configuration
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
CHAOS_API_URL = os.getenv("CHAOS_API_URL", "http://ai-controller:3000")
GUILD_ID = os.getenv("DISCORD_GUILD_ID")
STATUS_CHANNEL_ID = os.getenv("STATUS_CHANNEL_ID")

# Bot setup
intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

async def api_request(endpoint: str, method: str = "GET", data: dict = None) -> dict:
    """Make request to Chaos AI API"""
    async with aiohttp.ClientSession() as session:
        url = f"{CHAOS_API_URL}{endpoint}"
        try:
            if method == "GET":
                async with session.get(url, timeout=30) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    return {"error": f"HTTP {resp.status}"}
            elif method == "POST":
                async with session.post(url, json=data, timeout=30) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    return {"error": f"HTTP {resp.status}"}
        except asyncio.TimeoutError:
            return {"error": "Request timeout"}
        except Exception as e:
            return {"error": str(e)}


# =============================================================================
# EVENTS
# =============================================================================

@bot.event
async def on_ready():
    print(f"🤖 Chaos Bot connected as {bot.user}")
    
    # Sync commands
    try:
        if GUILD_ID:
            guild = discord.Object(id=int(GUILD_ID))
            synced = await bot.tree.sync(guild=guild)
        else:
            synced = await bot.tree.sync()
        print(f"📝 Synced {len(synced)} slash commands")
    except Exception as e:
        print(f"❌ Failed to sync commands: {e}")
    
    # Start background tasks
    if STATUS_CHANNEL_ID:
        server_status_loop.start()


# =============================================================================
# SLASH COMMANDS
# =============================================================================

@bot.tree.command(name="status", description="Check Minecraft server status")
async def status(interaction: discord.Interaction):
    """Check server status"""
    await interaction.response.defer()
    
    health = await api_request("/health")
    players = await api_request("/players")
    
    is_healthy = health.get("status") == "healthy"
    
    embed = discord.Embed(
        title="🎮 Chaos AI Server Status",
        color=discord.Color.green() if is_healthy else discord.Color.red(),
        timestamp=datetime.now()
    )
    
    embed.add_field(
        name="Status", 
        value="🟢 Online" if is_healthy else "🔴 Offline", 
        inline=True
    )
    embed.add_field(
        name="Players", 
        value=f"{players.get('count', 0)} online", 
        inline=True
    )
    
    if players.get('players'):
        embed.add_field(
            name="Player List",
            value=", ".join(players['players']) or "None",
            inline=False
        )
    
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="chaos", description="Trigger a random chaos event")
@app_commands.describe(event="Specific event name (optional)")
async def chaos(interaction: discord.Interaction, event: str = None):
    """Trigger chaos event"""
    await interaction.response.defer()
    
    endpoint = "/chaos/trigger"
    if event:
        endpoint += f"?event_name={event}"
    
    result = await api_request(endpoint, method="POST")
    
    if "error" in result:
        embed = discord.Embed(
            title="❌ Chaos Failed",
            description=result["error"],
            color=discord.Color.red()
        )
    else:
        embed = discord.Embed(
            title="⚡ CHAOS TRIGGERED!",
            description=f"**Event:** {result.get('event', 'Unknown')}",
            color=discord.Color.red(),
            timestamp=datetime.now()
        )
    
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="ask", description="Ask an AI character a question")
@app_commands.describe(
    character="Which AI to ask",
    question="Your question"
)
@app_commands.choices(character=[
    app_commands.Choice(name="🔮 The Oracle (Claude)", value="oracle"),
    app_commands.Choice(name="🎭 The Trickster (Grok)", value="trickster"),
    app_commands.Choice(name="🏗️ The Architect (GPT)", value="architect"),
    app_commands.Choice(name="⚔️ The Warden (Gemini)", value="warden"),
])
async def ask(interaction: discord.Interaction, character: str, question: str):
    """Ask AI character"""
    await interaction.response.defer()
    
    result = await api_request("/ai/chat", method="POST", data={
        "player": interaction.user.display_name,
        "message": question,
        "persona": character
    })
    
    colors = {
        "oracle": discord.Color.purple(),
        "trickster": discord.Color.gold(),
        "architect": discord.Color.teal(),
        "warden": discord.Color.red()
    }
    
    names = {
        "oracle": "🔮 The Oracle",
        "trickster": "🎭 The Trickster",
        "architect": "🏗️ The Architect",
        "warden": "⚔️ The Warden"
    }
    
    embed = discord.Embed(
        title=names.get(character, "AI"),
        description=result.get("response", "No response..."),
        color=colors.get(character, discord.Color.blue())
    )
    embed.set_footer(text=f"Asked by {interaction.user.display_name}")
    
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="debate", description="Start an AI debate on a topic")
@app_commands.describe(topic="What should the AIs debate?")
async def debate(interaction: discord.Interaction, topic: str):
    """Start AI debate"""
    await interaction.response.defer()
    
    result = await api_request(f"/ai/debate?topic={topic}", method="POST")
    
    if "error" in result:
        await interaction.followup.send(f"❌ Error: {result['error']}")
        return
    
    embed = discord.Embed(
        title="🎭 AI DEBATE",
        description=f"**Topic:** {topic}",
        color=discord.Color.purple(),
        timestamp=datetime.now()
    )
    
    for persona, response in result.items():
        if persona in ["oracle", "trickster", "architect", "warden"]:
            names = {
                "oracle": "🔮 Oracle (Claude)",
                "trickster": "🎭 Trickster (Grok)", 
                "architect": "🏗️ Architect (GPT)",
                "warden": "⚔️ Warden (Gemini)"
            }
            embed.add_field(
                name=names.get(persona, persona),
                value=response[:1024] if response else "No response",
                inline=False
            )
    
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="quest", description="Generate a quest for a player")
@app_commands.describe(player="Minecraft username")
async def quest(interaction: discord.Interaction, player: str):
    """Generate quest"""
    await interaction.response.defer()
    
    result = await api_request(f"/quest/generate/{player}", method="POST")
    
    embed = discord.Embed(
        title=f"📜 Quest for {player}",
        color=discord.Color.gold()
    )
    embed.add_field(name="Title", value=result.get("title", "Unknown"), inline=False)
    embed.add_field(name="Description", value=result.get("description", "No description"), inline=False)
    embed.add_field(name="Objective", value=result.get("objective", "Complete it"), inline=True)
    embed.add_field(name="Reward", value=result.get("reward", "Glory"), inline=True)
    
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="whitelist", description="Manage server whitelist")
@app_commands.describe(
    action="Add, remove, or list",
    player="Minecraft username (for add/remove)"
)
@app_commands.choices(action=[
    app_commands.Choice(name="Add player", value="add"),
    app_commands.Choice(name="Remove player", value="remove"),
    app_commands.Choice(name="List all", value="list"),
])
async def whitelist(interaction: discord.Interaction, action: str, player: str = None):
    """Manage whitelist"""
    await interaction.response.defer()
    
    if action == "list":
        result = await api_request("/rcon", method="POST", data={"command": "whitelist list"})
    elif player:
        result = await api_request("/rcon", method="POST", data={"command": f"whitelist {action} {player}"})
    else:
        await interaction.followup.send("❌ Please specify a player name!")
        return
    
    embed = discord.Embed(
        title="📋 Whitelist",
        description=result.get("result", "Command executed"),
        color=discord.Color.blue()
    )
    
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="say", description="Broadcast message to all players")
@app_commands.describe(message="Message to broadcast")
async def say(interaction: discord.Interaction, message: str):
    """Broadcast message"""
    await interaction.response.defer()
    
    result = await api_request("/announce", method="POST", data={
        "message": message,
        "title": False,
        "color": "gold"
    })
    
    await interaction.followup.send(f"📢 Broadcast sent: *{message}*")


@bot.tree.command(name="events", description="List available chaos events")
async def events(interaction: discord.Interaction):
    """List chaos events"""
    await interaction.response.defer()
    
    result = await api_request("/chaos/events")
    
    embed = discord.Embed(
        title="⚡ Available Chaos Events",
        color=discord.Color.orange()
    )
    
    for event in result.get("events", [])[:15]:  # Limit to 15
        embed.add_field(
            name=event.get("name", "Unknown"),
            value=event.get("announce", "No description")[:100],
            inline=True
        )
    
    await interaction.followup.send(embed=embed)


# =============================================================================
# BACKGROUND TASKS
# =============================================================================

@tasks.loop(minutes=30)
async def server_status_loop():
    """Post server status periodically"""
    if not STATUS_CHANNEL_ID:
        return
        
    channel = bot.get_channel(int(STATUS_CHANNEL_ID))
    if not channel:
        return
    
    health = await api_request("/health")
    
    if health.get("status") != "healthy":
        embed = discord.Embed(
            title="🚨 SERVER ALERT",
            description="Server appears to be having issues!",
            color=discord.Color.red(),
            timestamp=datetime.now()
        )
        embed.add_field(name="RCON", value=health.get("rcon", "unknown"))
        embed.add_field(name="Redis", value=health.get("redis", "unknown"))
        await channel.send(embed=embed)


# =============================================================================
# PREFIX COMMANDS (quick access)
# =============================================================================

@bot.command(name="c")
async def quick_chaos(ctx):
    """Quick chaos: !c"""
    result = await api_request("/chaos/trigger", method="POST")
    await ctx.send(f"⚡ **CHAOS:** {result.get('event', 'triggered!')}")


@bot.command(name="o")
async def quick_oracle(ctx, *, question: str = "What wisdom do you have?"):
    """Quick oracle: !o <question>"""
    result = await api_request("/ai/chat", method="POST", data={
        "player": ctx.author.display_name,
        "message": question,
        "persona": "oracle"
    })
    await ctx.send(f"🔮 **Oracle:** {result.get('response', '...')}")


# =============================================================================
# MAIN
# =============================================================================

def main():
    if not DISCORD_TOKEN:
        print("❌ DISCORD_TOKEN environment variable not set!")
        print("Set it in your .env file or environment.")
        return
    
    print("Starting Chaos AI Discord Bot...")
    bot.run(DISCORD_TOKEN)


if __name__ == "__main__":
    main()
