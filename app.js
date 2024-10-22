import express from "express";
import "dotenv/config";

const app = express();
app.use(express.json());

app.get("/search", async (req, res) => {
  const { q } = req.query;

  const tableSchema = await database.table.use("<TABLE_NAME>").showColumnsInfo(true);

  const completion = await ai.chatCompletions.create({
    model: "gpt-4o",
    prompt: `\
      User prompt: ${q}
      Table schema: ${JSON.stringify(tableSchema)}

      Based on the table schema, parse the user's prompt into parameters.
      Include only the JSON value without any formatting in your response to make it ready for use with the JS JSON.parse method.
      If there is an issue return an empty JSON value.
    `,
  });

  const params = JSON.parse(completion.content);
  console.dir(params);

  const result = await database.query(`<SEARCH_QUERY>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
});
