import { runMigrations } from "./db.js";
import { runMetalTracker } from "./main.js";
import { argvParser } from "./utils.js";

const args = argvParser(process.argv.slice(2));

if ("topic-arn" in args) {
  runMigrations();
  await runMetalTracker(args["topic-arn"]);
} else {
  console.error(
    "Error: You must specify a topic ARN as a command-line argument. Example: 'node index.js --topic-arn=arn:aws:sns:us-east-1:XXXXXXXX:aws-sns-topic'",
  );
}
