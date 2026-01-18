export interface Ticket {
    type: string;

    submissionChannelId?: string;
    submissionTitle?: string;
    submissionMessage?: string;
    submissionButtonLabel?: string;

    creationCategoryId?: string;
    archiveChannelId?: string;

    startingMessage?: string;

    roleAccess?: string[];
}

export interface Guild {
    id: string;
    tickets?: Ticket[];
}