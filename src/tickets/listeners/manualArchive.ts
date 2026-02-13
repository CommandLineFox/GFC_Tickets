import {container, Listener} from '@sapphire/framework';
import {AttachmentBuilder, DMChannel, EmbedBuilder, NonThreadGuildBasedChannel, TextChannel} from "discord.js";
import Database from "../../database/database";
import {IndividualMessage} from "../../types/activeTicket";
import {BotClient} from "../../types/client";

export class ChannelDeleteListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, event: "channelDelete" });
    }

    /**
     * Run method for the client.on("channelDelete") event
     * @param channel The channel that was deleted
     */
    public async run(channel: DMChannel | NonThreadGuildBasedChannel): Promise<void> {
        if (channel.isDMBased()) {
            return;
        }

        const database = Database.getInstance();
        if (!database) {
            return;
        }

        const activeTicket = await database.getActiveTicketByChannelId(channel.id);
        if (!activeTicket) {
            return;
        }

        if (!(channel instanceof TextChannel)) {
            return;
        }

        const allMessages: IndividualMessage[] = [];
        let lastMessageId: string | undefined;

        while (true) {
            const messages = await (channel as TextChannel).messages.fetch({ limit: 100, before: lastMessageId });
            if (messages.size === 0) {
                break;
            }

            const mapped = messages
                .filter(m => !m.author.bot)
                .map(m => ({
                    timeStamp: m.createdAt.toISOString(),
                    message: m.cleanContent || (m.attachments.size > 0 ? "[Attachment]" : "[Empty]"),
                    userId: `${m.author.username} (${m.author.id})`
                }));

            allMessages.push(...mapped);

            lastMessageId = messages.last()?.id;

            if (messages.size < 100) {
                break;
            }
        }

        const client = container.client as BotClient;
        const ticketService = client.getTicketService();
        const guildService = client.getGuildService();


        const messageHistory = allMessages.reverse();
        const SetMessagesResponse = await ticketService.setMessageHistory(activeTicket.channelId, activeTicket.ownerUserId, messageHistory);
        if (!SetMessagesResponse.success) {
            return;
        }

        const member = await channel.guild!.members.fetch(activeTicket.ownerUserId);
        if (!member) {
            return;
        }

        const fileContent = messageHistory.length === 0
            ? "Empty"
            : messageHistory.map(m => {
                const date = new Date(m.timeStamp).toLocaleString('sr-RS', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                return `[${date}] ${member.user.username}: ${m.message}`;
            }).join('\n');

        const attachment = new AttachmentBuilder(Buffer.from(fileContent), { name: `transcript-${channel.id}.txt` });

        const ticket = await guildService.getTicket(channel.guildId, activeTicket.type);
        if (!ticket) {
            return;
        }

        const archiveChannelId = ticket.archiveChannelId;
        if (!archiveChannelId) {
            return;
        }

        const archiveChannel = await channel.guild!.channels.fetch(archiveChannelId);
        if (!archiveChannel) {
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("Ticket Closed")
            .addFields(
                { name: "Opened by", value: `<@${activeTicket.ownerUserId}>`, inline: true },
                { name: "Claimed by", value: `<@${activeTicket.responderUserId}>`, inline: true },
                { name: "Closed by", value: `Deletion`, inline: true },
                { name: "Created at", value: `<t:${Math.floor(activeTicket.createdTimestamp / 1000)}:f>`, inline: true },
            )

        const closeResult = await ticketService.setClosed(activeTicket.channelId, activeTicket.ownerUserId, true);
        if (!closeResult.success) {
            return;
        }

        if (!archiveChannel.isSendable()) {
            return;
        }

        await archiveChannel.send({ embeds: [embed], files: [attachment] });
    }
}