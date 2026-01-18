export interface IndividualMessage {
    timeStamp: string;
    message: string;
    userId: string;
}

export interface ActiveTicket {
    ownerUserId: string;
    responderUserId: string;

    guildId: string;
    channelId: string;
    type: string;

    locked: boolean;
    closed: boolean;

    reason: string;

    messageHistory: IndividualMessage[];
}