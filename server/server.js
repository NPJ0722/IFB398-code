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

// Save or update client intake
app.post("/api/intakes", (req, res) => {
  try {
    const {
      clientId,
      experienceLevel,
      yearsOfPractice,
      previousExperience,

      hadYogaTherapy,
      lastYogaTherapySession,
      yogaTherapyFrequency,
      yogaStyles,
      otherYogaStyle,

      goals,
      otherGoals,

      yogaInterests,
      otherYogaInterest,

      activityLevel,
      stressLevel,

      hasInjury,
      injuryDetails,

      healthConditions,
      otherHealthCondition,

      takingMedication,
      medicationDetails,

      accessibilityRequirements,
      medicalCare,
      additionalInformation,
    } = req.body;

    // Basic validation
    if (!clientId || !experienceLevel || !hasInjury) {
      return res.status(400).json({
        error: "Client, experience level and injury status are required",
      });
    }

    // Check that the client exists
    const client = db
      .prepare("SELECT * FROM clients WHERE id = ?")
      .get(clientId);

    if (!client) {
      return res.status(404).json({
        error: "Client not found",
      });
    }

    // Insert a new intake, or update it if this client already has one
    const statement = db.prepare(`
            INSERT INTO client_intakes (
                client_id,
                experience_level,
                years_of_practice,
                previous_experience,

                had_yoga_therapy,
                last_yoga_therapy_session,
                yoga_therapy_frequency,
                yoga_styles,
                other_yoga_style,

                goals,
                other_goals,

                yoga_interests,
                other_yoga_interest,

                activity_level,
                stress_level,

                has_injury,
                injury_details,

                health_conditions,
                other_health_condition,

                taking_medication,
                medication_details,

                accessibility_requirements,
                medical_care,
                additional_info
            )
            VALUES (
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                ?, ?, ?
            )

            ON CONFLICT(client_id) DO UPDATE SET
                experience_level = excluded.experience_level,
                years_of_practice = excluded.years_of_practice,
                previous_experience = excluded.previous_experience,

                had_yoga_therapy = excluded.had_yoga_therapy,
                last_yoga_therapy_session = excluded.last_yoga_therapy_session,
                yoga_therapy_frequency = excluded.yoga_therapy_frequency,
                yoga_styles = excluded.yoga_styles,
                other_yoga_style = excluded.other_yoga_style,

                goals = excluded.goals,
                other_goals = excluded.other_goals,

                yoga_interests = excluded.yoga_interests,
                other_yoga_interest = excluded.other_yoga_interest,

                activity_level = excluded.activity_level,
                stress_level = excluded.stress_level,

                has_injury = excluded.has_injury,
                injury_details = excluded.injury_details,

                health_conditions = excluded.health_conditions,
                other_health_condition = excluded.other_health_condition,

                taking_medication = excluded.taking_medication,
                medication_details = excluded.medication_details,

                accessibility_requirements = excluded.accessibility_requirements,
                medical_care = excluded.medical_care,
                additional_info = excluded.additional_info,

                updated_at = CURRENT_TIMESTAMP
        `);

    statement.run(
      clientId,
      experienceLevel,
      yearsOfPractice || null,
      previousExperience || null,

      hadYogaTherapy || null,
      lastYogaTherapySession || null,
      yogaTherapyFrequency || null,
      JSON.stringify(yogaStyles || []),
      otherYogaStyle || null,

      JSON.stringify(goals || []),
      otherGoals || null,

      JSON.stringify(yogaInterests || []),
      otherYogaInterest || null,

      activityLevel || null,
      stressLevel ? Number(stressLevel) : null,

      hasInjury,
      injuryDetails || null,

      JSON.stringify(healthConditions || []),
      otherHealthCondition || null,

      takingMedication || null,
      medicationDetails || null,

      accessibilityRequirements || null,
      medicalCare || null,
      additionalInformation || null
    );

    const savedIntake = db
      .prepare(
        "SELECT * FROM client_intakes WHERE client_id = ?"
      )
      .get(clientId);

    res.status(200).json(savedIntake);

  } catch (error) {
    console.error("Failed to save intake:", error);

    res.status(500).json({
      error: "Failed to save intake",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});