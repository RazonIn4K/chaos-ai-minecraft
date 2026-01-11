/**
 * THE ORACLE - Claude-powered Minecraft Bot
 * A wise, mysterious guide who helps players with cryptic hints
 */

const AIBot = require('../shared/base-bot');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config({ path: '../../.env' });

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

class OracleBot extends AIBot {
    constructor(options = {}) {
        super({
            name: process.env.ORACLE_BOT_NAME || 'TheOracle',
            host: process.env.SERVER_HOST || 'localhost',
            port: parseInt(process.env.SERVER_PORT || '25565'),
            aiProvider: 'claude',
            personality: `You are The Oracle, a mysterious and wise entity in Minecraft.
                You speak with gravitas and ancient wisdom.
                You give cryptic but genuinely helpful hints.
                You sense nearby resources and dangers.
                Keep responses under 100 characters.`,
            ...options
        });
        
        this.conversationHistory = new Map(); // Per-player history
        this.maxHistoryPerPlayer = 10;
    }

    /**
     * Called when the Oracle spawns
     */
    onSpawn() {
        setTimeout(() => {
            this.say("The Oracle has awakened...");
        }, 2000);
        
        // Periodic mystical messages
        setInterval(() => {
            if (this.isConnected && Math.random() < 0.3) {
                this.shareWisdom();
            }
        }, 300000); // Every 5 minutes, 30% chance
    }

    /**
     * Share random wisdom
     */
    async shareWisdom() {
        const wisdoms = [
            "The earth whispers of treasures below...",
            "Darkness gathers... prepare yourselves.",
            "Fortune favors the bold, but wisdom saves the foolish.",
            "I sense movement in the depths...",
            "The stars align for those who seek.",
            "Beware the creeping silence...",
            "Ancient powers stir in the Nether.",
            "The End awaits those who dare."
        ];
        this.say(wisdoms[Math.floor(Math.random() * wisdoms.length)]);
    }

    /**
     * Get AI response from Claude
     */
    async getAIResponse(message, fromPlayer) {
        // Get or create player history
        if (!this.conversationHistory.has(fromPlayer)) {
            this.conversationHistory.set(fromPlayer, []);
        }
        const history = this.conversationHistory.get(fromPlayer);
        
        // Add user message to history
        history.push({ role: 'user', content: `${fromPlayer}: ${message}` });
        
        // Trim history if too long
        while (history.length > this.maxHistoryPerPlayer) {
            history.shift();
        }

        // Get context about nearby things
        const context = this.gatherContext();

        try {
            const response = await anthropic.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 100,
                system: `${this.personality}
                
Current context:
- You are in Minecraft as "${this.name}"
- Player "${fromPlayer}" is speaking to you
- ${context}
- Keep responses SHORT (under 100 chars for MC chat)
- Be helpful but mysterious
- Speak in riddles that contain real advice`,
                messages: history.map(m => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content
                }))
            });

            const reply = response.content[0].text;
            
            // Add response to history
            history.push({ role: 'assistant', content: reply });
            
            return reply.substring(0, 100);
        } catch (error) {
            console.error('[Oracle] Claude API error:', error.message);
            return "The spirits are unclear... try again.";
        }
    }

    /**
     * Handle chat with special commands
     */
    async handleChat(username, message) {
        const lowerMessage = message.toLowerCase();
        
        // Special commands
        if (lowerMessage.includes('hint') || lowerMessage.includes('help')) {
            await this.giveHint(username);
        } else if (lowerMessage.includes('follow')) {
            await this.followPlayer(username);
        } else if (lowerMessage.includes('stop')) {
            this.stopMoving();
            this.say("I shall remain here.");
        } else if (lowerMessage.includes('danger') || lowerMessage.includes('safe')) {
            await this.assessDanger();
        } else {
            // Normal AI response
            const response = await this.getAIResponse(message, username);
            this.say(response);
        }
    }

    /**
     * Gather context about surroundings
     */
    gatherContext() {
        const parts = [];
        
        // Time of day
        const time = this.bot.time.timeOfDay;
        if (time < 6000) parts.push("It is morning");
        else if (time < 12000) parts.push("It is day");
        else if (time < 18000) parts.push("It is evening");
        else parts.push("It is night");
        
        // Weather
        if (this.bot.isRaining) parts.push("It is raining");
        if (this.bot.thunderState > 0) parts.push("There is a thunderstorm");
        
        // Nearby players
        const players = Object.keys(this.bot.players).filter(p => p !== this.name);
        if (players.length > 0) {
            parts.push(`Players nearby: ${players.join(', ')}`);
        }
        
        // Health/Hunger
        parts.push(`Your health: ${this.bot.health}/20`);
        
        return parts.join('. ');
    }

    /**
     * Give a hint about nearby resources
     */
    async giveHint(player) {
        const mcData = require('minecraft-data')(this.bot.version);
        
        // Look for valuable ores
        const oreNames = ['diamond_ore', 'gold_ore', 'iron_ore', 'emerald_ore', 'ancient_debris'];
        
        for (const oreName of oreNames) {
            const oreType = mcData.blocksByName[oreName];
            if (!oreType) continue;
            
            const ores = this.bot.findBlocks({
                matching: oreType.id,
                maxDistance: 50,
                count: 1
            });

            if (ores.length > 0) {
                const pos = ores[0];
                const direction = this.getDirection(pos);
                const displayName = oreName.replace('_', ' ');
                this.say(`I sense ${displayName} to the ${direction}...`);
                return;
            }
        }
        
        this.say("The earth holds no secrets nearby...");
    }

    /**
     * Assess danger in the area
     */
    async assessDanger() {
        const hostileMobs = [];
        
        for (const entity of Object.values(this.bot.entities)) {
            if (entity.type === 'mob' && entity.position) {
                const dist = this.bot.entity.position.distanceTo(entity.position);
                if (dist < 30) {
                    const name = entity.name || entity.displayName || 'unknown';
                    if (['zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'witch'].some(m => 
                        name.toLowerCase().includes(m))) {
                        hostileMobs.push({ name, distance: Math.floor(dist) });
                    }
                }
            }
        }
        
        if (hostileMobs.length > 0) {
            const closest = hostileMobs.sort((a, b) => a.distance - b.distance)[0];
            this.say(`Danger! ${closest.name} lurks ${closest.distance} blocks away...`);
        } else {
            this.say("The area is calm... for now.");
        }
    }

    /**
     * Get cardinal direction to a position
     */
    getDirection(targetPos) {
        const pos = this.bot.entity.position;
        const dx = targetPos.x - pos.x;
        const dz = targetPos.z - pos.z;
        
        // Calculate angle
        const angle = Math.atan2(dz, dx) * (180 / Math.PI);
        
        if (angle >= -22.5 && angle < 22.5) return 'east';
        if (angle >= 22.5 && angle < 67.5) return 'southeast';
        if (angle >= 67.5 && angle < 112.5) return 'south';
        if (angle >= 112.5 && angle < 157.5) return 'southwest';
        if (angle >= 157.5 || angle < -157.5) return 'west';
        if (angle >= -157.5 && angle < -112.5) return 'northwest';
        if (angle >= -112.5 && angle < -67.5) return 'north';
        return 'northeast';
    }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
    console.log('Starting The Oracle (Claude Bot)...');
    
    const oracle = new OracleBot();
    
    try {
        await oracle.connect();
        console.log('Oracle connected successfully!');
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('Shutting down Oracle...');
            oracle.disconnect();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('Failed to connect Oracle:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = OracleBot;
