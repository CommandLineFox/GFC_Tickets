import {container, InteractionHandler, InteractionHandlerTypes} from "@sapphire/framework";
import {ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, MessageFlags, PermissionFlagsBits, TextChannel} from "discord.js";
import Database from "../../database/database";
import {BotClient} from "../../types/client";

export class UnlockButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override async parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith("unlock")) {
            return this.none();
        }

        return this.some();
    }

    /**
     * Handle what happens when the unlock button is pressed.
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
            await interaction.editReply("You cannot unlock another user's ticket.");
            return;
        }

        const client = container.client as BotClient;
        const ticketService = client.getTicketService();

        const ticketChannel = await interaction.guild!.channels.fetch(channelId);
        if (!ticketChannel) {
            await interaction.editReply("There was an error fetching the ticket channel.");
            return;
        }

        if (!(ticketChannel instanceof TextChannel)) {
            await interaction.editReply("The ticket channel is not a text channel.");
            return;
        }

        if (!activeTicket.startingMessageId) {
            await interaction.editReply("There is no starting message ID for this ticket.");
            return;
        }

        const ticketStartingMessage = await (ticketChannel as TextChannel).messages.fetch(activeTicket.startingMessageId);
        if (!ticketStartingMessage) {
            await interaction.editReply("There was an error fetching the starting message.");
            return;
        }

        const unClaimButton = new ButtonBuilder()
            .setCustomId(`unclaim-${activeTicket.channelId}-${activeTicket.ownerUserId}`)
            .setLabel("Unclaim")
            .setStyle(ButtonStyle.Primary);

        const lockButton = new ButtonBuilder()
            .setCustomId(`lock-${activeTicket.channelId}-${activeTicket.ownerUserId}`)
            .setLabel("Lock")
            .setStyle(ButtonStyle.Danger);

        const closeButton = new ButtonBuilder()
            .setCustomId(`close-${activeTicket.channelId}-${activeTicket.ownerUserId}`)
            .setLabel("Close")
            .setStyle(ButtonStyle.Danger);

        const closeWithReasonButton = new ButtonBuilder()
            .setCustomId(`reason-close-${activeTicket.channelId}-${activeTicket.ownerUserId}`)
            .setLabel("Close with reason")
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder<ButtonBuilder>({ components: [unClaimButton, lockButton, closeButton, closeWithReasonButton] });
        await ticketStartingMessage.edit({ components: [row] });

        const unlockResult = await ticketService.setLocked(channelId, ownerUserId, false);
        if (!unlockResult.success) {
            await interaction.editReply(unlockResult.message);
            return;
        }

        await interaction.editReply("Ticket unlocked.");
    }
}