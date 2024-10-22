const express = require("express");
const { ai, database } = require("./lib/db");

const app = express();
app.use(express.json());

const expensesTable = database.table.use("expenses");

app.get("/expenses/search", async (req, res, next) => {
  try {
    const { q } = req.query;

    const tableSchema = await expensesTable.showColumnsInfo(true);

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

    const { category, merchant, amount } = JSON.parse(completion.content);

    const rows = await expensesTable.find({
      where: {
        category,
        merchant,
        amount: amount ? Number(amount) : undefined,
      },
    });

    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/expenses", async (req, res, next) => {
  try {
    const { merchant, category } = req.query;

    const rows = await expensesTable.find({
      where: {
        merchant,
        category,
      },
    });

    res.status(200).json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/expenses/:id", async (req, res, next) => {
  try {
    const [row] = await expensesTable.find({ where: { id: req.params.id } });
    res.status(200).json(row);
  } catch (error) {
    next(error);
  }
});

app.put("/expenses/:id", async (req, res, next) => {
  try {
    const { id, ...values } = req.body;
    await expensesTable.update(values, { id: req.params.id });
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

app.delete("/expenses/:id", async (_req, res, next) => {
  try {
    await expensesTable.delete({ id: res.params.id });
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res) => {
  console.error(error.stack);
  res.status(500).send(error);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
});
