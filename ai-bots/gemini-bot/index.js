/**
 * CHATTY EXPLORER BOT - More proactive scout and adventurer
 */

const AIBot = require('../shared/base-bot');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const ActionExecutor = require('../shared/action-executor');
const GoalManager = require('../shared/goal-manager');
require('dotenv').config({ path: '../../.env' });

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

class ChattyExplorerBot extends AIBot {
    constructor(options = {}) {
        super({
            name: process.env.EXPLORER_BOT_NAME || 'TheExplorer',
            host: process.env.SERVER_HOST || 'localhost',
            port: parseInt(process.env.SERVER_PORT || '25565'),
            aiProvider: 'gemini',
            personality: `You are The Explorer, an adventurous scout in Minecraft.
                You work with TheOracle (wisdom) and TheArchitect (builder).
                You scout ahead, find resources, and warn of dangers.
                You NEVER attack players. Keep responses under 80 chars.`,
            ...options
        });

        this.conversationHistory = new Map();
        this.maxHistoryPerPlayer = 10;
        this.actionExecutor = null;
        this.goalManager = null;
        this.protectingPlayer = null;
        this.lastAttacker = null;
        this.followingPlayer = null;
        this.teamChat = [];
        this.lastProactiveTime = 0;
        this.lastTeamCallout = 0;
        this.botNames = ['TheOracle', 'TheArchitect', 'TheExplorer'];
        this.model = null;
        this.lastScoutReport = 0;
        this.proactiveInterval = 35000; // Check every 35 seconds
        this.chatChance = 0.35; // 35% chance to respond to other bots
        this.lastMessageTime = 0;
        this.minMessageInterval = 12000; // Minimum 12 seconds between ANY messages
        this.lastHurtCallout = 0; // Track hurt message cooldown
    }

    async initializeModel() {
        const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
        for (const modelName of models) {
            try {
                this.model = genAI.getGenerativeModel({ model: modelName });
                await this.model.generateContent("test");
                console.log(`[Explorer] Using model: ${modelName}`);
                return;
            } catch (e) {
                console.log(`[Explorer] Model ${modelName} not available`);
            }
        }
        throw new Error('No Gemini model available');
    }

    async onSpawn() {
        await this.initializeModel();
        this.actionExecutor = new ActionExecutor(this.bot);
        this.goalManager = new GoalManager(this.bot, this.actionExecutor);

        setTimeout(() => {
            this.say("Explorer ready! Following " + (process.env.PRIMARY_PLAYER || 'AlikeRazon') + " - let's go!");
            this.autoEquipGear();
            // Auto-follow Primary Player
            this.followingPlayer = process.env.PRIMARY_PLAYER || 'AlikeRazon';
            this.actionExecutor.executeAction('follow', { target: this.followingPlayer });
        }, 4000);

        this.setupSurvivalSystems();
        this.setupProtectionLoop();
        this.setupProactiveLoop();
        this.setupTeamListener();
        this.setupPeriodicTeamChat();
    }

    /**
     * Periodic scouting reports and team updates
     */
    setupPeriodicTeamChat() {
        setInterval(() => {
            if (!this.isConnected) return;
            const now = Date.now();
            if (now - this.lastTeamCallout < 55000) return;

            this.teamCallout();
        }, 22000);
    }

    async teamCallout() {
        // Rate limit check
        if (Date.now() - this.lastMessageTime < this.minMessageInterval) return;

        const callouts = [
            "Scouting report: Area looks clear!",
            "Anyone want me to scout ahead?",
            "Team, I'll check the perimeter!",
            "What should I explore next?",
            "Oracle, Architect - all good?",
            "Eyes open for resources!",
            "Adventure awaits! Who's with me?",
            "Checking surroundings..."
        ];

        const threats = this.countNearbyThreats();
        const context = this.gatherDetailedContext();

        // Add context-aware callouts
        if (threats > 0) {
            callouts.push(`Alert! ${threats} hostiles spotted!`, "Danger nearby - stay sharp!");
        }
        if (context.includes('Night') || context.includes('DANGER')) {
            callouts.push("Night patrol active!", "Keeping watch through the night!");
        }

        const msg = callouts[Math.floor(Math.random() * callouts.length)];
        this.say(msg);
        this.lastTeamCallout = Date.now();
        this.lastMessageTime = Date.now();
    }

    setupTeamListener() {
        this.bot.on('chat', async (username, message) => {
            if (username === this.name) return;

            this.teamChat.push({ from: username, message, time: Date.now() });
            if (this.teamChat.length > 20) this.teamChat.shift();

            // High chance to respond to other bots
            if (this.botNames.includes(username) && username !== this.name) {
                await this.respondToBot(username, message);
            }
        });
    }

    async respondToBot(botName, message) {
        // Rate limit - minimum 12 seconds between any messages
        if (Date.now() - this.lastMessageTime < this.minMessageInterval) return;

        // 35% chance to respond
        if (Math.random() > this.chatChance) return;

        try {
            const result = await this.model.generateContent(
                `You're TheExplorer in Minecraft (scout). ${botName} said: "${message}"
Respond as a helpful teammate (under 60 chars). Focus on scouting, exploration, dangers.
Examples: "I'll check it out!", "No threats nearby!", "Good thinking!", "On my way!"`
            );

            const reply = result.response.text().trim();
            if (reply && reply.length > 0) {
                this.lastMessageTime = Date.now();
                setTimeout(() => this.say(reply.substring(0, 80)), 3000 + Math.random() * 3000);
            }
        } catch (e) {
            console.error('[Explorer] Bot response error:', e.message);
        }
    }

    setupProactiveLoop() {
        setInterval(async () => {
            if (!this.isConnected) return;

            const now = Date.now();
            if (now - this.lastProactiveTime < this.proactiveInterval) return;

            await this.proactiveCheck();
        }, 7000);
    }

    async proactiveCheck() {
        // Rate limit check
        if (Date.now() - this.lastMessageTime < this.minMessageInterval) return;

        const players = Object.keys(this.bot.players).filter(p => !this.botNames.includes(p));
        if (players.length === 0) return;

        const targetPlayer = players[0];
        const context = this.gatherDetailedContext(targetPlayer);
        const scoutReport = this.generateScoutReport();

        try {
            const result = await this.model.generateContent(
                `You are TheExplorer, a chatty adventurous scout in Minecraft.
Team: TheOracle (wisdom), TheArchitect (builder)
Player: ${targetPlayer}

Situation:
${context}

Scout Report:
${scoutReport}

Recent chat:
${this.teamChat.slice(-5).map(c => `${c.from}: ${c.message}`).join('\n') || 'Quiet'}

Pick ONE action - be proactive and alert! You love exploring and warning of dangers.
1. SAY: [scouting report or adventure message, under 70 chars]
2. WARN: Alert about dangers
3. FOLLOW: Scout alongside ${targetPlayer}
4. SCOUT: Report on the area

Always respond with something - stay vigilant!`
            );

            const action = result.response.text().trim();
            this.lastProactiveTime = Date.now();
            this.lastMessageTime = Date.now();

            if (action.includes('SAY:')) {
                const msg = action.split('SAY:')[1]?.trim() || "Adventure calls!";
                this.say(msg.substring(0, 80));
            } else if (action.includes('WARN')) {
                const threats = this.countNearbyThreats();
                if (threats > 0) {
                    this.say(`Alert! ${threats} hostile mobs detected!`);
                } else {
                    this.say("All clear - no immediate threats!");
                }
            } else if (action.includes('FOLLOW')) {
                this.followingPlayer = targetPlayer;
                this.actionExecutor.executeAction('follow', { target: targetPlayer });
                this.say(`Scouting with you, ${targetPlayer}!`);
            } else if (action.includes('SCOUT')) {
                await this.scoutAndReport();
            }
            // No default message - stay quiet if no specific action
        } catch (e) {
            console.error('[Explorer] Proactive error:', e.message);
        }
    }

    generateScoutReport() {
        const parts = [];
        const pos = this.bot.entity.position;

        // Check biome
        try {
            const block = this.bot.blockAt(pos);
            if (block && block.biome) {
                parts.push(`Biome: ${block.biome.name}`);
            }
        } catch (e) {}

        // Count nearby entities
        let hostileCount = 0;
        let animalCount = 0;
        const hostiles = ['zombie', 'skeleton', 'spider', 'creeper', 'witch', 'phantom', 'enderman'];
        const animals = ['cow', 'pig', 'sheep', 'chicken', 'horse', 'wolf'];

        for (const entity of Object.values(this.bot.entities)) {
            if (!entity.position) continue;
            const dist = entity.position.distanceTo(pos);
            if (dist > 30) continue;

            const name = (entity.name || '').toLowerCase();
            if (entity.type === 'mob') {
                if (hostiles.some(h => name.includes(h))) hostileCount++;
                if (animals.some(a => name.includes(a))) animalCount++;
            }
        }

        if (hostileCount > 0) parts.push(`Hostile mobs: ${hostileCount}`);
        if (animalCount > 0) parts.push(`Animals: ${animalCount}`);

        // Check light level and time
        const time = this.bot.time.timeOfDay;
        if (time >= 12000) parts.push("NIGHTTIME - dangerous!");
        if (time >= 11000 && time < 12000) parts.push("Sunset soon!");

        return parts.join('\n') || 'Area clear';
    }

    countNearbyThreats() {
        const pos = this.bot.entity.position;
        const hostiles = ['zombie', 'skeleton', 'spider', 'creeper', 'witch', 'phantom'];
        let count = 0;

        for (const entity of Object.values(this.bot.entities)) {
            if (entity.type !== 'mob' || !entity.position) continue;
            const dist = entity.position.distanceTo(pos);
            if (dist > 20) continue;
            const name = (entity.name || '').toLowerCase();
            if (hostiles.some(h => name.includes(h))) count++;
        }
        return count;
    }

    async scoutAndReport() {
        const threats = this.countNearbyThreats();

        if (threats > 2) {
            this.say(`Team alert! ${threats} hostiles in the area!`);
        } else if (threats > 0) {
            this.say(`Minor threat: ${threats} mob(s) spotted.`);
        } else {
            this.say("Scout report: All clear around us!");
        }

        this.lastScoutReport = Date.now();
    }

    gatherDetailedContext(targetPlayer) {
        const parts = [];
        const time = this.bot.time.timeOfDay;
        parts.push(`Time: ${time >= 12000 ? 'Night (DANGER)' : time >= 11000 ? 'Sunset soon' : 'Day'}`);
        parts.push(`My HP: ${Math.floor(this.bot.health)}/20`);

        if (targetPlayer) {
            const player = this.bot.players[targetPlayer];
            if (player && player.entity) {
                const dist = player.entity.position.distanceTo(this.bot.entity.position);
                parts.push(`${targetPlayer} is ${Math.floor(dist)} blocks away`);
            }
        }

        const threats = this.countNearbyThreats();
        if (threats > 0) parts.push(`THREATS: ${threats} hostile mobs!`);

        if (this.followingPlayer) parts.push(`Scouting with: ${this.followingPlayer}`);

        return parts.join('\n');
    }

    setupSurvivalSystems() {
        this.bot.autoEat.options = {
            priority: 'foodPoints',
            startAt: 16,
            bannedFood: ['rotten_flesh', 'spider_eye', 'poisonous_potato', 'pufferfish']
        };

        this.bot.on('entityHurt', (entity) => {
            if (entity === this.bot.entity) this.onHurt();
        });

        this.bot.on('entitySwingArm', (entity) => {
            if (entity.type === 'mob') {
                const dist = entity.position.distanceTo(this.bot.entity.position);
                if (dist < 5) {
                    const name = (entity.name || '').toLowerCase();
                    const hostiles = ['zombie', 'skeleton', 'spider', 'creeper', 'witch', 'phantom'];
                    if (hostiles.some(h => name.includes(h))) {
                        this.lastAttacker = entity;
                    }
                }
            }
        });

        this.bot.on('spawn', () => {
            setTimeout(() => this.autoEquipGear(), 1000);
        });

        setInterval(() => {
            if (!this.isConnected) return;
            this.survivalCheck();
        }, 5000);
    }

    async autoEquipGear() {
        const slots = [
            { slot: 'head', items: ['netherite_helmet', 'diamond_helmet', 'iron_helmet'] },
            { slot: 'torso', items: ['netherite_chestplate', 'diamond_chestplate', 'iron_chestplate'] },
            { slot: 'legs', items: ['netherite_leggings', 'diamond_leggings', 'iron_leggings'] },
            { slot: 'feet', items: ['netherite_boots', 'diamond_boots', 'iron_boots'] },
            { slot: 'hand', items: ['netherite_sword', 'diamond_sword', 'iron_sword'] }
        ];

        for (const { slot, items } of slots) {
            for (const itemName of items) {
                const item = this.bot.inventory.items().find(i => i.name === itemName);
                if (item) {
                    try {
                        await this.bot.equip(item, slot);
                        console.log(`[Explorer] Equipped ${itemName}`);
                    } catch (e) {}
                    break;
                }
            }
        }
    }

    async onHurt() {
        const now = Date.now();
        // Only call out every 30 seconds minimum
        if (now - this.lastHurtCallout > 30000) {
            if (this.bot.health < 8) {
                this.say("Low health! Need healing!");
                this.lastHurtCallout = now;
            } else if (Math.random() > 0.85) { // Only 15% chance
                const callouts = ["Engaged in combat!", "Fighting here!", "Hostiles engaged!"];
                this.say(callouts[Math.floor(Math.random() * callouts.length)]);
                this.lastHurtCallout = now;
            }
        }

        if (this.lastAttacker && this.lastAttacker.isValid && this.lastAttacker.type === 'mob') {
            try { await this.bot.pvp.attack(this.lastAttacker); } catch (e) {}
        }
    }

    survivalCheck() {
        if (this.bot.health < 10) {
            const gapple = this.bot.inventory.items().find(i => i.name.includes('golden_apple'));
            if (gapple) {
                this.bot.equip(gapple, 'hand').then(() => this.bot.consume().catch(() => {})).catch(() => {});
            }
        }

        const hostiles = ['zombie', 'skeleton', 'spider', 'creeper'];
        const nearbyThreat = this.bot.nearestEntity(e => {
            if (e.type !== 'mob') return false;
            const name = (e.name || '').toLowerCase();
            if (!hostiles.some(h => name.includes(h))) return false;
            return e.position.distanceTo(this.bot.entity.position) < 8;
        });

        if (nearbyThreat && !this.bot.pvp.target) {
            const sword = this.bot.inventory.items().find(i => i.name.includes('sword'));
            if (sword) this.bot.equip(sword, 'hand').catch(() => {});
            this.bot.pvp.attack(nearbyThreat).catch(() => {});
        }
    }

    setupProtectionLoop() {
        setInterval(async () => {
            if (!this.protectingPlayer || !this.isConnected) return;

            const player = this.bot.players[this.protectingPlayer];
            if (!player || !player.entity) return;

            const threat = this.bot.nearestEntity(e => {
                if (e.type !== 'mob') return false;
                const name = (e.name || '').toLowerCase();
                if (!['zombie', 'skeleton', 'spider', 'creeper'].some(h => name.includes(h))) return false;
                return e.position.distanceTo(player.entity.position) < 12;
            });

            if (threat) {
                this.say("Got your back!");
                try { await this.bot.pvp.attack(threat); } catch (err) {}
            }
        }, 1000);
    }

    async handleChat(username, message) {
        if (this.botNames.includes(username)) return;

        const interpretation = await this.interpretRequest(message, username);
        if (interpretation.action && interpretation.action !== 'chat') {
            const result = await this.executeInterpretedAction(interpretation, username);
            if (result.message) this.say(result.message);
        } else {
            const response = await this.getAIResponse(message, username);
            this.say(response);
        }
    }

    async interpretRequest(message, fromPlayer) {
        try {
            const result = await this.model.generateContent(
                `Interpret Minecraft request. You're TheExplorer (scout).
Actions: follow, come, stop, protect, scout, explore, find, warn, inventory, equip, goal_start, chat
Respond JSON only: {"action": "name", "params": {...}, "confidence": 0.9}

Player "${fromPlayer}": "${message}"`
            );

            const text = result.response.text().trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.params?.target === 'PLAYER_NAME') parsed.params.target = fromPlayer;
                return parsed;
            }
        } catch (error) {}
        return { action: 'chat', params: {}, confidence: 0.5 };
    }

    async executeInterpretedAction(interpretation, username) {
        const { action, params } = interpretation;

        if (action === 'scout') {
            await this.scoutAndReport();
            return { success: true, message: "" };
        }
        if (action === 'warn') {
            const threats = this.countNearbyThreats();
            return { success: true, message: threats > 0 ? `${threats} threats nearby!` : "All clear!" };
        }
        if (action === 'follow') {
            this.followingPlayer = params.target || username;
            this.say(`Scouting with ${username}!`);
            return await this.actionExecutor.executeAction('follow', { target: params.target || username });
        }
        if (action === 'protect') {
            this.protectingPlayer = params.target || username;
            this.say(`I'll keep watch over you!`);
            return await this.actionExecutor.executeAction('protect', params);
        }
        if (action === 'stop') {
            this.protectingPlayer = null;
            this.followingPlayer = null;
            this.bot.pvp.stop();
            return this.actionExecutor.executeAction('stop', params);
        }
        if (action === 'goal_start') {
            this.say(`Starting ${params.goal}! Let's explore!`);
            return await this.goalManager.startGoal(params.goal, username);
        }

        return await this.actionExecutor.executeAction(action, params);
    }

    async getAIResponse(message, fromPlayer) {
        try {
            const result = await this.model.generateContent(
                `${this.personality} Be friendly and adventurous! Under 80 chars.
${fromPlayer}: ${message}`
            );
            return result.response.text().substring(0, 80);
        } catch (error) {
            return "The adventure continues!";
        }
    }
}

async function main() {
    console.log('Starting Chatty Explorer Bot...');
    const explorer = new ChattyExplorerBot();
    try {
        await explorer.connect();
        console.log('Chatty Explorer connected!');
        process.on('SIGINT', () => { explorer.disconnect(); process.exit(0); });
    } catch (error) {
        console.error('Failed:', error);
        process.exit(1);
    }
}

if (require.main === module) main();
module.exports = ChattyExplorerBot;
