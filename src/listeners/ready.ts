import {Listener} from '@sapphire/framework';
import {BotClient} from "../types/client";

export class ReadyListener extends Listener {
    public constructor(context: Listener.LoaderContext, options: Listener.Options) {
        super(context, { ...options, once: true, event: "clientReady" });
    }

    /**
     * Run method for the client.on("ready") event
     * @param client The client that just logged in
     */
    public run(client: BotClient): void {
        const { username, id } = client.user!;
        this.container.logger.info(`Successfully logged in as ${username} (${id})`);
    }
}