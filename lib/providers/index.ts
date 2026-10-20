import type { Provider } from "../oauth";
import { gmail } from "./gmail";
import { outlook } from "./outlook";
import type { MailProvider } from "./types";

export const MAIL: Record<Provider, MailProvider> = { google: gmail, microsoft: outlook };
export type { MailProvider, Incoming, Target } from "./types";
