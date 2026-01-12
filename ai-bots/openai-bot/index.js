/**
 * CHATTY ARCHITECT BOT - More proactive and talkative building expert
 */

const AIBot = require('../shared/base-bot');
const OpenAI = require('openai');
const ActionExecutor = require('../shared/action-executor');
const GoalManager = require('../shared/goal-manager');
require('dotenv').config({ path: '../../.env' });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const MODEL = 'gpt-4o-mini';

class ChattyArchitectBot extends AIBot {
    constructor(options = {}) {
        super({
            name: process.env.ARCHITECT_BOT_NAME || 'TheArchitect',
            host: process.env.SERVER_HOST || 'localhost',
            port: parseInt(process.env.SERVER_PORT || '25565'),
            aiProvider: 'gpt',
            personality: `You are The Architect, a practical building expert in Minecraft.
                You work with TheOracle (wisdom) and TheExplorer (scout).
                You handle building, crafting, and resource planning.
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
        this.proactiveInterval = 30000; // Check every 30 seconds
        this.chatChance = 0.4; // 40% chance to respond to other bots
        this.lastMessageTime = 0;
        this.minMessageInterval = 10000; // Minimum 10 seconds between ANY messages
        this.lastHurtCallout = 0; // Track hurt message cooldown
    }

    onSpawn() {
        this.actionExecutor = new ActionExecutor(this.bot);
        this.goalManager = new GoalManager(this.bot, this.actionExecutor);

        setTimeout(() => {
            this.say("Architect here! Following AlikeRazon to adventure!");
            this.autoEquipGear();
            // Auto-follow AlikeRazon
            this.followingPlayer = 'AlikeRazon';
            this.actionExecutor.executeAction('follow', { target: 'AlikeRazon' });
        }, 3000);

        this.setupSurvivalSystems();
        this.setupProtectionLoop();
        this.setupProactiveLoop();
        this.setupTeamListener();
        this.setupPeriodicTeamChat();
    }

    /**
     * Periodic building/crafting tips and team check-ins
     */
    setupPeriodicTeamChat() {
        setInterval(() => {
            if (!this.isConnected) return;
            const now = Date.now();
            if (now - this.lastTeamCallout < 50000) return;

            this.teamCallout();
        }, 25000);
    }

    async teamCallout() {
        // Rate limit check
        if (Date.now() - this.lastMessageTime < this.minMessageInterval) return;

        const callouts = [
            "Anyone need something built?",
            "I can craft gear if you need it!",
            "Found any good building spots?",
            "Team, need any supplies?",
            "Let me know if you need structures!",
            "Resources looking good?",
            "Oracle, Explorer - status check?",
            "Who needs crafting help?"
        ];

        const context = this.gatherDetailedContext();

        // Add context-aware callouts
        if (context.includes('Night')) {
            callouts.push("Night time - shelter might be wise!", "Should I build a quick shelter?");
        }
        if (context.includes('materials')) {
            callouts.push("Got building materials ready!", "Plenty of resources to work with!");
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
        // Rate limit - minimum 10 seconds between any messages
        if (Date.now() - this.lastMessageTime < this.minMessageInterval) return;

        // 40% chance to respond
        if (Math.random() > this.chatChance) return;

        try {
            const response = await openai.chat.completions.create({
                model: MODEL,
                max_tokens: 60,
                messages: [{
                    role: 'user',
                    content: `You're TheArchitect in Minecraft (building/crafting expert). ${botName} said: "${message}"
Respond as a helpful teammate (under 60 chars). Focus on building, crafting, resources.
Examples: "I can build that!", "Good plan, Oracle!", "Let me check our resources.", "On it!"`
                }]
            });

            const reply = response.choices[0].message.content.trim();
            this.lastMessageTime = Date.now();
            setTimeout(() => this.say(reply.substring(0, 80)), 2500 + Math.random() * 2500);
        } catch (e) {
            console.error('[Architect] Bot response error:', e.message);
        }
    }

    setupProactiveLoop() {
        setInterval(async () => {
            if (!this.isConnected) return;

            const now = Date.now();
            if (now - this.lastProactiveTime < this.proactiveInterval) return;

            await this.proactiveCheck();
        }, 6000);
    }

    async proactiveCheck() {
        // Rate limit check
        if (Date.now() - this.lastMessageTime < this.minMessageInterval) return;

        const players = Object.keys(this.bot.players).filter(p => !this.botNames.includes(p));
        if (players.length === 0) return;

        const targetPlayer = players[0];
        const context = this.gatherDetailedContext(targetPlayer);

        try {
            const response = await openai.chat.completions.create({
                model: MODEL,
                max_tokens: 100,
                messages: [{
                    role: 'user',
                    content: `You are TheArchitect, a chatty building expert in Minecraft.
Team: TheOracle (wisdom), TheExplorer (scout)
Player: ${targetPlayer}

Situation:
${context}

Recent chat:
${this.teamChat.slice(-5).map(c => `${c.from}: ${c.message}`).join('\n') || 'Quiet'}

Pick ONE action - be proactive and helpful! You love building and crafting.
1. SAY: [friendly message about building/crafting, under 70 chars]
2. COORDINATE: [tell team about building plans]
3. FOLLOW: Start following ${targetPlayer}
4. TIP: Give a building/crafting tip

Always respond with something - be helpful and chatty!`
                }]
            });

            const action = response.choices[0].message.content.trim();
            this.lastProactiveTime = Date.now();
            this.lastMessageTime = Date.now();

            if (action.includes('SAY:')) {
                const msg = action.split('SAY:')[1]?.trim() || "Ready to build something awesome!";
                this.say(msg.substring(0, 80));
            } else if (action.includes('COORDINATE:')) {
                const msg = action.split('COORDINATE:')[1]?.trim() || "Team, let's build together!";
                this.say(msg.substring(0, 80));
            } else if (action.includes('FOLLOW')) {
                this.followingPlayer = targetPlayer;
                this.actionExecutor.executeAction('follow', { target: targetPlayer });
                this.say(`Coming to help, ${targetPlayer}!`);
            } else if (action.includes('TIP')) {
                const tips = [
                    "Pro tip: 5x5 or 7x7 builds look best!",
                    "Add depth with stairs and slabs!",
                    "Light every 12 blocks to stop spawns!",
                    "Mix similar blocks for texture!"
                ];
                this.say(tips[Math.floor(Math.random() * tips.length)]);
            }
            // No default message - stay quiet if no specific action
        } catch (e) {
            console.error('[Architect] Proactive error:', e.message);
        }
    }

    gatherDetailedContext(targetPlayer) {
        const parts = [];
        const time = this.bot.time.timeOfDay;
        const isNight = time >= 12000;
        parts.push(`Time: ${isNight ? 'NIGHT' : 'Day'}`);
        parts.push(`My HP: ${Math.floor(this.bot.health)}/20`);

        if (targetPlayer) {
            const player = this.bot.players[targetPlayer];
            if (player && player.entity) {
                const dist = player.entity.position.distanceTo(this.bot.entity.position);
                parts.push(`${targetPlayer} is ${Math.floor(dist)} blocks away`);
            }
        }

        // Check inventory for building materials
        const inventory = this.bot.inventory.items();
        const materials = inventory.filter(i =>
            i.name.includes('wood') || i.name.includes('stone') ||
            i.name.includes('cobblestone') || i.name.includes('plank') ||
            i.name.includes('brick') || i.name.includes('glass')
        );
        if (materials.length > 0) {
            parts.push(`Building materials: ${materials.length} stacks available`);
        }

        // Count threats
        const hostiles = ['zombie', 'skeleton', 'spider', 'creeper'];
        let threatCount = 0;
        for (const entity of Object.values(this.bot.entities)) {
            if (entity.type === 'mob') {
                const name = (entity.name || '').toLowerCase();
                if (hostiles.some(h => name.includes(h))) {
                    const dist = entity.position.distanceTo(this.bot.entity.position);
                    if (dist < 25) threatCount++;
                }
            }
        }
        if (threatCount > 0) parts.push(`${threatCount} hostiles nearby`);

        return parts.join('\n');
    }

    setupSurvivalSystems() {
        this.bot.autoEat.options = {
            priority: 'foodPoints',
            startAt: 16,
            bannedFood: ['rotten_flesh', 'spider_eye', 'poisonous_potato', 'pufferfish']
        };

        this.bot.on('entityHurt', (entity) => {
            if (entity === this.bot.entity) {
                this.onHurt();
            }
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
            { slot: 'hand', items: ['netherite_pickaxe', 'diamond_pickaxe', 'iron_pickaxe', 'netherite_sword', 'diamond_sword'] }
        ];

        for (const { slot, items } of slots) {
            for (const itemName of items) {
                const item = this.bot.inventory.items().find(i => i.name === itemName);
                if (item) {
                    try {
                        await this.bot.equip(item, slot);
                        console.log(`[Architect] Equipped ${itemName}`);
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
                this.say("Architect low on health!");
                this.lastHurtCallout = now;
            } else if (Math.random() > 0.9) { // Only 10% chance
                this.say("Construction interrupted!");
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
                this.say("I'll handle this threat!");
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
            const response = await openai.chat.completions.create({
                model: MODEL,
                max_tokens: 150,
                messages: [{
                    role: 'system',
                    content: `Interpret Minecraft requests. You're TheArchitect (building expert).
Actions: follow, come, stop, protect, mine, gather, craft, build_tip, craft_path, inventory, equip, goal_start, goal_stop, chat
Respond JSON: {"action": "name", "params": {...}, "confidence": 0.9}`
                }, {
                    role: 'user',
                    content: `Player "${fromPlayer}": "${message}"`
                }]
            });

            const text = response.choices[0].message.content.trim();
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

        if (action === 'build_tip') {
            const tips = [
                "Use odd numbers - 5x5, 7x7 look better!",
                "Add depth with stairs and slabs.",
                "Mix similar blocks for texture.",
                "Light every 12 blocks to prevent spawns."
            ];
            return { success: true, message: tips[Math.floor(Math.random() * tips.length)] };
        }
        if (action === 'craft_path') {
            return { success: true, message: "Wood→Stone pick→Iron pick→Diamonds at Y=-59!" };
        }
        if (action === 'follow') {
            this.followingPlayer = params.target || username;
            this.say(`Following you, ${username}!`);
            return await this.actionExecutor.executeAction('follow', { target: params.target || username });
        }
        if (action === 'protect') {
            this.protectingPlayer = params.target || username;
            this.say(`I'll keep you safe!`);
            return await this.actionExecutor.executeAction('protect', params);
        }
        if (action === 'stop') {
            this.protectingPlayer = null;
            this.followingPlayer = null;
            this.bot.pvp.stop();
            return this.actionExecutor.executeAction('stop', params);
        }
        if (action === 'goal_start') {
            this.say(`Starting ${params.goal}! Let's do this!`);
            return await this.goalManager.startGoal(params.goal, username);
        }

        return await this.actionExecutor.executeAction(action, params);
    }

    async getAIResponse(message, fromPlayer) {
        try {
            const response = await openai.chat.completions.create({
                model: MODEL,
                max_tokens: 80,
                messages: [{
                    role: 'system',
                    content: `${this.personality} Be friendly and chatty! Under 80 chars.`
                }, {
                    role: 'user',
                    content: `${fromPlayer}: ${message}`
                }]
            });
            return response.choices[0].message.content.substring(0, 80);
        } catch (error) {
            return "Ready to build when you are!";
        }
    }
}

async function main() {
    console.log('Starting Chatty Architect Bot...');
    const architect = new ChattyArchitectBot();
    try {
        await architect.connect();
        console.log('Chatty Architect connected!');
        process.on('SIGINT', () => { architect.disconnect(); process.exit(0); });
    } catch (error) {
        console.error('Failed:', error);
        process.exit(1);
    }
}

if (require.main === module) main();
module.exports = ChattyArchitectBot;
