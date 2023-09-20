import { config as dotenvConfig } from "dotenv";
import { loadEnv } from "../src/config";

dotenvConfig();
loadEnv();
