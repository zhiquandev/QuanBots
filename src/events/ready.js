import { Events, ActivityType } from "discord.js";
import { logger, startupLog } from "../utils/logger.js";
import config from "../config/application.js";
import { reconcileReactionRoleMessages } from "../services/reactionRoleService.js";

// Update the bot presence with live user + guild counts.
function updateDynamicPresence(client) {
  try {
    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce(
      (acc, guild) => acc + (guild.memberCount || 0),
      0
    );
    client.user.setPresence({
      status: config.bot.presence?.status || "online",
      activities: [
        {
          name: `/help | ${userCount.toLocaleString()} users, ${guildCount.toLocaleString()} guilds`,
          type: ActivityType.Watching,
        },
      ],
    });
  } catch (error) {
    logger.warn("Failed to update dynamic presence:", error.message);
  }
}

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    try {
      // Set initial dynamic presence immediately.
      updateDynamicPresence(client);

      // Refresh presence every 5 minutes so counts stay up to date.
      setInterval(() => updateDynamicPresence(client), 5 * 60 * 1000);

      startupLog(`Ready! Logged in as ${client.user.tag}`);
      startupLog(`Serving ${client.guilds.cache.size} guild(s)`);
      startupLog(`Loaded ${client.commands.size} commands`);

      const reconciliationSummary = await reconcileReactionRoleMessages(client);
      startupLog(
        `Reaction role reconciliation: scanned ${reconciliationSummary.scannedMessages}, removed ${reconciliationSummary.removedMessages}, errors ${reconciliationSummary.errors}`
      );
    } catch (error) {
      logger.error("Error in ready event:", error);
    }
  },
};


