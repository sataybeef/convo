import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from "node:path";

/**
 * Empty string need to be converted to `undefined` before being sent to zod,
 * to ensure `string().default(...)` is working as expected!
 * @param rule A chain of zod rules: `z.strin().min(10)...`
 * @returns A function that that takes the rule and return a regular constraint
 */
function handleEmptyString<T extends z.ZodTypeAny>(rule: T) {
  return z
    .string()
    .transform((val) =>
      typeof val === "string" && val === "" ? undefined : val,
    )
    .pipe(rule);
}

/**
 * Parse a comma separeted string and transform it to an array of strings
 */
function parseCSVString() {
  return z
    .string()
    .transform((value) => value.split(','))
    .pipe(z.array(z.string().trim()));
}

dotenv.config();

const configSchema = z.object({
  OPENAI_API_KEY: 
    z.string().min(1, "OPENAI_API_KEY is required"),
  OPENAI_MODEL: 
    handleEmptyString(z.string().default("gpt-4o-mini")),
  OPENAI_PROJECT_ID: 
    handleEmptyString(z.string().default("")),
  OPENAI_TTS_VOICE: // https://platform.openai.com/docs/guides/text-to-speech/quickstart
    handleEmptyString(z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default("onyx")),
  ASSISTANT_PROMPT_DEFAULT: 
    z.string(),
  ASSISTANT_PROMPT_HABIT_TRACKER: 
    z.string(),
  WECHATY_CHATBOT_NAME: 
    handleEmptyString(parseCSVString().default("jarvis")),
  WECHATY_GROUPCHAT_WHITELIST: 
    parseCSVString(),
  WECHATY_CONTACT_WHITELIST: 
    parseCSVString(),
  DATABASE_URL: 
    handleEmptyString(z.string().default(path.normalize(`${__dirname}/../../localdb/default.db`))),
  LOG_LEVEL: // https://github.com/winstonjs/winston?tab=readme-ov-file#logging-levels
    handleEmptyString(
      z.enum(["silly", "debug", "verbose", "http", "info", "warn", "error"])
       .default(process.env.NODE_ENV === "production" ? "info" : "debug")
    ),
});

type Config = z.infer<typeof configSchema>;
let config: Config;

/**
 * Call before accessing configuration
 * @returns The configuration object
 */
function parseConfig(): Config {
  const parsedConfig = configSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_PROJECT_ID: process.env.OPENAI_PROJECT_ID,
    OPENAI_TTS_VOICE: process.env.OPENAI_TTS_VOICE,
    ASSISTANT_PROMPT_DEFAULT: process.env.ASSISTANT_PROMPT_DEFAULT,
    ASSISTANT_PROMPT_HABIT_TRACKER: process.env.ASSISTANT_PROMPT_HABIT_TRACKER,
    WECHATY_CHATBOT_NAME: process.env.WECHATY_CHATBOT_NAME,
    WECHATY_GROUPCHAT_WHITELIST: process.env.WECHATY_GROUPCHAT_WHITELIST,
    WECHATY_CONTACT_WHITELIST: process.env.WECHATY_CONTACT_WHITELIST,
    DATABASE_URL: process.env.DATABASE_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
  });

  if (!parsedConfig.success) {
    throw new Error(`Config validation error: ${parsedConfig.error.message}`);
  }

  config = parsedConfig.data;
  return config;
};

export { 
  Config,
  config, 
  parseConfig
};
