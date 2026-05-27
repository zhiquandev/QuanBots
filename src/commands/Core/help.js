import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from "../../utils/embeds.js";
import { createSelectMenu } from "../../utils/components.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORY_SELECT_ID = "help-category-select";
const ALL_COMMANDS_ID = "help-all-commands";
const BUG_REPORT_BUTTON_ID = "help-bug-report";
const HELP_MENU_TIMEOUT_MS = 5 * 60 * 1000;

const CATEGORY_ICONS = {
    Core: "ℹ️",
    Moderation: "🛡️",
    Economy: "💰",
    Fun: "🎮",
    Leveling: "📊",
    Utility: "🔧",
    Ticket: "🎫",
    Welcome: "👋",
    Giveaway: "🎉",
    Counter: "🔢",
    Tools: "🛠️",
    Search: "🔍",
    Reaction_Roles: "🎭",
    Community: "👥",
    Birthday: "🎂",
    Config: "⚙️",
};

// Category rows — 3 columns, neat grid layout
const CATEGORY_GRID = [
    { icon: "🛡️", name: "**Moderation**",    desc: "Ban, kick, mute, warn & cases"         },
    { icon: "💰", name: "**Economy**",        desc: "Currency, shop & virtual economy"       },
    { icon: "🎮", name: "**Fun**",            desc: "Games, dice, ships & more"              },
    { icon: "📊", name: "**Leveling**",       desc: "XP, rank cards & leaderboards"          },
    { icon: "🎫", name: "**Tickets**",        desc: "Support tickets & dashboards"           },
    { icon: "🎉", name: "**Giveaways**",      desc: "Create, end & reroll giveaways"         },
    { icon: "👋", name: "**Welcome**",        desc: "Greet messages & auto-roles"            },
    { icon: "🎂", name: "**Birthdays**",      desc: "Birthday tracking & celebrations"       },
    { icon: "👥", name: "**Community**",      desc: "Applications & member engagement"       },
    { icon: "⚙️", name: "**Config**",         desc: "Server & bot configuration"             },
    { icon: "🔢", name: "**Counter**",        desc: "Live stat channels & counters"          },
    { icon: "🎙️", name: "**Join To Create**", desc: "Dynamic voice channel management"       },
    { icon: "🎭", name: "**React Roles**",    desc: "Self-assignable reaction roles"         },
    { icon: "✅", name: "**Verification**",   desc: "Member verification & access gating"    },
    { icon: "🔧", name: "**Utilities**",      desc: "Useful tools & server utilities"        },
    { icon: "🛠️", name: "**Tools**",          desc: "Calculator, polls, timers & more"       },
    { icon: "🔍", name: "**Search**",         desc: "Google, movies, definitions & urban"    },
    { icon: "🗣️", name: "**Voice**",          desc: "Discord voice activities"               },
];

export async function createInitialHelpMenu(client) {
    const commandsPath = path.join(__dirname, "../../commands");
    const categoryDirs = (await fs.readdir(commandsPath, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort();

    const options = [
        {
            label: "📋 All Commands",
            description: "Browse every command with pagination",
            value: ALL_COMMANDS_ID,
        },
        ...categoryDirs.map((category) => {
            const name = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
            const icon = CATEGORY_ICONS[name] || "🔍";
            return {
                label: `${icon} ${name}`,
                description: `View commands in the ${name} category`,
                value: category,
            };
        }),
    ];

    const botName  = client?.user?.username || "Quancy";
    const botAvatar = client?.user?.displayAvatarURL({ dynamic: true }) || null;
    const guildCount = client?.guilds?.cache?.size ?? 0;
    const userCount  = client?.guilds?.cache?.reduce((a, g) => a + (g.memberCount || 0), 0) ?? 0;

    // ── Main embed ─────────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
        .setColor(0x5865F2)           // Discord blurple
        .setAuthor({
            name: `${botName} Help Center`,
            iconURL: botAvatar,
        })
        .setDescription(
            `> 🤖 Your all-in-one Discord companion — moderation, economy, leveling, fun & more.\n` +
            `> 📌 Use the **dropdown below** to browse by category, or click **All Commands** for the full list.\n\n` +
            `**📦 Currently serving** \`${userCount.toLocaleString()}\` users across \`${guildCount.toLocaleString()}\` servers.`
        )
        .setThumbnail(botAvatar);

    // Build the grid — 3 inline fields per row
    for (const cat of CATEGORY_GRID) {
        embed.addFields({
            name: `${cat.icon} ${cat.name}`,
            value: `\`\`${cat.desc}\`\``,
            inline: true,
        });
    }

    embed
        .addFields({ name: "\u200b", value: "\u200b", inline: false }) // spacer
        .setFooter({
            text: `Made By Quancy • Use /help <command> for details`,
            iconURL: botAvatar,
        })
        .setTimestamp();

    // ── Buttons ────────────────────────────────────────────────────────────────
    const bugReportButton = new ButtonBuilder()
        .setCustomId(BUG_REPORT_BUTTON_ID)
        .setLabel("🐛 Report a Bug")
        .setStyle(ButtonStyle.Danger);

    const supportButton = new ButtonBuilder()
        .setLabel("💬 Support Server")
        .setURL("https://discord.gg/V7EuJ6k5n8")
        .setStyle(ButtonStyle.Link);

    const inviteButton = new ButtonBuilder()
        .setLabel("➕ Invite Quancy")
        .setURL("https://discord.gg/V7EuJ6k5n8")
        .setStyle(ButtonStyle.Link);

    const selectRow = createSelectMenu(
        CATEGORY_SELECT_ID,
        "📂 Select a category to explore...",
        options,
    );

    const buttonRow = new ActionRowBuilder().addComponents([
        bugReportButton,
        supportButton,
        inviteButton,
    ]);

    return {
        embeds: [embed],
        components: [buttonRow, selectRow],
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays the help menu with all available commands"),

    async execute(interaction, guildConfig, client) {
        const { MessageFlags } = await import('discord.js');
        await InteractionHelper.safeDefer(interaction);

        const { embeds, components } = await createInitialHelpMenu(client);

        await InteractionHelper.safeEditReply(interaction, { embeds, components });

        setTimeout(async () => {
            try {
                const closedEmbed = createEmbed({
                    title: "⏱️ Help Menu Expired",
                    description: "This help menu has timed out. Run `/help` again to open a fresh one.",
                    color: "secondary",
                });
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [closedEmbed],
                    components: [],
                });
            } catch (_) {
                // Interaction may have already expired — safe to ignore.
            }
        }, HELP_MENU_TIMEOUT_MS);
    },
};
