import {BotClient} from './client';

declare module '@sapphire/pieces' {
    interface Container {
        client: BotClient;
    }
}