import { AI } from "@singlestore/ai";
import { SingleStoreClient } from "@singlestore/client";
import { readFileSync } from "fs";

export const ai = new AI({ openAIApiKey: process.env.OPENAI_API_KEY });
export const client = new SingleStoreClient({ ai });

export const connection = client.connect({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  ssl: {
    ca: readFileSync("./singlestore_bundle.pem"),
  },
});

export const database = connection.database.use(process.env.DB_NAME);
