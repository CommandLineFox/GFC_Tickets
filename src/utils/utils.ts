import {Client, PartialGroupDMChannel, RepliableInteraction} from "discord.js";

/**
 * Checks if the bot's uptime exceeds the specified minimum time.
 * @param client The bot client
 * @returns The remaining time in milliseconds if the bot hasn't reached the uptime or null
 */
export function getRemainingUptime(client: Client): number | null {
    const minUptime = 5
    const currentTime = Date.now();
    const botStartTime = client.readyTimestamp ?? currentTime;

    const elapsedTime = currentTime - botStartTime;

    if (elapsedTime >= minUptime) {
        return null;
    }

    return minUptime - elapsedTime;
}

/**
 * Asks a question and waits for a response from the user.
 * @param interaction The interaction to reply to
 * @param question The question to ask the user
 * @param timeoutMs The maximum amount of time to wait for a response (in milliseconds)
 */
export async function askAndWait(interaction: RepliableInteraction, question: string, timeoutMs = 120_000): Promise<string | null> {
    await interaction.editReply({ content: question });

    const channel = interaction.channel;
    if (!channel || channel instanceof PartialGroupDMChannel) {
        return null;
    }

    try {
        const collected = await channel.awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: timeoutMs });

        const msg = collected?.first();
        if (!msg) {
            return null;
        }

        await msg.delete();
        return msg?.content ?? null;
    } catch {
        return null;
    }
}

/**
 * Extract a valid Discord snowflake from a string.
 * Handles plain IDs, channel mentions <#ID>, role mentions <@&ID>, or user mentions <@ID>
 * @param input The string to parse
 * @returns The snowflake string or null if invalid
 */
export function parseSnowflake(input: string): string | null {
    input = input.trim();

    if (/^\d{17,20}$/.test(input)) {
        return input;
    }

    let match = input.match(/^<#(\d{17,20})>$/);
    if (match) {
        return match[1];
    }

    match = input.match(/^<@&(\d{17,20})>$/);
    if (match) {
        return match[1];
    }

    match = input.match(/^<@!?(\d{17,20})>$/);
    if (match) {
        return match[1];
    }

    return null;
}