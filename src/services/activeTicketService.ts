import Database, {TicketModel} from "../database/database";
import {ActiveTicket, IndividualMessage} from "../types/activeTicket";
import {CustomResponse} from "../types/customResponse";

export class ActiveTicketService {
    /**
     * Adds an active ticket to the database
     * @param activeTicket Active ticket to be added
     */
    public async addActiveTicket(activeTicket: ActiveTicket): Promise<CustomResponse> {
        const database = Database.getInstance();
        if (!database) {
            return { success: false, message: "There was an error fetching the database." };
        }

        const existingTicket = await database.getActiveTicket(activeTicket.channelId, activeTicket.ownerUserId);
        if (existingTicket) {
            return { success: false, message: "There is already an active ticket for this channel." };
        }

        const newTicket = new TicketModel(activeTicket);
        try {
            await newTicket.save();
            return { success: true, message: "Successfully added active ticket." };
        } catch (error) {
            return { success: false, message: "There was an error adding the active ticket." };
        }
    }

    /**
     * Removes an active ticket from the database
     * @param channelId ID of the channel
     * @param ownerUserId ID of the owner
     */
    public async removeActiveTicket(channelId: string, ownerUserId: string): Promise<CustomResponse> {
        const database = Database.getInstance();
        if (!database) {
            return { success: false, message: "There was an error fetching the database." };
        }

        const ticket = await database.getActiveTicket(channelId, ownerUserId);
        if (!ticket) {
            return { success: false, message: "There is no active ticket for this channel." };
        }

        try {
            await ticket.deleteOne();
            return { success: true, message: "Successfully removed active ticket." };
        } catch (error) {
            return { success: false, message: "There was an error removing the active ticket." };
        }
    }

    /**
     * Sets the responder user for an active ticket
     * @param channelId ID of the channel
     * @param ownerUserId ID of the owner
     * @param responderUserId ID of the responder
     */
    public async setResponderUser(channelId: string, ownerUserId: string, responderUserId: string): Promise<CustomResponse> {
        const database = Database.getInstance();
        if (!database) {
            return { success: false, message: "There was an error fetching the database." };
        }

        const activeTicket = await database.getActiveTicket(channelId, ownerUserId);
        if (!activeTicket) {
            return { success: false, message: "There is no active ticket for this channel." };
        }

        try {
            activeTicket.set("responderUserId", responderUserId);
            await activeTicket.save();
            return { success: true, message: "Successfully set responder user." };
        } catch (error) {
            return { success: false, message: "There was an error setting the responder user." };
        }
    }

    /**
     * Removes the responder user for an active ticket
     * @param channelId ID of the channel
     * @param ownerUserId ID of the owner
     */
    public async removeResponderUser(channelId: string, ownerUserId: string): Promise<CustomResponse> {
        const database = Database.getInstance();
        if (!database) {
            return { success: false, message: "There was an error fetching the database." };
        }

        const activeTicket = await database.getActiveTicket(channelId, ownerUserId);
        if (!activeTicket) {
            return { success: false, message: "There is no active ticket for this channel." };
        }

        try {
            activeTicket.set("responderUserId", undefined);
            await activeTicket.save();
            return { success: true, message: "Successfully set responder user." };
        } catch (error) {
            return { success: false, message: "There was an error setting the responder user." };
        }
    }

    /**
     * Sets the starting message ID for an active ticket.
     * @param channelId ID of the channel.
     * @param ownerUserId ID of the owner.
     * @param startingMessageId ID of the starting message.
     */
    public async setStartingMessageId(channelId: string, ownerUserId: string, startingMessageId: string): Promise<CustomResponse> {
        const database = Database.getInstance();
        if (!database) {
            return { success: false, message: "There was an error fetching the database." };
        }

        const activeTicket = await database.getActiveTicket(channelId, ownerUserId);
        if (!activeTicket) {
            return { success: false, message: "There is no active ticket for this channel." };
        }

        try {
            activeTicket.set("startingMessageId", startingMessageId);
            await activeTicket.save();
            return { success: true, message: "Successfully set starting message ID." };
        } catch (error) {
            return { success: false, message: "There was an error setting the starting message ID." };
        }
    }

    /**
     * Sets the locked status of an active ticket.
     * @param channelId ID of the channel
     * @param ownerUserId ID of the owner
     * @param locked Whether the ticket is locked
     */
    public async setLocked(channelId: string, ownerUserId: string, locked: boolean): Promise<CustomResponse> {
        const database = Database.getInstance();
        if (!database) {
            return { success: false, message: "There was an error fetching the database." };
        }

        const activeTicket = await database.getActiveTicket(channelId, ownerUserId);
        if (!activeTicket) {
            return { success: false, message: "There is no active ticket for this channel." };
        }

        try {
            activeTicket.set("locked", locked);
            await activeTicket.save();
            return { success: true, message: "Successfully set locked status." };
        } catch (error) {
            return { success: false, message: "There was an error setting the locked status." };
        }
    }

    /**
     * Sets the closed status of an active ticket.
     * @param channelId ID of the channel
     * @param ownerUserId ID of the owner
     * @param closed Whether the ticket is closed
     */
    public async setClosed(channelId: string, ownerUserId: string, closed: boolean): Promise<CustomResponse> {
        const database = Database.getInstance();
        if (!database) {
            return { success: false, message: "There was an error fetching the database." };
        }

        const activeTicket = await database.getActiveTicket(channelId, ownerUserId);
        if (!activeTicket) {
            return { success: false, message: "There is no active ticket for this channel." };
        }

        try {
            activeTicket.set("closed", closed);
            await activeTicket.save();
            return { success: true, message: "Successfully set closed status." };
        } catch (error) {
            return { success: false, message: "There was an error setting the closed status." };
        }
    }

    /**
     * Sets the message history of an active ticket.
     * @param channelId ID of the channel
     * @param ownerUserId ID of the owner
     * @param messageHistory Array of messages
     */
    public async setMessageHistory(channelId: string, ownerUserId: string, messageHistory: IndividualMessage[]): Promise<CustomResponse> {
        const database = Database.getInstance();
        if (!database) {
            return { success: false, message: "There was an error fetching the database." };
        }

        const activeTicket = await database.getActiveTicket(channelId, ownerUserId);
        if (!activeTicket) {
            return { success: false, message: "There is no active ticket for this channel." };
        }

        try {
            activeTicket.set("messageHistory", messageHistory);
            await activeTicket.save();
            return { success: true, message: "Successfully set message history." };
        } catch (error) {
            return { success: false, message: "There was an error setting the message history." };
        }
    }
}