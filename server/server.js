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

db.exec(`
  CREATE TABLE IF NOT EXISTS schedule_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    activity_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    time_label TEXT NOT NULL,
    meta TEXT,
    position TEXT,
    capacity TEXT,
    badge TEXT,
    time_type TEXT,
    repeat_setting TEXT,
    reason TEXT,
    prevent_bookings INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const activityCount = db
  .prepare("SELECT COUNT(*) AS count FROM schedule_activities")
  .get().count;

if (activityCount === 0) {
  const today = new Date();
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const dateKey = (offset) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const samples = [
    ["class", "Gentle Yoga", 0, "09:00", "10:00", "9:00–10:00", "Studio A", "morning", null, null],
    ["recurring", "Balance Basics", 1, "10:30", "11:30", "10:30–11:30", "Studio B", "lateMorning", null, null],
    ["series", "Strong Start", 2, "09:00", "10:00", "9:00–10:00", "Event Series · Studio A", "morning", "3 of 6", null],
    ["appointment", "Jane Wilson", 3, "13:30", "14:15", "1:30–2:15", "Appointment · Room 2", "afternoon", null, null],
    ["class", "Gentle Yoga", 4, "09:00", "10:00", "9:00–10:00", "Studio A", "morning", null, null],
    ["recurring", "Core & Calm", 5, "12:00", "13:00", "12:00–1:00", "Recurring · Studio B", "midday", null, null],
    ["blocked", "Blocked time", 6, "14:00", "16:00", "2:00–4:00", "Admin work", "lateAfternoon", null, "No bookings"],
  ];
  const insertSample = db.prepare(`
    INSERT INTO schedule_activities (
      type, title, activity_date, start_time, end_time, time_label,
      meta, position, capacity, badge, time_type, repeat_setting,
      reason, prevent_bookings
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const seedSchedule = db.transaction(() => {
    for (const sample of samples) {
      const [type, title, offset, startTime, endTime, timeLabel, meta, position, capacity, badge] = sample;
      insertSample.run(
        type,
        title,
        dateKey(offset),
        startTime,
        endTime,
        timeLabel,
        meta,
        position,
        capacity,
        badge,
        type === "blocked" ? "Administration work" : null,
        type === "blocked" ? "Does not repeat" : null,
        type === "blocked" ? meta : null,
        type === "blocked" ? 1 : 0,
      );
    }
  });
  seedSchedule();
}

const activityFromRow = (row) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  date: row.activity_date,
  startTime: row.start_time,
  endTime: row.end_time,
  time: row.time_label,
  meta: row.meta || "",
  position: row.position || "morning",
  capacity: row.capacity || undefined,
  badge: row.badge || undefined,
  timeType: row.time_type || undefined,
  repeat: row.repeat_setting || undefined,
  reason: row.reason || "",
  preventBookings: Boolean(row.prevent_bookings),
});

const activityValues = (body) => [
  body.type,
  body.title,
  body.date,
  body.startTime || null,
  body.endTime || null,
  body.time,
  body.meta || null,
  body.position || null,
  body.capacity || null,
  body.badge || null,
  body.timeType || null,
  body.repeat || null,
  body.reason || null,
  body.preventBookings ? 1 : 0,
];

// Test route
app.get("/", (req, res) => {
  res.send("Strong & Steady API is running");
});

app.get("/api/activities", (req, res) => {
  try {
    const rows = db
      .prepare("SELECT * FROM schedule_activities ORDER BY activity_date, start_time")
      .all();
    res.json(rows.map(activityFromRow));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load activities" });
  }
});

app.post("/api/activities", (req, res) => {
  try {
    if (!req.body.type || !req.body.title || !req.body.date || !req.body.time) {
      return res.status(400).json({
        error: "Type, title, date and time are required",
      });
    }
    const result = db.prepare(`
      INSERT INTO schedule_activities (
        type, title, activity_date, start_time, end_time, time_label,
        meta, position, capacity, badge, time_type, repeat_setting,
        reason, prevent_bookings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(...activityValues(req.body));
    const row = db
      .prepare("SELECT * FROM schedule_activities WHERE id = ?")
      .get(result.lastInsertRowid);
    res.status(201).json(activityFromRow(row));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create activity" });
  }
});

app.put("/api/activities/:id", (req, res) => {
  try {
    if (!req.body.type || !req.body.title || !req.body.date || !req.body.time) {
      return res.status(400).json({
        error: "Type, title, date and time are required",
      });
    }
    const result = db.prepare(`
      UPDATE schedule_activities SET
        type = ?, title = ?, activity_date = ?, start_time = ?,
        end_time = ?, time_label = ?, meta = ?, position = ?, capacity = ?,
        badge = ?, time_type = ?, repeat_setting = ?, reason = ?,
        prevent_bookings = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(...activityValues(req.body), req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Activity not found" });
    }
    const row = db
      .prepare("SELECT * FROM schedule_activities WHERE id = ?")
      .get(req.params.id);
    res.json(activityFromRow(row));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update activity" });
  }
});

app.patch("/api/activities/:id/date", (req, res) => {
  try {
    if (!req.body.date) {
      return res.status(400).json({ error: "Date is required" });
    }
    const result = db.prepare(`
      UPDATE schedule_activities
      SET activity_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.body.date, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Activity not found" });
    }
    const row = db
      .prepare("SELECT * FROM schedule_activities WHERE id = ?")
      .get(req.params.id);
    res.json(activityFromRow(row));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to move activity" });
  }
});

app.delete("/api/activities/:id", (req, res) => {
  try {
    const result = db
      .prepare("DELETE FROM schedule_activities WHERE id = ?")
      .run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Activity not found" });
    }
    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to cancel activity" });
  }
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


// Get one client with intake details
app.get("/api/clients/:id", (req, res) => {
  try {
    const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(req.params.id);
    if (!client) return res.status(404).json({ error: "Client not found" });

    const intake = db
      .prepare("SELECT * FROM client_intakes WHERE client_id = ?")
      .get(req.params.id);

    res.json({ ...client, intake: intake || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load client profile" });
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
