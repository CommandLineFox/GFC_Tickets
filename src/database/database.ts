import mongoose, {Document, Model, Schema} from 'mongoose';
import {DatabaseConfig} from '../config/config';
import {IndividualMessage} from "../types/activeTicket";
import {Ticket} from "../types/guild";

interface GuildDocument extends Document {
    id: string;
    tickets?: Ticket[];
}

interface ActiveTicketDocument extends Document {
    ownerUserId: string;
    responderUserId?: string;
    channelId: string;
    startingMessageId?: string;
    type: string;
    locked: boolean;
    closed: boolean;
    reason?: string;
    createdTimestamp: number;
    messageHistory: IndividualMessage[];
}

const ticketSchema = new Schema<Ticket>(
    {
        type: { type: String, required: true },

        submissionChannelId: { type: String, required: false },
        submissionTitle: { type: String, required: false },
        submissionMessage: { type: String, required: false },
        submissionButtonLabel: { type: String, required: false },

        creationCategoryId: { type: String, required: false },
        archiveChannelId: { type: String, required: false },

        startingMessage: { type: String, required: false },

        roleAccess: { type: Array, required: false },
    },
    { _id: false }
);


const guildSchema = new Schema<GuildDocument>(
    {
        id: { type: String, required: true, unique: true },
        tickets: { type: [ticketSchema], required: false }
    }
);

const individualMessageSchema = new Schema<IndividualMessage>(
    {
        timeStamp: { type: String, required: true },
        message: { type: String, required: true },
        userId: { type: String, required: true }
    }
);

const activeTicketSchema = new Schema<ActiveTicketDocument>(
    {
        ownerUserId: { type: String, required: true },
        responderUserId: { type: String, required: false },
        channelId: { type: String, required: true },
        startingMessageId: { type: String, required: false },
        type: { type: String, required: true },
        locked: { type: Boolean, required: true, default: false },
        closed: { type: Boolean, required: true, default: false },
        reason: { type: String, required: false },
        createdTimestamp: { type: Number, required: true },
        messageHistory: { type: [individualMessageSchema], default: [] }
    }
);

const GuildModel: Model<GuildDocument> = mongoose.models.Guild || mongoose.model<GuildDocument>('Guild', guildSchema);
export const TicketModel: Model<ActiveTicketDocument> = mongoose.models.Ticket || mongoose.model<ActiveTicketDocument>('Ticket', activeTicketSchema);

export default class Database {
    private static instance: Database;

    private constructor(private cfg: DatabaseConfig) {
        mongoose.set('strictQuery', false);
    }

    /**
     * Get or create the singleton
     */
    public static getInstance(cfg?: DatabaseConfig): Database | null {
        if (!Database.instance) {
            if (!cfg) {
                console.info("Couldn't find database config, using default values.");
                return null;
            }

            Database.instance = new Database(cfg);
        }
        return Database.instance;
    }

    /**
     * Open connection
     */
    public async connect(): Promise<void> {
        await mongoose.connect(this.cfg.url, { dbName: this.cfg.name });
        console.info('Connected to MongoDB');
    }

    /**
     * Close connection
     */
    public async disconnect(): Promise<void> {
        await mongoose.disconnect();
        console.info('Disconnected from MongoDB');
    }

    /**
     * Get a specific guild
     * @param id Discord guild ID
     */
    public async getGuild(id: string) {
        let guild = await GuildModel.findOne({ id });
        if (!guild) {
            guild = new GuildModel({
                id
            });
            await guild.save();
        }
        return guild;
    }

    /**
     * Return all guilds
     */
    public async getAllGuilds() {
        return GuildModel.find().lean();
    }

    /**
     * Get a specific ticket
     * @param channelId Ticket channel ID
     * @param userId Ticket owner user ID
     */
    public async getActiveTicket(channelId: string, userId: string) {
        return TicketModel.findOne({ channelId: channelId, ownerUserId: userId });
    }

    /**
     * Return all tickets
     */
    public async getAllActiveTickets() {
        return TicketModel.find().lean();
    }
}