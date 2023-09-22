import { loadEnv } from "./config.js";
import { runMetalTracker } from "./main.js";

loadEnv();
await runMetalTracker();
