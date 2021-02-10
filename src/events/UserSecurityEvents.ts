import { Event } from "@kaviar/core";

export class UserLoggedInEvent extends Event<{ token: string }> {}

export class UserLoggedOutEvent extends Event<{ userId: any }> {}

export class AuthenticationTokenUpdateEvent extends Event<{ token: string }> {}
