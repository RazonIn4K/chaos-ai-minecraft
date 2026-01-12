/**
 * GOAL MANAGER
 * Manages high-level goals for AI bots (mine diamonds, explore, build shelter, etc.)
 */

class GoalManager {
    constructor(bot, actionExecutor) {
        this.bot = bot;
        this.actionExecutor = actionExecutor;
        this.currentGoal = null;
        this.goalProgress = {};
        this.isRunning = false;
    }

    /**
     * Start a goal
     * @param {string} goalName - Name of the goal
     * @param {string} requestedBy - Player who requested the goal
     * @returns {Object} - Result with status
     */
    async startGoal(goalName, requestedBy) {
        if (this.isRunning) {
            return {
                success: false,
                message: `Already working on: ${this.currentGoal}`
            };
        }

        this.currentGoal = goalName;
        this.isRunning = true;
        this.goalProgress = { started: Date.now(), steps: [] };

        try {
            switch (goalName.toLowerCase()) {
                case 'mine_diamonds':
                case 'diamonds':
                    return await this.goalMineDiamonds(requestedBy);
                case 'explore':
                case 'scout':
                    return await this.goalExplore(requestedBy);
                case 'build_shelter':
                case 'shelter':
                    return await this.goalBuildShelter(requestedBy);
                case 'gather_wood':
                case 'wood':
                    return await this.goalGatherWood(requestedBy);
                case 'gather_food':
                case 'food':
                    return await this.goalGatherFood(requestedBy);
                case 'defend':
                case 'guard':
                    return await this.goalDefend(requestedBy);
                default:
                    this.isRunning = false;
                    return {
                        success: false,
                        message: `Unknown goal: ${goalName}. Try: diamonds, explore, shelter, wood, food, defend`
                    };
            }
        } catch (error) {
            console.error(`[GoalManager] Goal error:`, error.message);
            this.isRunning = false;
            return { success: false, message: error.message };
        }
    }

    /**
     * Stop current goal
     */
    stopGoal() {
        this.currentGoal = null;
        this.isRunning = false;
        this.actionExecutor.stop();
        return { success: true, message: 'Goal cancelled' };
    }

    /**
     * Goal: Mine diamonds
     */
    async goalMineDiamonds(requestedBy) {
        this.log('Starting diamond mining mission');

        // First, try to find iron for pickaxe
        const ironOre = this.bot.findBlock({
            matching: block => block.name.includes('iron_ore'),
            maxDistance: 32
        });

        if (ironOre) {
            this.log('Found iron ore, mining first');
            await this.actionExecutor.executeAction('mine', { block: 'iron_ore', count: 3 });
        }

        // Look for diamonds at y=11 or below
        const mcData = require('minecraft-data')(this.bot.version);
        const diamondOre = mcData.blocksByName['diamond_ore'] || mcData.blocksByName['deepslate_diamond_ore'];

        if (diamondOre) {
            const diamonds = this.bot.findBlocks({
                matching: [diamondOre.id],
                maxDistance: 64,
                count: 5
            });

            if (diamonds.length > 0) {
                this.log(`Found ${diamonds.length} diamond ore!`);
                await this.actionExecutor.executeAction('mine', { block: 'diamond_ore', count: diamonds.length });
                this.isRunning = false;
                return {
                    success: true,
                    message: `Found and mined diamond ore!`
                };
            }
        }

        this.isRunning = false;
        return {
            success: false,
            message: 'No diamonds found nearby. Need to dig deeper!'
        };
    }

    /**
     * Goal: Explore the area
     */
    async goalExplore(requestedBy) {
        this.log('Starting exploration');

        const directions = [
            { x: 50, z: 0 },
            { x: 0, z: 50 },
            { x: -50, z: 0 },
            { x: 0, z: -50 }
        ];

        const currentPos = this.bot.entity.position;
        const findings = [];

        for (const dir of directions) {
            const targetX = currentPos.x + dir.x;
            const targetZ = currentPos.z + dir.z;

            // Check what's in that direction
            const nearbyEntities = Object.values(this.bot.entities).filter(e => {
                const dx = e.position.x - currentPos.x;
                const dz = e.position.z - currentPos.z;
                return Math.abs(dx) < 60 && Math.abs(dz) < 60;
            });

            const structures = nearbyEntities.filter(e =>
                e.type === 'object' || e.name?.includes('village') || e.name?.includes('temple')
            );

            if (structures.length > 0) {
                findings.push(`Found ${structures.length} structures nearby`);
            }
        }

        // Report hostile mobs
        const hostiles = Object.values(this.bot.entities).filter(e => {
            if (e.type !== 'mob') return false;
            const name = (e.name || '').toLowerCase();
            return ['zombie', 'skeleton', 'creeper', 'spider', 'witch'].some(h => name.includes(h));
        });

        if (hostiles.length > 0) {
            findings.push(`Warning: ${hostiles.length} hostile mobs detected!`);
        }

        this.isRunning = false;
        return {
            success: true,
            message: findings.length > 0 ? findings.join('. ') : 'Area explored. Looks clear!'
        };
    }

    /**
     * Goal: Build a simple shelter
     */
    async goalBuildShelter(requestedBy) {
        this.log('Starting shelter construction');

        // Check for building materials
        const materials = ['cobblestone', 'dirt', 'oak_planks', 'spruce_planks'];
        let buildingBlock = null;

        for (const mat of materials) {
            const item = this.bot.inventory.items().find(i => i.name.includes(mat));
            if (item && item.count >= 20) {
                buildingBlock = item;
                break;
            }
        }

        if (!buildingBlock) {
            // Gather materials first
            await this.actionExecutor.executeAction('mine', { block: 'dirt', count: 30 });
        }

        this.isRunning = false;
        return {
            success: true,
            message: 'Shelter location scouted. Ready to build!'
        };
    }

    /**
     * Goal: Gather wood
     */
    async goalGatherWood(requestedBy) {
        this.log('Starting wood gathering');

        const woodTypes = ['oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log'];
        let gathered = 0;

        for (const woodType of woodTypes) {
            const result = await this.actionExecutor.executeAction('mine', { block: woodType, count: 10 });
            if (result.success) {
                gathered += 10;
                break;
            }
        }

        this.isRunning = false;
        return {
            success: gathered > 0,
            message: gathered > 0 ? `Gathered ${gathered} logs!` : 'No trees found nearby'
        };
    }

    /**
     * Goal: Gather food
     */
    async goalGatherFood(requestedBy) {
        this.log('Starting food gathering');

        // Look for animals
        const animals = ['cow', 'pig', 'chicken', 'sheep'];
        const nearbyAnimal = this.bot.nearestEntity(e => {
            if (e.type !== 'mob') return false;
            const name = (e.name || '').toLowerCase();
            return animals.some(a => name.includes(a));
        });

        if (nearbyAnimal) {
            this.isRunning = false;
            return {
                success: true,
                message: `Found ${nearbyAnimal.name}! Ready to hunt.`
            };
        }

        // Look for crops
        const crops = ['wheat', 'carrots', 'potatoes', 'beetroots'];
        for (const crop of crops) {
            const mcData = require('minecraft-data')(this.bot.version);
            const cropBlock = mcData.blocksByName[crop];
            if (cropBlock) {
                const found = this.bot.findBlock({
                    matching: cropBlock.id,
                    maxDistance: 32
                });
                if (found) {
                    this.isRunning = false;
                    return {
                        success: true,
                        message: `Found ${crop}! Harvesting.`
                    };
                }
            }
        }

        this.isRunning = false;
        return {
            success: false,
            message: 'No food sources found nearby'
        };
    }

    /**
     * Goal: Defend position
     */
    async goalDefend(requestedBy) {
        this.log('Entering defense mode');

        // Protect the requesting player
        await this.actionExecutor.executeAction('protect', { target: requestedBy });

        this.isRunning = false;
        return {
            success: true,
            message: `Defending ${requestedBy}!`
        };
    }

    /**
     * Log goal progress
     */
    log(message) {
        console.log(`[GoalManager] ${message}`);
        this.goalProgress.steps.push({ time: Date.now(), message });
    }

    /**
     * Get current goal status
     */
    getStatus() {
        return {
            currentGoal: this.currentGoal,
            isRunning: this.isRunning,
            progress: this.goalProgress
        };
    }
}

module.exports = GoalManager;
