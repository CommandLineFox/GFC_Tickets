import {CustomResponse} from "./customResponse";
import {Ticket} from "./guild";

export interface TicketSetupStep {
    key: keyof Ticket;
    prompt: string;
    apply: (guildId: string, ticketType: string, value: string) => Promise<CustomResponse>;
    optional?: boolean;
}

type TicketEditHandler = (guildId: string, ticketType: string, value: string) => Promise<CustomResponse>;

export interface TicketFieldDescriptor {
    optionValue: string;
    prompt: string;
    handler: TicketEditHandler;
}