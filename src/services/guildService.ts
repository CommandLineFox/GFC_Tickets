import {Document} from 'mongoose';
import Database from '../database/database';
import {Guild,} from '../types/guild';

export class GuildService {
    /**
     * Fetch the full guild configuration object
     * Returns `null` if the guild does not exist
     * @param guildId Discord guild (server) ID
     */
    public async getGuildConfig(guildId: string): Promise<Guild | null> {
        const database = Database.getInstance();
        if (!database) {
            return null;
        }

        const guildDocument = await database.getGuild(guildId) as Document | null;
        if (!guildDocument) {
            return null;
        }

        return { id: guildDocument.get('id') };
    }
}