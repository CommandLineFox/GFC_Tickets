export interface IndividualMessage {
    timeStamp: string;
    message: string;
    userId: string;
}

export interface ActiveTicket {
    ownerUserId: string;
    responderUserId?: string;

    guildId: string;
    channelId: string;
    startingMessageId?: string;
    type: string;

    locked: boolean;
    closed: boolean;

    reason?: string;

    createdTimestamp: number;

    messageHistory?: IndividualMessage[];
}