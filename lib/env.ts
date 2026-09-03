import {z} from "zod";
const schema=z.object({DATABASE_URL:z.string().min(1).default("file:./pib.sqlite"),SESSION_SECRET:z.string().min(16).default("development-only-secret-change-me")});
export const env=schema.parse({DATABASE_URL:process.env.DATABASE_URL,SESSION_SECRET:process.env.SESSION_SECRET});
