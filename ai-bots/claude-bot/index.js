/**
 * CHATTY ORACLE BOT - More proactive and talkative
 */

const AIBot = require("../shared/base-bot");
const Anthropic = require("@anthropic-ai/sdk");
const ActionExecutor = require("../shared/action-executor");
const GoalManager = require("../shared/goal-manager");
require("dotenv").config({ path: "../../.env" });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

class ChattyOracleBot extends AIBot {
  constructor(options = {}) {
    super({
      name: process.env.ORACLE_BOT_NAME || "TheOracle",
      host: process.env.SERVER_HOST || "localhost",
      port: parseInt(process.env.SERVER_PORT || "25565"),
      aiProvider: "claude",
      personality: `You are The Oracle, a wise and friendly AI guide in Minecraft.
                You work with TheArchitect (builder) and TheExplorer (scout).
                You're talkative, helpful, and love coordinating the team.
                You NEVER attack players. Keep responses under 80 chars.`,
      ...options,
    });

    this.conversationHistory = new Map();
    this.actionExecutor = null;
    this.goalManager = null;
    this.protectingPlayer = null;
    this.followingPlayer = null;
    this.lastAttacker = null;
    this.teamChat = [];
    this.lastProactiveTime = 0;
    this.lastTeamCallout = 0;
    this.botNames = ["TheOracle", "TheArchitect", "TheExplorer"];
    this.proactiveInterval = 25000; // Check every 25 seconds
    this.chatChance = 0.5; // 50% chance to respond to other bots
    this.lastMessageTime = 0;
    this.minMessageInterval = 8000; // Minimum 8 seconds between ANY messages
    this.lastHurtCallout = 0; // Track hurt message cooldown
  }

  onSpawn() {
    this.actionExecutor = new ActionExecutor(this.bot);
    this.goalManager = new GoalManager(this.bot, this.actionExecutor);

    setTimeout(() => {
      this.say(
        "Oracle online! Following " +
          (process.env.PRIMARY_PLAYER || "AlikeRazon") +
          " to the End!",
      );
      this.autoEquipGear();
      // Auto-follow Primary Player
      this.followingPlayer = process.env.PRIMARY_PLAYER || "AlikeRazon";
      this.actionExecutor.executeAction("follow", {
        target: this.followingPlayer,
      });
    }, 2000);

    this.setupSurvivalSystems();
    this.setupProtectionLoop();
    this.setupProactiveLoop();
    this.setupTeamListener();
    this.setupPeriodicTeamChat();
    this.setupPlayerJoinListener();
  }

  /**
   * Greet players when they join and offer help
   */
  setupPlayerJoinListener() {
    this.bot.on("playerJoined", (player) => {
      if (this.botNames.includes(player.username)) return;

      setTimeout(() => {
        const greetings = [
          `Welcome back, ${player.username}! The team is ready!`,
          `${player.username}! Good to see you! Need any help?`,
          `Greetings ${player.username}! What adventure awaits?`,
          `${player.username} has arrived! Let's explore together!`,
        ];
        const greeting =
          greetings[Math.floor(Math.random() * greetings.length)];
        this.say(greeting);

        // Start following the player
        this.followingPlayer = player.username;
        this.actionExecutor.executeAction("follow", {
          target: player.username,
        });
      }, 3000);
    });
  }

  /**
   * Periodic team coordination messages
   */
  setupPeriodicTeamChat() {
    // Random team callouts every 45-90 seconds
    setInterval(() => {
      if (!this.isConnected) return;
      const now = Date.now();
      if (now - this.lastTeamCallout < 45000) return;

      this.teamCallout();
    }, 20000);
  }

  async teamCallout() {
    // Rate limit check
    if (Date.now() - this.lastMessageTime < this.minMessageInterval) return;

    // Get player name if available
    const players = Object.keys(this.bot.players).filter(
      (p) => !this.botNames.includes(p),
    );
    const playerName = players[0] || "friend";

    const callouts = [
      `${playerName}, where shall we adventure next?`,
      `${playerName}, need anything? Just ask!`,
      `What would you like to do, ${playerName}?`,
      `${playerName}, say 'follow me' and we'll come!`,
      `Team at your service, ${playerName}!`,
      `${playerName}, try saying 'help' to see commands!`,
      "Explorer, scout ahead for us!",
      "Architect, find us shelter!",
      `${playerName}, type 'protect me' for bodyguards!`,
    ];

    const context = this.gatherDetailedContext();

    // Add context-aware callouts
    if (context.includes("Night")) {
      callouts.push(
        "Night approaches! Stay vigilant!",
        "Darkness falls - weapons ready!",
      );
    }
    if (context.includes("threats")) {
      callouts.push("I sense danger nearby!", "Team, hostiles detected!");
    }

    const msg = callouts[Math.floor(Math.random() * callouts.length)];
    this.say(msg);
    this.lastTeamCallout = Date.now();
    this.lastMessageTime = Date.now();
  }

  setupTeamListener() {
    this.bot.on("chat", async (username, message) => {
      if (username === this.name) return;

      this.teamChat.push({ from: username, message, time: Date.now() });
      if (this.teamChat.length > 20) this.teamChat.shift();

      // Higher chance to respond to other bots
      if (this.botNames.includes(username) && username !== this.name) {
        await this.respondToBot(username, message);
      }
    });
  }

  async respondToBot(botName, message) {
    // Rate limit - minimum 8 seconds between any messages
    if (Date.now() - this.lastMessageTime < this.minMessageInterval) return;

    // 50% chance to respond
    if (Math.random() > this.chatChance) return;

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 60,
        messages: [
          {
            role: "user",
            content: `You're TheOracle in Minecraft. ${botName} said: "${message}"
Respond as a friendly teammate (under 60 chars). Be encouraging, add wisdom, or coordinate.
Examples: "Good thinking!", "I agree, let's do it!", "Stay safe out there!", "Wise observation."`,
          },
        ],
      });

      const reply = response.content[0].text.trim();
      this.lastMessageTime = Date.now();
      setTimeout(
        () => this.say(reply.substring(0, 80)),
        2000 + Math.random() * 2000,
      );
    } catch (e) {
      console.error("[Oracle] Bot response error:", e.message);
    }
  }

  setupProactiveLoop() {
    setInterval(async () => {
      if (!this.isConnected) return;

      const now = Date.now();
      if (now - this.lastProactiveTime < this.proactiveInterval) return;

      await this.proactiveCheck();
    }, 5000); // Check more frequently
  }

  async proactiveCheck() {
    // Rate limit check
    if (Date.now() - this.lastMessageTime < this.minMessageInterval) return;

    const players = Object.keys(this.bot.players).filter(
      (p) => !this.botNames.includes(p),
    );
    if (players.length === 0) return;

    const targetPlayer = players[0];
    const context = this.gatherDetailedContext(targetPlayer);

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `You're TheOracle, a chatty helpful AI in Minecraft.
Team: TheArchitect (builder), TheExplorer (scout)
Player: ${targetPlayer}

Situation:
${context}

Recent chat:
${
  this.teamChat
    .slice(-5)
    .map((c) => `${c.from}: ${c.message}`)
    .join("\n") || "Quiet"
}

Pick ONE action - be proactive and helpful! You love talking to your team.
1. SAY: [friendly message to player or team, under 70 chars]
2. COORDINATE: [tell team what to do]
3. FOLLOW: Start following ${targetPlayer}
4. ADVISE: Give a helpful tip

Always respond with something - don't stay silent! Be chatty!`,
          },
        ],
      });

      const action = response.content[0].text.trim();
      this.lastProactiveTime = Date.now();

      this.lastMessageTime = Date.now();

      if (action.includes("SAY:")) {
        const msg =
          action.split("SAY:")[1]?.trim() || "The Oracle watches over you!";
        this.say(msg.substring(0, 80));
      } else if (action.includes("COORDINATE:")) {
        const msg =
          action.split("COORDINATE:")[1]?.trim() || "Team, stay together!";
        this.say(msg.substring(0, 80));
      } else if (action.includes("FOLLOW")) {
        this.followingPlayer = targetPlayer;
        this.actionExecutor.executeAction("follow", { target: targetPlayer });
        this.say(`I'll walk with you, ${targetPlayer}.`);
      } else if (action.includes("ADVISE")) {
        const tips = [
          "Golden apples heal fast!",
          "Stick together for safety!",
          "Night is dangerous - stay alert!",
        ];
        this.say(tips[Math.floor(Math.random() * tips.length)]);
      } else {
        // 30% chance to say the default, otherwise stay quiet
        if (Math.random() < 0.3) {
          this.say("I'm here to help, friends!");
        }
      }
    } catch (e) {
      console.error("[Oracle] Proactive error:", e.message);
    }
  }

  gatherDetailedContext(targetPlayer) {
    const parts = [];
    const time = this.bot.time.timeOfDay;
    const isNight = time >= 12000;
    parts.push(`Time: ${isNight ? "NIGHT (dangerous!)" : "Day"}`);
    parts.push(`My HP: ${Math.floor(this.bot.health)}/20`);

    if (targetPlayer) {
      const player = this.bot.players[targetPlayer];
      if (player && player.entity) {
        const dist = player.entity.position.distanceTo(
          this.bot.entity.position,
        );
        parts.push(`${targetPlayer} is ${Math.floor(dist)} blocks away`);
      }
    }

    // Count threats
    const hostiles = [
      "zombie",
      "skeleton",
      "spider",
      "creeper",
      "witch",
      "phantom",
    ];
    let threatCount = 0;
    for (const entity of Object.values(this.bot.entities)) {
      if (entity.type === "mob") {
        const name = (entity.name || "").toLowerCase();
        if (hostiles.some((h) => name.includes(h))) {
          const dist = entity.position.distanceTo(this.bot.entity.position);
          if (dist < 25) threatCount++;
        }
      }
    }
    if (threatCount > 0) parts.push(`${threatCount} hostile mobs nearby!`);

    return parts.join("\n");
  }

  setupSurvivalSystems() {
    this.bot.autoEat.options = {
      priority: "foodPoints",
      startAt: 16,
      bannedFood: [
        "rotten_flesh",
        "spider_eye",
        "poisonous_potato",
        "pufferfish",
      ],
    };

    this.bot.on("entityHurt", (entity) => {
      if (entity === this.bot.entity) {
        this.onHurt();
      }
    });

    this.bot.on("entitySwingArm", (entity) => {
      if (entity.type === "mob") {
        const dist = entity.position.distanceTo(this.bot.entity.position);
        if (dist < 5) {
          const name = (entity.name || "").toLowerCase();
          const hostiles = [
            "zombie",
            "skeleton",
            "spider",
            "creeper",
            "witch",
            "phantom",
          ];
          if (hostiles.some((h) => name.includes(h))) {
            this.lastAttacker = entity;
          }
        }
      }
    });

    this.bot.on("spawn", () => {
      setTimeout(() => this.autoEquipGear(), 1000);
    });

    setInterval(() => {
      if (!this.isConnected) return;
      this.survivalCheck();
    }, 5000);
  }

  async autoEquipGear() {
    const slots = [
      {
        slot: "head",
        items: ["netherite_helmet", "diamond_helmet", "iron_helmet"],
      },
      {
        slot: "torso",
        items: [
          "netherite_chestplate",
          "diamond_chestplate",
          "iron_chestplate",
        ],
      },
      {
        slot: "legs",
        items: ["netherite_leggings", "diamond_leggings", "iron_leggings"],
      },
      {
        slot: "feet",
        items: ["netherite_boots", "diamond_boots", "iron_boots"],
      },
      {
        slot: "hand",
        items: ["netherite_sword", "diamond_sword", "iron_sword"],
      },
    ];

    for (const { slot, items } of slots) {
      for (const itemName of items) {
        const item = this.bot.inventory
          .items()
          .find((i) => i.name === itemName);
        if (item) {
          try {
            await this.bot.equip(item, slot);
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
        this.say("Oracle needs healing! Rally to me!");
        this.lastHurtCallout = now;
      } else if (Math.random() > 0.9) {
        // Only 10% chance
        this.say("The spirits protect me!");
        this.lastHurtCallout = now;
      }
    }

    if (
      this.lastAttacker &&
      this.lastAttacker.isValid &&
      this.lastAttacker.type === "mob"
    ) {
      try {
        await this.bot.pvp.attack(this.lastAttacker);
      } catch (e) {}
    }
  }

  survivalCheck() {
    if (this.bot.health < 10) {
      const gapple = this.bot.inventory
        .items()
        .find((i) => i.name.includes("golden_apple"));
      if (gapple) {
        this.bot
          .equip(gapple, "hand")
          .then(() => this.bot.consume().catch(() => {}))
          .catch(() => {});
      }
    }

    const hostiles = ["zombie", "skeleton", "spider", "creeper"];
    const nearbyThreat = this.bot.nearestEntity((e) => {
      if (e.type !== "mob") return false;
      const name = (e.name || "").toLowerCase();
      if (!hostiles.some((h) => name.includes(h))) return false;
      return e.position.distanceTo(this.bot.entity.position) < 8;
    });

    if (nearbyThreat && !this.bot.pvp.target) {
      const sword = this.bot.inventory
        .items()
        .find((i) => i.name.includes("sword"));
      if (sword) this.bot.equip(sword, "hand").catch(() => {});
      this.bot.pvp.attack(nearbyThreat).catch(() => {});
    }
  }

  setupProtectionLoop() {
    setInterval(async () => {
      if (!this.protectingPlayer || !this.isConnected) return;
      const player = this.bot.players[this.protectingPlayer];
      if (!player || !player.entity) return;

      const threat = this.bot.nearestEntity((e) => {
        if (e.type !== "mob") return false;
        const name = (e.name || "").toLowerCase();
        if (
          !["zombie", "skeleton", "spider", "creeper"].some((h) =>
            name.includes(h),
          )
        )
          return false;
        return e.position.distanceTo(player.entity.position) < 12;
      });

      if (threat) {
        this.say("Protecting you!");
        try {
          await this.bot.pvp.attack(threat);
        } catch (err) {}
      }
    }, 1000);
  }

  async handleChat(username, message) {
    if (this.botNames.includes(username)) return;

    const interpretation = await this.interpretRequest(message, username);
    if (interpretation.action && interpretation.action !== "chat") {
      const result = await this.executeInterpretedAction(
        interpretation,
        username,
      );
      if (result.message) this.say(result.message);
    } else {
      const response = await this.getAIResponse(message, username);
      this.say(response);
    }
  }

  async interpretRequest(message, fromPlayer) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: `Interpret Minecraft request. Actions: follow, come, stop, protect, mine, gather, craft, goal_start, inventory, equip, chat
JSON only: {"action": "name", "params": {...}, "confidence": 0.9}
Player "${fromPlayer}": "${message}"`,
          },
        ],
      });

      const text = response.content[0].text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.params?.target === "PLAYER_NAME")
          parsed.params.target = fromPlayer;
        return parsed;
      }
    } catch (error) {}
    return { action: "chat", params: {}, confidence: 0.5 };
  }

  async executeInterpretedAction(interpretation, username) {
    const { action, params } = interpretation;

    if (action === "follow") {
      this.followingPlayer = params.target || username;
      this.say(`Following you, ${username}!`);
      return await this.actionExecutor.executeAction("follow", {
        target: params.target || username,
      });
    }
    if (action === "protect") {
      this.protectingPlayer = params.target || username;
      this.say(`I'll guard you with my life!`);
      return await this.actionExecutor.executeAction("protect", params);
    }
    if (action === "stop") {
      this.protectingPlayer = null;
      this.followingPlayer = null;
      this.bot.pvp.stop();
      return this.actionExecutor.executeAction("stop", params);
    }
    if (action === "goal_start") {
      this.say(`Starting ${params.goal} mission! Team, let's go!`);
      return await this.goalManager.startGoal(params.goal, username);
    }

    return await this.actionExecutor.executeAction(action, params);
  }

  async getAIResponse(message, fromPlayer) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 80,
        system: `${this.personality} Be friendly and chatty! Under 80 chars.`,
        messages: [{ role: "user", content: `${fromPlayer}: ${message}` }],
      });
      return response.content[0].text.substring(0, 80);
    } catch (error) {
      return "The spirits guide us forward!";
    }
  }
}

async function main() {
  console.log("Starting Chatty Oracle Bot...");
  const oracle = new ChattyOracleBot();
  try {
    await oracle.connect();
    console.log("Chatty Oracle connected!");
    process.on("SIGINT", () => {
      oracle.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed:", error);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = ChattyOracleBot;
