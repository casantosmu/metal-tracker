import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .union([
      z.literal("development"),
      z.literal("production"),
      z.literal("test"),
    ])
    .default("development"),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  AWS_SNS_TOPIC_ARN: z.string(),
  SNS_TOPIC_NAME: z.string(),
  EMAIL_ADDRESS: z.string().email(),
});

type Env = z.infer<typeof envSchema>;
let env: Env | undefined;

export const loadEnv = (): void => {
  if (env) {
    return;
  }

  const result = envSchema.safeParse(process.env);

  if (result.success) {
    env = result.data;
    return;
  }

  throw new Error(
    `Error loading environment variables:${result.error.errors
      .map(
        (validationError) =>
          `\n- [${validationError.path.join()}] ${validationError.message}`,
      )
      .join()}`,
  );
};

export const getEnv = (): Env => {
  if (!env) {
    throw new Error("Environment variables have not been loaded.");
  }

  return env;
};
