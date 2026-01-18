import {Command, CommandOptionsRunTypeEnum, container} from '@sapphire/framework';
import {Subcommand} from "@sapphire/plugin-subcommands";
import {ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionFlagsBits} from 'discord.js';
import {BotClient} from "../../types/client";
import {TicketFieldDescriptor, TicketSetupStep} from "../../types/ticketEdits";
import {askAndWait, parseSnowflake} from "../../utils/utils";

export class TicketCommand extends Subcommand {
    public constructor(context: Command.LoaderContext, options: Command.Options) {
        super(context, {
            ...options,
            name: "ticket",
            description: 'Manage tickets in a server',
            detailedDescription: "Manage tickets in a server",
            preconditions: ['UptimeCheck'],
            subcommands: [
                {
                    name: "add",
                    chatInputRun: "chatInputTicketAdd"
                },
                {
                    name: "edit",
                    chatInputRun: "chatInputTicketEdit"
                },
                {
                    name: "remove",
                    chatInputRun: "chatInputTicketRemove"
                },
                {
                    name: "list",
                    chatInputRun: "chatInputTicketList"
                },
                {
                    name: "post",
                    chatInputRun: "chatInputTicketPost"
                }
            ],
            runIn: CommandOptionsRunTypeEnum.GuildText,
            requiredUserPermissions: [PermissionFlagsBits.Administrator]
        });
    }

    public override registerApplicationCommands(registry: Command.Registry): void {
        registry.registerChatInputCommand((builder) =>
                builder
                    .setName(this.name)
                    .setDescription(this.description)
                    .addSubcommand(command =>
                        command
                            .setName("add")
                            .setDescription("Add a ticket to the server")
                    )
                    .addSubcommand(command =>
                        command
                            .setName("edit")
                            .setDescription("Edit a ticket")
                            .addStringOption(option =>
                                option
                                    .setName("ticket-type")
                                    .setDescription("The type of the ticket to edit")
                                    .setRequired(true)
                            )
                            .addStringOption(option =>
                                option
                                    .setName("edit")
                                    .setDescription("The part of the ticket to edit")
                                    .setChoices([
                                        { name: "Type", value: "type" },
                                        { name: "Submission channel", value: "submission channel" },
                                        { name: "Submission title", value: "submission title" },
                                        { name: "Submission message", value: "submission message" },
                                        { name: "Submission button label", value: "submission button label" },
                                        { name: "Creation category", value: "creation category" },
                                        { name: "Archive channel", value: "archive channel" },
                                        { name: "Starting message", value: "starting message" },
                                        { name: "Role access", value: "role access" }
                                    ])
                                    .setRequired(true)
                            )
                    )
                    .addSubcommand(command =>
                        command
                            .setName("remove")
                            .setDescription("Remove a ticket from the server")
                            .addStringOption(option =>
                                option
                                    .setName("ticket-type")
                                    .setDescription("The type of the ticket to remove")
                                    .setRequired(true)
                            )
                    )
                    .addSubcommand(command =>
                        command
                            .setName("post")
                            .setDescription("Post a message to a ticket")
                            .addStringOption(option =>
                                option
                                    .setName("ticket-type")
                                    .setDescription("The type of the ticket to post to")
                                    .setRequired(true)
                            )
                    )
                    .addSubcommand(command =>
                        command
                            .setName("list")
                            .setDescription("List all tickets in the server")
                    ),
            { idHints: ['1462552802726379531'] }
        );
    }

    public async chatInputTicketAdd(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const client = container.client as BotClient;
        const guildService = client.getGuildService();
        const TICKET_SETUP_STEPS: TicketSetupStep[] = [
            {
                key: "submissionChannelId",
                prompt: "Enter the submission channel (mention or ID):",
                optional: true,
                apply: async (guildId, ticketType, value) => {
                    const snowflake = parseSnowflake(value);
                    if (!snowflake) return { success: false, message: "Invalid channel ID." };

                    const guild = container.client.guilds.cache.get(guildId);
                    const channel = guild?.channels.cache.get(snowflake);
                    if (!channel) return { success: false, message: "Channel not found in this server." };
                    if (channel.type !== 0) return { success: false, message: "Channel is not a text channel." };

                    const client = container.client as BotClient;
                    return client.getGuildService().setSubmissionChannel(guildId, ticketType, snowflake);
                }
            },
            {
                key: "submissionTitle",
                prompt: "Enter the submission title:",
                optional: true,
                apply: async (guildId, ticketType, value) => {
                    const client = container.client as BotClient;
                    return client.getGuildService().setSubmissionTitle(guildId, ticketType, value);
                }
            },
            {
                key: "submissionMessage",
                prompt: "Enter the submission message:",
                optional: true,
                apply: async (guildId, ticketType, value) => {
                    const client = container.client as BotClient;
                    return client.getGuildService().setSubmissionMessage(guildId, ticketType, value);
                }
            },
            {
                key: "submissionButtonLabel",
                prompt: "Enter the submission button label:",
                optional: true,
                apply: async (guildId, ticketType, value) => {
                    const client = container.client as BotClient;
                    return client.getGuildService().setSubmissionButtonLabel(guildId, ticketType, value);
                }
            },
            {
                key: "creationCategoryId",
                prompt: "Enter the creation category (ID):",
                optional: true,
                apply: async (guildId, ticketType, value) => {
                    const snowflake = parseSnowflake(value);
                    if (!snowflake) return { success: false, message: "Invalid category ID." };

                    const guild = container.client.guilds.cache.get(guildId);
                    const category = guild?.channels.cache.get(snowflake);
                    if (!category) return { success: false, message: "Category not found in this server." };
                    if (category.type !== 4) return { success: false, message: "Channel is not a category." };

                    const client = container.client as BotClient;
                    return client.getGuildService().setCreationCategory(guildId, ticketType, snowflake);
                }
            },
            {
                key: "archiveChannelId",
                prompt: "Enter the archive channel (mention or ID):",
                optional: true,
                apply: async (guildId, ticketType, value) => {
                    const snowflake = parseSnowflake(value);
                    if (!snowflake) return { success: false, message: "Invalid channel ID." };

                    const guild = container.client.guilds.cache.get(guildId);
                    const channel = guild?.channels.cache.get(snowflake);
                    if (!channel) return { success: false, message: "Channel not found in this server." };
                    if (channel.type !== 0) return { success: false, message: "Channel is not a text channel." };

                    const client = container.client as BotClient;
                    return client.getGuildService().setArchiveChannel(guildId, ticketType, snowflake);
                }
            },
            {
                key: "startingMessage",
                prompt: "Enter the starting message:",
                optional: true,
                apply: async (guildId, ticketType, value) => {
                    const client = container.client as BotClient;
                    return client.getGuildService().setStartingMessage(guildId, ticketType, value);
                }
            },
            {
                key: "roleAccess",
                prompt: "Mention roles or provide IDs that can access this ticket:",
                optional: true,
                apply: async (guildId, ticketType, value) => {
                    const guild = container.client.guilds.cache.get(guildId);
                    if (!guild) return { success: false, message: "Guild not found." };

                    const roleIds = Array.from(value.matchAll(/<@&(\d{17,20})>|(\d{17,20})/g), m => m[1] ?? m[2])
                        .filter(id => guild.roles.cache.has(id));

                    if (roleIds.length === 0) {
                        return { success: false, message: "No valid roles found in this server." };
                    }

                    const client = container.client as BotClient;
                    let allSuccess = true;
                    for (const roleId of roleIds) {
                        const result = await client.getGuildService().addRoleAccess(guildId, ticketType, roleId);
                        if (!result.success) allSuccess = false;
                    }

                    return {
                        success: allSuccess,
                        message: allSuccess ? "Roles added successfully." : "Failed to add some roles."
                    };
                }
            }
        ];

        const ticketType = await askAndWait(interaction, "Enter a name for the ticket that you'll use to access the ticket for edits");
        if (!ticketType) {
            await interaction.editReply("Cancelled ticket creation.");
            return;
        }

        if (!interaction.guildId) {
            await interaction.editReply("This command can only be used in a server.");
            return;
        }

        const existingTicket = await guildService.getTicket(interaction.guildId, ticketType);
        if (existingTicket) {
            await interaction.editReply("A ticket with that name already exists.");
            return;
        }

        const addResult = await guildService.addTicket(interaction.guildId, ticketType);
        if (!addResult.success) {
            await interaction.editReply(addResult.message);
            return;
        }

        for (let i = 0; i < TICKET_SETUP_STEPS.length; i++) {
            const step = TICKET_SETUP_STEPS[i];

            const answer = await askAndWait(
                interaction,
                `(${i + 1}/${TICKET_SETUP_STEPS.length}) ${step.prompt}`
            );

            if (!answer) {
                await interaction.editReply("Timed out. Ticket setup cancelled.");
                await guildService.removeTicket(interaction.guildId, ticketType);
                return;
            }

            const result = await step.apply(interaction.guildId, ticketType, answer);

            if (!result.success) {
                await interaction.editReply({ content: `${result.message}` });
                await guildService.removeTicket(interaction.guildId, ticketType);
                return;
            }
        }

        await interaction.editReply(`Ticket added successfully.`);
    }

    public async chatInputTicketEdit(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const client = container.client as BotClient;
        const guildService = client.getGuildService();

        if (!interaction.guildId) {
            await interaction.editReply("This command can only be used in a server.");
            return;
        }

        const ticketType = interaction.options.getString("ticket-type", true);
        const fieldToEdit = interaction.options.getString("edit", true);

        const ticket = await guildService.getTicket(interaction.guildId, ticketType);
        if (!ticket) {
            await interaction.editReply("Ticket not found.");
            return;
        }

        const TICKET_EDIT_FIELDS: TicketFieldDescriptor[] = [
            {
                optionValue: "type",
                prompt: "Enter the new ticket type:",
                handler: async (guildId, ticketType, value) => {
                    return guildService.setType(guildId, ticketType, value);
                }
            },
            {
                optionValue: "submission channel",
                prompt: "Mention or paste the submission channel ID:",
                handler: async (guildId, ticketType, value) => {
                    const snowflake = parseSnowflake(value);
                    if (!snowflake) return { success: false, message: "Invalid channel ID." };

                    const guild = container.client.guilds.cache.get(guildId);
                    const channel = guild?.channels.cache.get(snowflake);
                    if (!channel) return { success: false, message: "Channel not found in this server." };
                    if (channel.type !== 0) return { success: false, message: "Channel is not a text channel." };

                    return guildService.setSubmissionChannel(guildId, ticketType, snowflake);
                }
            },
            {
                optionValue: "submission title",
                prompt: "Enter the new submission title:",
                handler: async (guildId, ticketType, value) => {
                    return guildService.setSubmissionTitle(guildId, ticketType, value);
                }
            },
            {
                optionValue: "submission message",
                prompt: "Enter the new submission message:",
                handler: async (guildId, ticketType, value) => {
                    return guildService.setSubmissionMessage(guildId, ticketType, value);
                }
            },
            {
                optionValue: "submission button label",
                prompt: "Enter the new button label:",
                handler: async (guildId, ticketType, value) => {
                    return guildService.setSubmissionButtonLabel(guildId, ticketType, value);
                }
            },
            {
                optionValue: "creation category",
                prompt: "Mention or paste the creation category ID:",
                handler: async (guildId, ticketType, value) => {
                    const snowflake = parseSnowflake(value);
                    if (!snowflake) return { success: false, message: "Invalid category ID." };

                    const guild = container.client.guilds.cache.get(guildId);
                    const category = guild?.channels.cache.get(snowflake);
                    if (!category) return { success: false, message: "Category not found in this server." };
                    if (category.type !== 4) return { success: false, message: "Channel is not a category." };

                    return guildService.setCreationCategory(guildId, ticketType, snowflake);
                }
            },
            {
                optionValue: "archive channel",
                prompt: "Mention or paste the archive channel ID:",
                handler: async (guildId, ticketType, value) => {
                    const snowflake = parseSnowflake(value);
                    if (!snowflake) return { success: false, message: "Invalid channel ID." };

                    const guild = container.client.guilds.cache.get(guildId);
                    const channel = guild?.channels.cache.get(snowflake);
                    if (!channel) return { success: false, message: "Channel not found in this server." };
                    if (channel.type !== 0) return { success: false, message: "Channel is not a text channel." };

                    return guildService.setArchiveChannel(guildId, ticketType, snowflake);
                }
            },
            {
                optionValue: "starting message",
                prompt: "Enter the new starting message:",
                handler: async (guildId, ticketType, value) => {
                    return guildService.setStartingMessage(guildId, ticketType, value);
                }
            },
            {
                optionValue: "role access",
                prompt: "Mention roles or provide IDs that can access this ticket:",
                handler: async (guildId, ticketType, value) => {
                    const guild = container.client.guilds.cache.get(guildId);
                    if (!guild) return { success: false, message: "Guild not found." };

                    const roleIds = Array.from(value.matchAll(/<@&(\d{17,20})>|(\d{17,20})/g), m => m[1] ?? m[2])
                        .filter(id => guild.roles.cache.has(id));

                    if (roleIds.length === 0) {
                        return { success: false, message: "No valid roles found in this server." };
                    }

                    let allSuccess = true;
                    for (const roleId of roleIds) {
                        const result = await guildService.addRoleAccess(guildId, ticketType, roleId);
                        if (!result.success) allSuccess = false;
                    }

                    return {
                        success: allSuccess,
                        message: allSuccess ? "Roles updated successfully." : "Failed to update some roles."
                    };
                }
            }
        ];

        const fieldDescriptor = TICKET_EDIT_FIELDS.find(f => f.optionValue === fieldToEdit.toLowerCase());
        if (!fieldDescriptor) {
            await interaction.editReply("Invalid field selected for editing.");
            return;
        }

        const newValue = await askAndWait(interaction, fieldDescriptor.prompt);
        if (!newValue) {
            await interaction.editReply("Timed out. Edit cancelled.");
            return;
        }

        const result = await fieldDescriptor.handler(interaction.guildId, ticketType, newValue);

        await interaction.editReply(result.message);
    }


    public async chatInputTicketRemove(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const client = container.client as BotClient;
        const guildService = client.getGuildService();

        if (!interaction.guildId) {
            await interaction.editReply("This command can only be used in a server.");
            return;
        }

        const ticket = await guildService.getTicket(interaction.guildId, interaction.options.getString("ticket-type", true));
        if (!ticket) {
            await interaction.editReply("Ticket not found.");
            return;
        }

        const removeResult = await guildService.removeTicket(interaction.guildId, ticket.type);
        await interaction.editReply(removeResult.message);
    }

    public async chatInputTicketList(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const client = container.client as BotClient;
        const guildService = client.getGuildService();

        if (!interaction.guildId) {
            await interaction.editReply("This command can only be used in a server.");
            return;
        }
        const tickets = await guildService.getTickets(interaction.guildId);
        if (!tickets || tickets.length === 0) {
            await interaction.editReply("No tickets found.");
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("Tickets")
            .setDescription(tickets.map(ticket => `**${ticket.type}** - <#${ticket.submissionChannelId}>`).join("\n"));

        await interaction.editReply({ embeds: [embed] })
    }

    public async chatInputTicketPost(interaction: Subcommand.ChatInputCommandInteraction): Promise<void> {
        if (interaction.replied || interaction.deferred) {
            await interaction.deleteReply();
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const client = container.client as BotClient;
        const guildService = client.getGuildService();

        if (!interaction.guildId) {
            await interaction.editReply("This command can only be used in a server.");
            return;
        }

        const ticket = await guildService.getTicket(interaction.guildId, interaction.options.getString("ticket-type", true));
        if (!ticket) {
            await interaction.editReply("Ticket not found.");
            return;
        }

        const channel = ticket.submissionChannelId ? interaction.guild?.channels.cache.get(ticket.submissionChannelId) : undefined;
        if (!channel) {
            await interaction.editReply("Ticket channel not found.");
            return;
        }

        if (!ticket.submissionTitle) {
            await interaction.editReply("Ticket title not found.");
            return;
        }

        if (!ticket.submissionMessage) {
            await interaction.editReply("Ticket message not found.");
            return;
        }

        if (!ticket.submissionButtonLabel) {
            await interaction.editReply("Ticket button label not found.");
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(ticket.submissionTitle)
            .setDescription(ticket.submissionMessage)

        const button = new ButtonBuilder()
            .setCustomId(ticket.type)
            .setLabel(ticket.submissionButtonLabel)
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder<ButtonBuilder>({ components: [button] });

        if (!channel.isSendable()) {
            await interaction.editReply("Ticket channel not sendable.");
            return;
        }

        channel.send({ embeds: [embed], components: [row] });
    }
}