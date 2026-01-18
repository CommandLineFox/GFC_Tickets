import {Guild, Role, TextChannel} from "discord.js";
import {Document} from 'mongoose';
import Database from '../database/database';
import {CustomResponse} from "../types/customResponse";
import {Guild as DatabaseGuild, Ticket,} from '../types/guild';
import {addToArray, removeFromArray, setValue, unsetValue} from "../utils/databaseUtils";

export class GuildService {
    /**
     * Fetch the full guild configuration object
     * Returns `null` if the guild does not exist
     * @param guildId Discord guild (server) ID
     */
    public async getGuildConfig(guildId: string): Promise<DatabaseGuild | null> {
        const database = Database.getInstance();
        if (!database) {
            return null;
        }

        const guildDocument = await database.getGuild(guildId) as Document | null;
        if (!guildDocument) {
            return null;
        }

        return { id: guildDocument.get('id'), tickets: guildDocument.get('tickets') };
    }

    /**
     * Get all tickets for a guild
     * Returns `null` if the guild does not exist
     * @param guildId Discord guild (server) ID
     */
    public async getTickets(guildId: string): Promise<Ticket[] | null> {
        const guildConfig = await this.getGuildConfig(guildId);

        return guildConfig?.tickets ?? null;
    }

    /**
     * Get a ticket by type
     * Returns `null` if the guild or ticket type does not exist
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async getTicket(guildId: string, ticketType: string): Promise<Ticket | null> {
        const tickets = await this.getTickets(guildId);
        if (!tickets) {
            return null;
        }

        return tickets.find((t: Ticket) => t.type === ticketType) ?? null;
    }

    /**
     * Find the index of a ticket by type
     * Returns -1 if the guild or ticket type does not exist
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    private async findTicketIndex(guildId: string, ticketType: string): Promise<number> {
        const database = Database.getInstance();
        if (!database) return -1;

        const guild = await database.getGuild(guildId) as Document | null;
        if (!guild) {
            return -1;
        }

        const tickets = await this.getTickets(guildId);
        if (!tickets) {
            return -1;
        }

        return tickets.findIndex((t: any) => t.type === ticketType);
    }

    /**
     * Add a ticket to the guild configuration
     * Returns an error message if the ticket already exists
     * @param guildId Discord guild (server) ID
     * @param ticketOrType Ticket object or ticket type string
     */
    public async addTicket(guildId: string, ticketOrType: Ticket | string): Promise<CustomResponse> {
        const ticket: Ticket = typeof ticketOrType === 'string' ? { type: ticketOrType } : ticketOrType;

        return await addToArray(guildId,
            'tickets',
            ticket,
            'A ticket with this type already exists.',
            'Ticket added successfully.',
            'Error adding ticket.');
    }

    /**
     * Remove a ticket from the guild configuration
     * Returns an error message if the ticket does not exist
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async removeTicket(guildId: string, ticketType: string): Promise<CustomResponse> {
        return await removeFromArray(guildId,
            'tickets',
            ticketType,
            false,
            'No tickets found.',
            'Ticket removed successfully.',
            'Error removing ticket.')
    }

    /**
     * Set the type of a ticket
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     * @param newType New ticket type
     */
    public async setType(guildId: string, ticketType: string, newType: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await setValue(guildId,
            `tickets.${id}.type`,
            newType,
            'A ticket with this type already exists.',
            'Ticket type set successfully.',
            'Error setting ticket type.');
    }

    /**
     * Set the submission channel for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     * @param submissionChannelId Channel ID to set as the submission channel
     */
    public async setSubmissionChannel(guildId: string, ticketType: string, submissionChannelId: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await setValue(guildId,
            `tickets.${id}.submissionChannelId`,
            submissionChannelId,
            'A ticket with this channel ID already exists.',
            'Submission channel set successfully.',
            'Error setting submission channel.');
    }

    /**
     * Remove the submission channel for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async removeSubmissionChannel(guildId: string, ticketType: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await unsetValue(guildId,
            `tickets.${id}.submissionChannelId`,
            'No submission channel is set.',
            'Submission channel removed successfully.',
            'Error removing submission channel.');
    }

    /**
     * Get the submission channel for a ticket type
     * Returns `null` if the guild, ticket type, or submission channel does not exist
     * @param guild Discord guild (server)
     * @param ticketType Ticket type
     */
    public async getSubmissionChannel(guild: Guild, ticketType: string): Promise<TextChannel | null> {
        const ticket = await this.getTicket(guild.id, ticketType);

        if (!ticket) {
            return null;
        }

        const submissionChannelId = ticket.submissionChannelId;
        if (!submissionChannelId) {
            return null;
        }

        const submissionChannel = await guild.channels.fetch(submissionChannelId)
        if (!submissionChannel) {
            return null;
        }

        if (!(submissionChannel instanceof TextChannel)) {
            return null;
        }

        return submissionChannel;
    }

    /**
     * Set the submission title for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     * @param submissionTitle Title to set as the submission title
     */
    public async setSubmissionTitle(guildId: string, ticketType: string, submissionTitle: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await setValue(guildId,
            `tickets.${id}.submissionTitle`,
            submissionTitle,
            'A ticket with this submission title already exists.',
            'Submission title set successfully.',
            'Error setting submission title.');
    }

    /**
     * Remove the submission title for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async removeSubmissionTitle(guildId: string, ticketType: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await unsetValue(guildId,
            `tickets.${id}.submissionTitle`,
            'No submission title is set.',
            'Submission title removed successfully.',
            'Error removing submission title.');
    }

    /**
     * Get the submission title for a ticket type
     * Returns `null` if the guild, ticket type, or submission title does not exist
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async getSubmissionTitle(guildId: string, ticketType: string): Promise<string | null> {
        const ticket = await this.getTicket(guildId, ticketType);

        if (!ticket) {
            return null;
        }

        const submissionTitle = ticket.submissionTitle;
        if (!submissionTitle) {
            return null;
        }

        return submissionTitle;
    }

    /**
     * Set the submission message for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     * @param submissionMessage Message to set as the submission message
     */
    public async setSubmissionMessage(guildId: string, ticketType: string, submissionMessage: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await setValue(guildId,
            `tickets.${id}.submissionMessage`,
            submissionMessage,
            'A ticket with this submission message already exists.',
            'Submission message set successfully.',
            'Error setting submission message.');
    }

    /**
     * Remove the submission message for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async removeSubmissionMessage(guildId: string, ticketType: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await unsetValue(guildId,
            `tickets.${id}.submissionMessage`,
            'No submission message is set.',
            'Submission message removed successfully.',
            'Error removing submission message.');
    }

    /**
     * Get the submission message for a ticket type
     * Returns `null` if the guild, ticket type, or submission message does not exist
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async getSubmissionMessage(guildId: string, ticketType: string): Promise<string | null> {
        const ticket = await this.getTicket(guildId, ticketType);

        if (!ticket) {
            return null;
        }

        const submissionMessage = ticket.submissionMessage;
        if (!submissionMessage) {
            return null;
        }

        return submissionMessage;
    }

    /**
     * Set the submission button label for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     * @param submissionButtonLabel Label to set as the submission button label
     */
    public async setSubmissionButtonLabel(guildId: string, ticketType: string, submissionButtonLabel: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await setValue(guildId,
            `tickets.${id}.submissionButtonLabel`,
            submissionButtonLabel,
            'A ticket with this submission button label already exists.',
            'Submission button label set successfully.',
            'Error setting submission button label.');
    }

    /**
     * Remove the submission button label for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async removeSubmissionButtonLabel(guildId: string, ticketType: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await unsetValue(guildId,
            `tickets.${id}.submissionButtonLabel`,
            'No submission button label is set.',
            'Submission button label removed successfully.',
            'Error removing submission button label.');
    }

    /**
     * Get the submission button label for a ticket type
     * Returns `null` if the guild, ticket type, or submission button label does not exist
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async getSubmissionButtonLabel(guildId: string, ticketType: string): Promise<string | null> {
        const ticket = await this.getTicket(guildId, ticketType);

        if (!ticket) {
            return null;
        }

        const submissionButtonLabel = ticket.submissionButtonLabel;
        if (!submissionButtonLabel) {
            return null;
        }

        return submissionButtonLabel;
    }

    /**
     * Set the creation category for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     * @param creationCategoryId Category ID to set as the creation category
     */
    public async setCreationCategory(guildId: string, ticketType: string, creationCategoryId: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await setValue(guildId,
            `tickets.${id}.creationCategoryId`,
            creationCategoryId,
            'A ticket with this creation category ID already exists.',
            'Creation category set successfully.',
            'Error setting creation category.');
    }

    /**
     * Remove the creation category for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async removeCreationCategory(guildId: string, ticketType: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await unsetValue(guildId,
            `tickets.${id}.creationCategoryId`,
            'No creation category is set.',
            'Creation category removed successfully.',
            'Error removing creation category.');
    }

    /**
     * Get the creation category for a ticket type
     * Returns `null` if the guild, ticket type, or creation category does not exist
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async getCreationCategory(guildId: string, ticketType: string): Promise<string | null> {
        const ticket = await this.getTicket(guildId, ticketType);
        if (!ticket) {
            return null;
        }

        const creationCategoryId = ticket.creationCategoryId;
        if (!creationCategoryId) {
            return null;
        }

        return creationCategoryId;
    }

    /**
     * Set the archive channel for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     * @param archiveChannelId Channel ID to set as the archive channel
     */
    public async setArchiveChannel(guildId: string, ticketType: string, archiveChannelId: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await setValue(guildId,
            `tickets.${id}.archiveChannelId`,
            archiveChannelId,
            'A ticket with this archive channel ID already exists.',
            'Archive channel set successfully.',
            'Error setting archive channel.');
    }

    /**
     * Remove the archive channel for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async removeArchiveChannel(guildId: string, ticketType: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await unsetValue(guildId,
            `tickets.${id}.archiveChannelId`,
            'No archive channel is set.',
            'Archive channel removed successfully.',
            'Error removing archive channel.');
    }

    /**
     * Get the archive channel for a ticket type
     * Returns `null` if the guild, ticket type, or archive channel does not exist
     * @param guild Discord guild (server)
     * @param ticketType Ticket type
     */
    public async getArchiveChannel(guild: Guild, ticketType: string): Promise<TextChannel | null> {
        const ticket = await this.getTicket(guild.id, ticketType);
        if (!ticket) {
            return null;
        }

        const archiveChannelId = ticket.archiveChannelId;
        if (!archiveChannelId) {
            return null;
        }

        const archiveChannel = await guild.channels.fetch(archiveChannelId);
        if (!archiveChannel) {
            return null;
        }

        if (!(archiveChannel instanceof TextChannel)) {
            return null;
        }

        return archiveChannel;
    }

    /**
     * Set the starting message for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     * @param startingMessage Message to set as the starting message
     */
    public async setStartingMessage(guildId: string, ticketType: string, startingMessage: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await setValue(guildId,
            `tickets.${id}.startingMessage`,
            startingMessage,
            'A ticket with this starting message already exists.',
            'Starting message set successfully.',
            'Error setting starting message.');
    }

    /**
     * Remove the starting message for a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async removeStartingMessage(guildId: string, ticketType: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await unsetValue(guildId,
            `tickets.${id}.startingMessage`,
            'No starting message is set.',
            'Starting message removed successfully.',
            'Error removing starting message.');
    }

    /**
     * Get the starting message for a ticket type
     * Returns `null` if the guild, ticket type, or starting message does not exist
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     */
    public async getStartingMessage(guildId: string, ticketType: string): Promise<string | null> {
        const ticket = await this.getTicket(guildId, ticketType);
        if (!ticket) {
            return null;
        }

        return ticket.startingMessage ?? null;
    }

    /**
     * Add a role to the list of roles that can access a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     * @param roleId Role ID to add
     */
    public async addRoleAccess(guildId: string, ticketType: string, roleId: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await addToArray(guildId,
            `tickets.${id}.roleAccess`,
            roleId,
            'A role with this ID already exists.',
            'Role added successfully.',
            'Error adding role.');
    }

    /**
     * Remove a role from the list of roles that can access a ticket type
     * @param guildId Discord guild (server) ID
     * @param ticketType Ticket type
     * @param roleId Role ID to remove
     */
    public async removeRoleAccess(guildId: string, ticketType: string, roleId: string): Promise<CustomResponse> {
        const id = await this.findTicketIndex(guildId, ticketType);
        if (id === -1) {
            return { success: false, message: 'Ticket type not found.' };
        }

        return await removeFromArray(guildId,
            `tickets.${id}.roleAccess`,
            roleId,
            false,
            'No roles found.',
            'Role removed successfully.',
            'Error removing role.');
    }

    /**
     * Get the list of roles that can access a ticket type
     * @param guild Discord guild (server)
     * @param ticketType Ticket type
     */
    public async getRoleAccess(guild: Guild, ticketType: string): Promise<Role[]> {
        const ticket = await this.getTicket(guild.id, ticketType);
        if (!ticket) {
            return [];
        }

        const roleAccess = ticket.roleAccess;
        if (!roleAccess || roleAccess.length === 0) {
            return [];
        }

        const roles = [];
        for (const roleId of roleAccess) {
            const role = await guild.roles.fetch(roleId);
            if (!role) {
                await this.removeRoleAccess(guild.id, ticketType, roleId);
                continue;
            }

            roles.push(role);
        }

        return roles;
    }
}