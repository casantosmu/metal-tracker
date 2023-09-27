import { argvParser } from "./utils.js";
import { runMigrations } from "./db.js";
import { runMetalTracker } from "./main.js";

const args = argvParser(process.argv.slice(2));

if (args["topic-arn"]) {
  runMigrations();
  await runMetalTracker(args["topic-arn"]);
} else {
  throw new Error(
    "You must specify a topic ARN as a command-line argument. Example: 'node index.js --topic-arn=arn:aws:sns:us-east-1:XXXXXXXX:aws-sns-topic'",
  );
}
