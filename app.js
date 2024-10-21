// app.js

// Step 1: Import dependencies
const express = require("express");
const { readFileSync } = require("fs");
const { AI } = require("@singlestore/ai");
const { SingleStoreClient } = require("@singlestore/client");
require("dotenv").config();

// Step 2: Create an instance of an Express application
const app = express();
app.use(express.json()); // Enable JSON body parsing

// Create a connection to the SingleStore Helios instance

// Create an `ai` instance to extend the app with AI functionality
const ai = new AI({ openAIApiKey: process.env.OPENAI_API_KEY });

// Create a `client` instance
const client = new SingleStoreClient({ ai });

// Establish a connection to a workspace
const connection = client.connect({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  ssl: {
    ca: readFileSync("./singlestore_bundle.pem"),
  },
});

// Use database
const database = connection.database.use(process.env.DB_NAME);

// Step 3: Define a route for the root URL (/)
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Step 4: Define routes for user management
app.get("/users", (req, res) => {
  // Construct the SQL query dynamically
  const sql = "SELECT * FROM users";

  connection.query(sql, (error, results) => {
    if (error) {
      console.log(error);
      res.status(500).send("Error fetching users");
    } else {
      res.json(results);
    }
  });
});

app.get("/users/:id", (req, res) => {
  const userId = req.params.id;

  // Construct the SQL query dynamically
  const sql = "SELECT * FROM users WHERE id = ?";
  const values = [userId];

  connection.query(sql, values, (error, results) => {
    if (error) {
      console.log(error);
      res.status(500).send("Error fetching user");
    } else {
      res.json(results[0]);
    }
  });
});

app.post("/user", (req, res) => {
  const newUser = req.body; // Assuming body-parser middleware is used

  // Construct the SQL query dynamically
  const sql = "INSERT INTO users (name, email) VALUES (?, ?)";
  const values = [newUser.name, newUser.email];

  connection.query(sql, values, (error, results) => {
    if (error) {
      console.log(error);
      res.status(500).send("Error creating user");
    } else {
      res.status(201).send(`${results.insertId}`);
    }
  });
});

app.patch("/user/:id", (req, res) => {
  const userId = req.params.id;
  const updatedUser = req.body; // Assuming body-parser middleware is used

  // Construct the SQL query dynamically
  const fields = Object.keys(updatedUser)
    .map((key) => `${key} = ?`)
    .join(", ");
  const values = [...Object.values(updatedUser), userId];
  const sql = `UPDATE users SET ${fields} WHERE id = ?`;

  connection.query(sql, values, (error, results) => {
    if (error) {
      console.log(error);
      res.status(500).send("Error updating user");
    } else {
      res.send(`User with ID ${userId} updated`);
    }
  });
});

app.delete("/user/:id", (req, res) => {
  const userId = req.params.id;

  // Construct the SQL query dynamically
  const sql = "DELETE FROM users WHERE id = ?";
  const values = [userId];

  connection.query(sql, values, (error, results) => {
    if (error) {
      console.log(error);
      res.status(500).send("Error deleting user");
    } else {
      res.send(`User with ID ${userId} deleted`);
    }
  });
});

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

// Step 5: Make the app listen on a specific port
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
});
