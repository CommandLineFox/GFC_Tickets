import {container, InteractionHandler, InteractionHandlerTypes} from "@sapphire/framework";
import {ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, Role} from "discord.js";
import Database from "../../database/database";
import {ActiveTicket} from "../../types/activeTicket";
import {BotClient} from "../../types/client";

export class SubmitButtonHandler extends InteractionHandler {
    public constructor(ctx: InteractionHandler.LoaderContext, options: InteractionHandler.Options) {
        super(ctx, {
            ...options,
            interactionHandlerType: InteractionHandlerTypes.Button
        });
    }

    public override async parse(interaction: ButtonInteraction) {
        if (!interaction.customId.startsWith("submit")) {
            return this.none();
        }

        return this.some();
    }

    /**
     * Handle what happens when the submit button is pressed
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

        const client = container.client as BotClient;
        const guildService = client.getGuildService();

        const ticketType = interaction.customId.split("-")[1];
        if (!ticketType) {
            await interaction.editReply("There was an error fetching the ticket type.");
            return;
        }

        const ticket = await guildService.getTicket(interaction.guildId, ticketType);
        if (!ticket) {
            await interaction.editReply("There is no ticket of that type.");
            return;
        }

        const creationCategoryId = ticket.creationCategoryId;
        if (!creationCategoryId) {
            await interaction.editReply("There was an error fetching the creation category ID.");
            return;
        }

        const creationCategory = await interaction.guild!.channels.fetch(creationCategoryId);
        if (!creationCategory) {
            await interaction.editReply("There was an error fetching the creation category.");
            return;
        }

        if (creationCategory.type !== ChannelType.GuildCategory) {
            await interaction.editReply("The creation category is not a category.");
            return;
        }

        const baseChannelName = `ticket-${interaction.user.username.toLowerCase()}`;
        const guildChannels = interaction.guild!.channels.cache.filter(channel => channel.name.startsWith(baseChannelName));
        const channelName = guildChannels.size === 0 ? baseChannelName : `${baseChannelName}-${guildChannels.reduce((max, c) => Math.max(max, parseInt(c.name.split("-")[2]) || 1), 0) + 1}`;

        const roleAccess = ticket.roleAccess;
        if (!roleAccess) {
            await interaction.editReply("There was an error fetching the role access.");
            return;
        }

        const roleAccessRoles: Role[] = [];
        for (const roleId of roleAccess) {
            const role = await interaction.guild!.roles.fetch(roleId);
            if (!role) {
                await interaction.editReply("There was an error fetching a role.");
                return;
            }

            roleAccessRoles.push(role);
        }

        const permissionOverwrites = [
            {
                id: interaction.guild!.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: interaction.client.user.id,
                allow: [PermissionFlagsBits.ViewChannel]
            },
            {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel]
            },
            ...roleAccessRoles.map(role => ({ id: role.id, allow: [PermissionFlagsBits.ViewChannel] }))
        ];

        const botMember = interaction.guild!.members.me;
        if (!botMember) {
            await interaction.editReply("There was an error fetching the bot member.");
            return;
        }

        const requiredPermissions = [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.ManageChannels,
        ]

        const missingPermissions = botMember.permissions.missing(requiredPermissions);
        if (missingPermissions.length > 0) {
            await interaction.editReply(`I need the following permissions to create tickets: ${missingPermissions.join(", ")}`);
            return;
        }

        const ticketChannel = await interaction.guild!.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: creationCategory,
            permissionOverwrites: permissionOverwrites
        });

        const activeTicket: ActiveTicket = {
            ownerUserId: interaction.user.id,
            guildId: interaction.guildId,
            channelId: ticketChannel.id,
            type: ticketType,
            locked: false,
            closed: false,
            createdTimestamp: interaction.createdTimestamp
        }

        const ticketService = client.getTicketService();
        const response = await ticketService.addActiveTicket(activeTicket);
        if (!response.success) {
            await interaction.editReply(response.message);
            return;
        }

        const requiredPermissionsInTicket = [
            PermissionFlagsBits.SendMessages
        ]

        const missingPermissionsInTicket = botMember.permissionsIn(ticketChannel).missing(requiredPermissionsInTicket);
        if (missingPermissionsInTicket.length > 0) {
            await interaction.editReply(`I need the following permissions in the ticket channel: ${missingPermissionsInTicket.join(", ")}`);
            return;
        }

        const startingMessage = ticket.startingMessage;
        if (!startingMessage) {
            await interaction.editReply("There was an error fetching the starting message.");
            return;
        }

        const roleAccessMention = roleAccessRoles.map(role => `<@&${role.id}>`).join(", ");

        const embed = new EmbedBuilder()
            .setDescription(startingMessage)

        const claimButton = new ButtonBuilder()
            .setCustomId(`claim-${activeTicket.channelId}-${activeTicket.ownerUserId}`)
            .setLabel("Claim")
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder<ButtonBuilder>({ components: [claimButton] });

        if (!ticketChannel.isSendable()) {
            await interaction.editReply("Ticket channel not sendable.");
            return;
        }

        const inTicketStartingMessage = await ticketChannel.send({ content: roleAccessMention, embeds: [embed], components: [row] });
        if (!inTicketStartingMessage) {
            await interaction.editReply("There was an error sending the starting message in the ticket channel.");
            return;
        }

        const setStartingMessageId = await ticketService.setStartingMessageId(ticketChannel.id, activeTicket.ownerUserId, inTicketStartingMessage.id);
        if (!setStartingMessageId.success) {
            await interaction.editReply(setStartingMessageId.message);
            return;
        }

        await interaction.editReply(`Ticket created at <#${ticketChannel.id}>.`);
    }
}