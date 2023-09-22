import { config as dotenvConfig } from "dotenv";
import { loadEnv } from "../../src/config.js";

dotenvConfig();
loadEnv();
