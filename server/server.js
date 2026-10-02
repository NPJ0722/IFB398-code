import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3001;

// Get __dirname in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Connect to SQLite database
const dbPath = path.join(__dirname, "strong_steady.db");
const db = new Database(dbPath);

console.log("Connected to SQLite database");

// Test route
app.get("/", (req, res) => {
  res.send("Strong & Steady API is running");
});

// Get all clients
app.get("/api/clients", (req, res) => {
  try {
    const clients = db
      .prepare("SELECT * FROM clients ORDER BY created_at DESC")
      .all();

    res.json(clients);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to load clients",
    });
  }
});

// Add a new client
app.post("/api/clients", (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      emergencyName,
      emergencyRelationship,
      emergencyPhone,
      additionalInfo,
    } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        error: "First name, last name and email are required",
      });
    }

    const statement = db.prepare(`
      INSERT INTO clients (
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        emergency_name,
        emergency_relationship,
        emergency_phone,
        additional_info,
        membership,
        last_activity
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = statement.run(
      firstName,
      lastName,
      email,
      phone || null,
      dateOfBirth || null,
      gender || null,
      emergencyName || null,
      emergencyRelationship || null,
      emergencyPhone || null,
      additionalInfo || null,
      "New client",
      "Just added"
    );

    const newClient = db
      .prepare("SELECT * FROM clients WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(newClient);
  } catch (error) {
    console.error(error);

    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        error: "A client with this email already exists",
      });
    }

    res.status(500).json({
      error: "Failed to add client",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});