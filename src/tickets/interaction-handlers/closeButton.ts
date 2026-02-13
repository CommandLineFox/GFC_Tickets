import {container, InteractionHandler, InteractionHandlerTypes} from "@sapphire/framework";
import {AttachmentBuilder, ButtonInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits, TextChannel} from "discord.js";
import Database from "../../database/database";
import {IndividualMessage} from "../../types/activeTicket";
import {BotClient} from "../../types/client";

export class CloseButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override async parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith("close")) {
            return this.none();
        }

        return this.some();
    }

    /**
     * Handle what happens when the close button is pressed.
     * @param interaction The button interaction
     */
    public async run(interaction: ButtonInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!interaction.inGuild()) {
            await interaction.editReply("This button can only be used in a server.");
            return;
        }

        const database = Database.getInstance();
        if (!database) {
            await interaction.editReply("There was an error fetching the database.");
            return;
        }

        const channelId = interaction.customId.split("-")[1];
        if (!channelId) {
            await interaction.editReply("There was an error fetching the channel ID.");
            return;
        }

        const ownerUserId = interaction.customId.split("-")[2];
        if (!ownerUserId) {
            await interaction.editReply("There was an error fetching the owner user ID.");
            return;
        }

        const activeTicket = await database.getActiveTicket(channelId, ownerUserId);
        if (!activeTicket) {
            await interaction.editReply("There is no active ticket for this channel.");
            return;
        }

        const member = await interaction.guild!.members.fetch(ownerUserId);
        if (!member) {
            await interaction.editReply("There was an error fetching the owner user.");
            return;
        }

        const isAdministrator = member.permissions.has(PermissionFlagsBits.Administrator);
        if (interaction.user.id !== activeTicket.responderUserId && !isAdministrator) {
            await interaction.editReply("You cannot close another user's ticket.");
            return;
        }

        const client = container.client as BotClient;
        const ticketService = client.getTicketService();
        const guildService = client.getGuildService();

        const setResponderUser = await ticketService.setResponderUser(channelId, ownerUserId, interaction.user.id);
        if (!setResponderUser.success) {
            await interaction.editReply(setResponderUser.message);
            return;
        }

        const ticketChannel = await interaction.guild!.channels.fetch(channelId);
        if (!ticketChannel) {
            await interaction.editReply("There was an error fetching the ticket channel.");
            return;
        }

        if (!(ticketChannel instanceof TextChannel)) {
            await interaction.editReply("The ticket channel is not a text channel.");
            return;
        }

        const allMessages: IndividualMessage[] = [];
        let lastMessageId: string | undefined;

        while (true) {
            const messages = await (ticketChannel as TextChannel).messages.fetch({ limit: 100, before: lastMessageId });
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

        const messageHistory = allMessages.reverse();
        const SetMessagesResponse = await ticketService.setMessageHistory(channelId, ownerUserId, messageHistory);
        if (!SetMessagesResponse.success) {
            await interaction.editReply(SetMessagesResponse.message);
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

        const attachment = new AttachmentBuilder(Buffer.from(fileContent), { name: `transcript-${channelId}.txt` });

        const ticket = await guildService.getTicket(interaction.guildId, activeTicket.type);
        if (!ticket) {
            await interaction.editReply("There was an error fetching the ticket.");
            return;
        }

        const archiveChannelId = ticket.archiveChannelId;
        if (!archiveChannelId) {
            await interaction.editReply("There is no archive channel ID for this ticket type.");
            return;
        }

        const archiveChannel = await interaction.guild!.channels.fetch(archiveChannelId);
        if (!archiveChannel) {
            await interaction.editReply("There was an error fetching the archive channel.");
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("Ticket Closed")
            .addFields(
                { name: "Opened by", value: `<@${activeTicket.ownerUserId}>`, inline: true },
                { name: "Claimed by", value: `<@${activeTicket.responderUserId}>`, inline: true },
                { name: "Closed by", value: `<@${interaction.user.id}>`, inline: true },
                { name: "Created at", value: `<t:${Math.floor(activeTicket.createdTimestamp / 1000)}:f>`, inline: true },
            )

        const closeResult = await ticketService.setClosed(channelId, ownerUserId, true);
        if (!closeResult.success) {
            await interaction.editReply(closeResult.message);
            return;
        }

        if (!archiveChannel.isSendable()) {
            await interaction.editReply("The archive channel is not sendable.");
            return;
        }

        await archiveChannel.send({ embeds: [embed], files: [attachment] });

        const dmChannel = await member.user.createDM();
        await dmChannel.send({ embeds: [embed], files: [attachment] });

        await interaction.editReply("Ticket closed.");

        if (!ticketChannel.deletable) {
            return;
        }

        await ticketChannel.delete();
    }
}