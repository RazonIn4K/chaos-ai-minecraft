/**
 * ACTION EXECUTOR
 * Handles bot action execution for follow, protect, mine, gather, etc.
 */

const { GoalFollow, GoalNear, GoalBlock } = require('mineflayer-pathfinder').goals;

class ActionExecutor {
    constructor(bot) {
        this.bot = bot;
        this.currentAction = null;
        this.followTarget = null;
    }

    /**
     * Execute a bot action
     * @param {string} action - Action name
     * @param {Object} params - Action parameters
     * @returns {Object} - Result with success status and message
     */
    async executeAction(action, params = {}) {
        this.currentAction = action;

        try {
            switch (action) {
                case 'follow':
                    return await this.follow(params.target);
                case 'come':
                    return await this.come(params.target);
                case 'stop':
                    return this.stop();
                case 'protect':
                    return await this.protect(params.target);
                case 'mine':
                    return await this.mine(params.block, params.count);
                case 'gather':
                    return await this.gather(params.item, params.count);
                case 'inventory':
                    return this.getInventory();
                case 'equip':
                    return await this.equip(params.item, params.slot);
                default:
                    return { success: false, message: `Unknown action: ${action}` };
            }
        } catch (error) {
            console.error(`[ActionExecutor] Error executing ${action}:`, error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Follow a player
     */
    async follow(playerName) {
        if (!playerName) {
            return { success: false, message: 'No target specified' };
        }

        const player = this.bot.players[playerName];
        if (!player || !player.entity) {
            return { success: false, message: `Can't see ${playerName}` };
        }

        this.followTarget = playerName;
        const goal = new GoalFollow(player.entity, 2);
        this.bot.pathfinder.setGoal(goal, true);

        return { success: true, message: `Following ${playerName}` };
    }

    /**
     * Come to a player's location
     */
    async come(playerName) {
        if (!playerName) {
            return { success: false, message: 'No target specified' };
        }

        const player = this.bot.players[playerName];
        if (!player || !player.entity) {
            return { success: false, message: `Can't see ${playerName}` };
        }

        const pos = player.entity.position;
        const goal = new GoalNear(pos.x, pos.y, pos.z, 2);

        try {
            await this.bot.pathfinder.goto(goal);
            return { success: true, message: `Arrived at ${playerName}'s location` };
        } catch (err) {
            return { success: false, message: `Couldn't reach ${playerName}` };
        }
    }

    /**
     * Stop all actions
     */
    stop() {
        this.followTarget = null;
        this.currentAction = null;
        this.bot.pathfinder.setGoal(null);
        this.bot.pvp.stop();
        return { success: true, message: 'Stopped all actions' };
    }

    /**
     * Protect a player from hostile mobs
     */
    async protect(playerName) {
        if (!playerName) {
            return { success: false, message: 'No target to protect' };
        }

        const player = this.bot.players[playerName];
        if (!player || !player.entity) {
            return { success: false, message: `Can't see ${playerName}` };
        }

        // Follow the player while in protect mode
        this.followTarget = playerName;
        const goal = new GoalFollow(player.entity, 3);
        this.bot.pathfinder.setGoal(goal, true);

        return { success: true, message: `Protecting ${playerName}` };
    }

    /**
     * Mine a specific block type
     */
    async mine(blockName, count = 1) {
        if (!blockName) {
            return { success: false, message: 'No block specified' };
        }

        const mcData = require('minecraft-data')(this.bot.version);
        const blockType = mcData.blocksByName[blockName];

        if (!blockType) {
            return { success: false, message: `Unknown block: ${blockName}` };
        }

        const blocks = this.bot.findBlocks({
            matching: blockType.id,
            maxDistance: 32,
            count: count
        });

        if (blocks.length === 0) {
            return { success: false, message: `No ${blockName} found nearby` };
        }

        let mined = 0;
        for (const pos of blocks.slice(0, count)) {
            try {
                const block = this.bot.blockAt(pos);
                if (block && this.bot.collectBlock) {
                    await this.bot.collectBlock.collect(block);
                    mined++;
                }
            } catch (err) {
                console.error(`[ActionExecutor] Mining error:`, err.message);
            }
        }

        return {
            success: mined > 0,
            message: `Mined ${mined} ${blockName}`
        };
    }

    /**
     * Gather items from nearby entities
     */
    async gather(itemName, count = 1) {
        const items = Object.values(this.bot.entities).filter(e =>
            e.type === 'object' &&
            e.objectType === 'item' &&
            (!itemName || e.name?.toLowerCase().includes(itemName.toLowerCase()))
        );

        if (items.length === 0) {
            return { success: false, message: 'No items to gather nearby' };
        }

        let gathered = 0;
        for (const item of items.slice(0, count)) {
            try {
                const goal = new GoalNear(item.position.x, item.position.y, item.position.z, 0);
                await this.bot.pathfinder.goto(goal);
                gathered++;
            } catch (err) {
                // Item might have been picked up already
            }
        }

        return {
            success: gathered > 0,
            message: `Gathered ${gathered} items`
        };
    }

    /**
     * Get inventory contents
     */
    getInventory() {
        const items = this.bot.inventory.items();
        const summary = items.map(i => `${i.name}x${i.count}`).join(', ');
        return {
            success: true,
            message: summary || 'Inventory empty',
            items: items
        };
    }

    /**
     * Equip an item
     */
    async equip(itemName, slot = 'hand') {
        if (!itemName) {
            return { success: false, message: 'No item specified' };
        }

        const item = this.bot.inventory.items().find(i =>
            i.name.toLowerCase().includes(itemName.toLowerCase())
        );

        if (!item) {
            return { success: false, message: `Don't have ${itemName}` };
        }

        try {
            await this.bot.equip(item, slot);
            return { success: true, message: `Equipped ${item.name}` };
        } catch (err) {
            return { success: false, message: `Couldn't equip ${itemName}` };
        }
    }
}

module.exports = ActionExecutor;
