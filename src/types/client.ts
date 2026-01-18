import {SapphireClient} from '@sapphire/framework';
import {getRootData} from '@sapphire/pieces';
import type {ClientOptions} from 'discord.js';
import {join} from "node:path";
import {ActiveTicketService} from "../services/activeTicketService";
import {GuildService} from "../services/guildService";

export class BotClient extends SapphireClient {
    private rootData = getRootData();
    private currentChecks = new Map<string, Map<string, boolean>>();
    private guildService = new GuildService();
    private ticketService = new ActiveTicketService();

    public constructor(options: ClientOptions) {
        super(options);

        this.stores.registerPath(join(this.rootData.root, 'tickets'));
    }

    public getCurrentChecks(): Map<string, Map<string, boolean>> {
        return this.currentChecks;
    }

    public getGuildService(): GuildService {
        return this.guildService;
    }

    public getTicketService(): ActiveTicketService {
        return this.ticketService;
    }
}