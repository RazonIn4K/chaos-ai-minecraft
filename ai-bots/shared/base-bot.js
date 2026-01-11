/**
 * BASE AI BOT
 * Framework for AI-controlled Minecraft bots
 * Each AI character (Claude, GPT, etc.) extends this class
 */

const mineflayer = require('mineflayer');
const pathfinder = require('mineflayer-pathfinder').pathfinder;
const Movements = require('mineflayer-pathfinder').Movements;
const { GoalNear, GoalBlock, GoalFollow, GoalXZ } = require('mineflayer-pathfinder').goals;
const pvp = require('mineflayer-pvp').plugin;
const autoeat = require('mineflayer-auto-eat').plugin;
const armorManager = require('mineflayer-armor-manager');
const collectBlock = require('mineflayer-collectblock').plugin;

class AIBot {
    /**
     * Create a new AI Bot
     * @param {Object} options - Bot configuration
     * @param {string} options.name - Bot username
     * @param {string} options.host - Server host
     * @param {number} options.port - Server port
     * @param {string} options.aiProvider - AI provider (claude, gpt, grok, gemini)
     * @param {string} options.personality - Bot personality description
     */
    constructor(options) {
        this.name = options.name || 'AI_Bot';
        this.host = options.host || 'localhost';
        this.port = options.port || 25565;
        this.aiProvider = options.aiProvider || 'claude';
        this.personality = options.personality || 'A helpful Minecraft assistant';
        this.version = options.version || '1.21.1';
        
        this.bot = null;
        this.isConnected = false;
        this.currentTask = null;
        this.memory = [];
        this.maxMemory = 20;
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
    }

    /**
     * Connect to the Minecraft server
     * @returns {Promise<AIBot>}
     */
    async connect() {
        console.log(`[${this.name}] Connecting to ${this.host}:${this.port}...`);
        
        this.bot = mineflayer.createBot({
            host: this.host,
            port: this.port,
            username: this.name,
            auth: 'offline', // Change to 'microsoft' for production
            version: this.version,
            hideErrors: false
        });

        // Load plugins
        this.bot.loadPlugin(pathfinder);
        this.bot.loadPlugin(pvp);
        this.bot.loadPlugin(autoeat);
        this.bot.loadPlugin(armorManager);
        this.bot.loadPlugin(collectBlock);

        this.setupEventHandlers();
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, 30000);
            
            this.bot.once('spawn', () => {
                clearTimeout(timeout);
                console.log(`[${this.name}] Spawned in world!`);
                this.isConnected = true;
                this.setupPathfinder();
                this.onSpawn();
                resolve(this);
            });
            
            this.bot.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }

    /**
     * Set up event handlers
     */
    setupEventHandlers() {
        // Chat handler
        this.bot.on('chat', async (username, message) => {
            if (username === this.bot.username) return;
            
            // Check if message mentions this bot
            const mentionPatterns = [
                this.name.toLowerCase(),
                `@${this.name.toLowerCase()}`,
                this.aiProvider.toLowerCase()
            ];
            
            const isMentioned = mentionPatterns.some(pattern => 
                message.toLowerCase().includes(pattern)
            );
            
            if (isMentioned) {
                console.log(`[${this.name}] Mentioned by ${username}: ${message}`);
                await this.handleChat(username, message);
            }
        });

        // Whisper handler
        this.bot.on('whisper', async (username, message) => {
            console.log(`[${this.name}] Whisper from ${username}: ${message}`);
            const response = await this.getAIResponse(message, username);
            this.bot.whisper(username, response);
        });

        // Death handler
        this.bot.on('death', () => {
            console.log(`[${this.name}] Died! Respawning...`);
            this.say("Oops, I died! Be right back...");
        });

        // Kicked handler
        this.bot.on('kicked', (reason) => {
            console.log(`[${this.name}] Kicked: ${reason}`);
            this.isConnected = false;
        });

        // Disconnected handler
        this.bot.on('end', () => {
            console.log(`[${this.name}] Disconnected`);
            this.isConnected = false;
        });

        // Error handler
        this.bot.on('error', (err) => {
            console.error(`[${this.name}] Error:`, err);
        });

        // Auto-eat setup
        this.bot.once('spawn', () => {
            this.bot.autoEat.options = {
                priority: 'foodPoints',
                startAt: 14,
                bannedFood: ['rotten_flesh', 'spider_eye', 'poisonous_potato']
            };
        });
    }

    /**
     * Set up pathfinder with world data
     */
    setupPathfinder() {
        const mcData = require('minecraft-data')(this.bot.version);
        const movements = new Movements(this.bot, mcData);
        movements.scafoldingBlocks = [];
        movements.canDig = false; // Prevent grief
        this.bot.pathfinder.setMovements(movements);
    }

    /**
     * Called when bot spawns - override in subclass
     */
    onSpawn() {
        // Override in subclass for custom spawn behavior
    }

    /**
     * Handle chat message - override in subclass
     * @param {string} username - Player who sent message
     * @param {string} message - The message
     */
    async handleChat(username, message) {
        const response = await this.getAIResponse(message, username);
        this.say(response);
    }

    /**
     * Get AI response - override in subclass
     * @param {string} message - User message
     * @param {string} fromPlayer - Player name
     * @returns {Promise<string>}
     */
    async getAIResponse(message, fromPlayer) {
        return `I heard you, ${fromPlayer}! (Override getAIResponse in subclass)`;
    }

    // =========================================================================
    // MOVEMENT HELPERS
    // =========================================================================

    /**
     * Go to specific coordinates
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    async goTo(x, y, z) {
        const goal = new GoalBlock(x, y, z);
        try {
            await this.bot.pathfinder.goto(goal);
            return true;
        } catch (err) {
            console.log(`[${this.name}] Failed to reach ${x}, ${y}, ${z}: ${err.message}`);
            return false;
        }
    }

    /**
     * Go near specific coordinates
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     * @param {number} range - How close to get
     */
    async goNear(x, y, z, range = 2) {
        const goal = new GoalNear(x, y, z, range);
        try {
            await this.bot.pathfinder.goto(goal);
            return true;
        } catch (err) {
            console.log(`[${this.name}] Failed to reach near ${x}, ${y}, ${z}`);
            return false;
        }
    }

    /**
     * Follow a player
     * @param {string} username 
     */
    async followPlayer(username) {
        const player = this.bot.players[username];
        if (!player || !player.entity) {
            this.say(`I can't see ${username}!`);
            return false;
        }
        const goal = new GoalFollow(player.entity, 2);
        this.bot.pathfinder.setGoal(goal, true);
        this.say(`Following ${username}!`);
        return true;
    }

    /**
     * Stop following/moving
     */
    stopMoving() {
        this.bot.pathfinder.setGoal(null);
    }

    // =========================================================================
    // COMBAT HELPERS
    // =========================================================================

    /**
     * Attack an entity
     * @param {Entity} entity 
     */
    async attackEntity(entity) {
        try {
            await this.bot.pvp.attack(entity);
        } catch (err) {
            console.log(`[${this.name}] Attack failed: ${err.message}`);
        }
    }

    /**
     * Defend against nearby hostile mobs
     */
    async defend() {
        const hostileTypes = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman', 'witch'];
        const hostile = this.bot.nearestEntity(e => 
            e.type === 'mob' && 
            hostileTypes.some(type => e.name?.toLowerCase().includes(type))
        );
        
        if (hostile) {
            this.say(`Defending against ${hostile.name}!`);
            await this.attackEntity(hostile);
            return true;
        }
        return false;
    }

    /**
     * Stop all combat
     */
    stopCombat() {
        this.bot.pvp.stop();
    }

    // =========================================================================
    // MINING HELPERS
    // =========================================================================

    /**
     * Mine nearby blocks of a type
     * @param {string} blockName 
     * @param {number} count 
     */
    async mineBlock(blockName, count = 1) {
        const mcData = require('minecraft-data')(this.bot.version);
        const blockType = mcData.blocksByName[blockName];
        if (!blockType) {
            this.say(`I don't know what ${blockName} is!`);
            return false;
        }

        const blocks = this.bot.findBlocks({
            matching: blockType.id,
            maxDistance: 32,
            count: count
        });

        if (blocks.length === 0) {
            this.say(`I can't find any ${blockName} nearby.`);
            return false;
        }

        this.say(`Mining ${blockName}...`);
        for (const pos of blocks.slice(0, count)) {
            try {
                const block = this.bot.blockAt(pos);
                await this.bot.collectBlock.collect(block);
            } catch (err) {
                console.log(`[${this.name}] Mining error: ${err.message}`);
            }
        }
        return true;
    }

    // =========================================================================
    // BUILDING HELPERS
    // =========================================================================

    /**
     * Place a block
     * @param {Object} position - {x, y, z}
     * @param {string} blockName 
     */
    async placeBlock(position, blockName) {
        const item = this.bot.inventory.items().find(i => i.name === blockName);
        if (!item) {
            this.say(`I don't have any ${blockName}!`);
            return false;
        }

        try {
            await this.bot.equip(item, 'hand');
            const refBlock = this.bot.blockAt(position.offset(0, -1, 0));
            if (refBlock) {
                await this.bot.placeBlock(refBlock, new Vec3(0, 1, 0));
                return true;
            }
        } catch (err) {
            console.log(`[${this.name}] Place block error: ${err.message}`);
        }
        return false;
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    /**
     * Say something in chat
     * @param {string} message 
     */
    say(message) {
        if (this.bot && this.isConnected) {
            // Truncate to Minecraft chat limit
            this.bot.chat(message.substring(0, 100));
        }
    }

    /**
     * Whisper to a player
     * @param {string} username 
     * @param {string} message 
     */
    whisper(username, message) {
        if (this.bot && this.isConnected) {
            this.bot.whisper(username, message.substring(0, 100));
        }
    }

    /**
     * Look at a player
     * @param {string} username 
     */
    async lookAtPlayer(username) {
        const player = this.bot.players[username];
        if (player && player.entity) {
            await this.bot.lookAt(player.entity.position.offset(0, 1.6, 0));
        }
    }

    /**
     * Get inventory summary
     * @returns {Object}
     */
    getInventory() {
        const items = this.bot.inventory.items();
        return items.map(item => ({
            name: item.name,
            count: item.count
        }));
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.bot) {
            this.bot.quit();
            this.isConnected = false;
        }
    }
}

module.exports = AIBot;
