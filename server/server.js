import express from "express";
import cors from "cors";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, "strong_steady.db");
const db = new Database(dbPath);

console.log("Connected to SQLite database");


// ======================================================
// Schedule / Appointment database
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS schedule_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,

    client_id INTEGER,
    client_name TEXT,
    appointment_type TEXT,

    activity_date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    time_label TEXT NOT NULL,

    location TEXT,
    meta TEXT,
    position TEXT,
    capacity TEXT,
    badge TEXT,

    time_type TEXT,
    repeat_setting TEXT,
    reason TEXT,

    prevent_bookings INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Scheduled',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);


// ======================================================
// Event Series database (KAN-80 to KAN-86)
// ======================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS event_series (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    instructor TEXT,
    location TEXT,
    capacity INTEGER,
    price REAL,
    image TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS event_series_sessions (
    id TEXT PRIMARY KEY,
    series_id TEXT NOT NULL,
    session_date TEXT,
    start_time TEXT,
    end_time TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    activity_id INTEGER,
    FOREIGN KEY (series_id) REFERENCES event_series(id) ON DELETE CASCADE
  );
`);

// ======================================================
// Add new columns to an existing old database
// ======================================================

const scheduleColumns = db
  .prepare("PRAGMA table_info(schedule_activities)")
  .all()
  .map((column) => column.name);


const addColumnIfMissing = (column, sql) => {
  if (!scheduleColumns.includes(column)) {
    db.exec(sql);
  }
};


addColumnIfMissing(
  "client_id",
  "ALTER TABLE schedule_activities ADD COLUMN client_id INTEGER",
);

addColumnIfMissing(
  "client_name",
  "ALTER TABLE schedule_activities ADD COLUMN client_name TEXT",
);

addColumnIfMissing(
  "appointment_type",
  "ALTER TABLE schedule_activities ADD COLUMN appointment_type TEXT",
);

addColumnIfMissing(
  "location",
  "ALTER TABLE schedule_activities ADD COLUMN location TEXT",
);

addColumnIfMissing(
  "status",
  "ALTER TABLE schedule_activities ADD COLUMN status TEXT NOT NULL DEFAULT 'Scheduled'",
);


// ======================================================
// Demo schedule data
// Only inserted when schedule table is empty
// ======================================================

const activityCount = db
  .prepare("SELECT COUNT(*) AS count FROM schedule_activities")
  .get().count;


if (activityCount === 0) {

  const today = new Date();

  const monday = new Date(today);

  monday.setHours(0, 0, 0, 0);

  monday.setDate(
    monday.getDate() - ((monday.getDay() + 6) % 7),
  );


  const dateKey = (offset) => {

    const date = new Date(monday);

    date.setDate(date.getDate() + offset);

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1,
    ).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
  };


  const samples = [

    [
      "class",
      "Gentle Yoga",
      0,
      "09:00",
      "10:00",
      "9:00–10:00",
      "Studio A",
      "morning",
      null,
      null,
    ],

    [
      "recurring",
      "Balance Basics",
      1,
      "10:30",
      "11:30",
      "10:30–11:30",
      "Studio B",
      "lateMorning",
      null,
      null,
    ],

    [
      "series",
      "Strong Start",
      2,
      "09:00",
      "10:00",
      "9:00–10:00",
      "Event Series · Studio A",
      "morning",
      "3 of 6",
      null,
    ],

    [
      "appointment",
      "Jane Wilson",
      3,
      "13:30",
      "14:15",
      "1:30–2:15",
      "Appointment · Room 2",
      "afternoon",
      null,
      null,
    ],

    [
      "class",
      "Gentle Yoga",
      4,
      "09:00",
      "10:00",
      "9:00–10:00",
      "Studio A",
      "morning",
      null,
      null,
    ],

    [
      "recurring",
      "Core & Calm",
      5,
      "12:00",
      "13:00",
      "12:00–1:00",
      "Recurring · Studio B",
      "midday",
      null,
      null,
    ],

    [
      "blocked",
      "Blocked time",
      6,
      "14:00",
      "16:00",
      "2:00–4:00",
      "Admin work",
      "lateAfternoon",
      null,
      "No bookings",
    ],

  ];


  const insertSample = db.prepare(`
    INSERT INTO schedule_activities (
      type,
      title,
      activity_date,
      start_time,
      end_time,
      time_label,
      meta,
      position,
      capacity,
      badge,
      time_type,
      repeat_setting,
      reason,
      prevent_bookings
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);


  const seedSchedule = db.transaction(() => {

    for (const sample of samples) {

      const [
        type,
        title,
        offset,
        startTime,
        endTime,
        timeLabel,
        meta,
        position,
        capacity,
        badge,
      ] = sample;


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

        type === "blocked"
          ? "Administration work"
          : null,

        type === "blocked"
          ? "Does not repeat"
          : null,

        type === "blocked"
          ? meta
          : null,

        type === "blocked"
          ? 1
          : 0,

      );

    }

  });


  seedSchedule();

}


// ======================================================
// Convert SQLite row into frontend activity object
// ======================================================

const activityFromRow = (row) => ({

  id: row.id,

  type: row.type,

  title: row.title,

  clientId:
    row.client_id ?? undefined,

  clientName:
    row.client_name || undefined,

  appointmentType:
    row.appointment_type || undefined,

  date:
    row.activity_date,

  startTime:
    row.start_time,

  endTime:
    row.end_time,

  time:
    row.time_label,

  location:
    row.location || undefined,

  meta:
    row.meta || "",

  position:
    row.position || "morning",

  capacity:
    row.capacity || undefined,

  badge:
    row.badge || undefined,

  timeType:
    row.time_type || undefined,

  repeat:
    row.repeat_setting || undefined,

  reason:
    row.reason || "",

  preventBookings:
    Boolean(row.prevent_bookings),

  status:
    row.status || "Scheduled",

});


// ======================================================
// Values used for INSERT and UPDATE
// ======================================================

const activityValues = (body) => [

  body.type,

  body.title,

  body.clientId || null,

  body.clientName || null,

  body.appointmentType || null,

  body.date,

  body.startTime || null,

  body.endTime || null,

  body.time,

  body.location || null,

  body.meta || null,

  body.position || null,

  body.capacity || null,

  body.badge || null,

  body.timeType || null,

  body.repeat || null,

  body.reason || null,

  body.preventBookings
    ? 1
    : 0,

  body.status || "Scheduled",

];


// ======================================================
// Conflict checking
// ======================================================

const findConflict = (
  {
    date,
    startTime,
    endTime,
  },
  excludeId = null,
) => {

  if (
    !date ||
    !startTime ||
    !endTime
  ) {
    return null;
  }


  let sql = `
    SELECT *
    FROM schedule_activities
    WHERE activity_date = ?
      AND start_time IS NOT NULL
      AND end_time IS NOT NULL
      AND start_time < ?
      AND end_time > ?
      AND (
        type <> 'blocked'
        OR prevent_bookings = 1
      )
  `;


  const values = [
    date,
    endTime,
    startTime,
  ];


  if (
    excludeId !== null &&
    excludeId !== undefined
  ) {

    sql += " AND id <> ?";

    values.push(excludeId);

  }


  sql += `
    ORDER BY start_time
    LIMIT 1
  `;


  return (
    db.prepare(sql).get(...values) ||
    null
  );

};


// ======================================================
// Conflict response
// ======================================================

const conflictResponse = (
  res,
  conflict,
) => {

  return res.status(409).json({

    error:
      `This appointment conflicts with ${conflict.title} ` +
      `(${conflict.start_time}–${conflict.end_time}). ` +
      `Please choose another time.`,

    conflict:
      activityFromRow(conflict),

  });

};


// ======================================================
// Test route
// ======================================================

app.get("/", (req, res) => {

  res.send(
    "Strong & Steady API is running",
  );

});


// ======================================================
// GET all schedule activities
// ======================================================

app.get(
  "/api/activities",
  (req, res) => {

    try {

      const rows = db
        .prepare(`
          SELECT *
          FROM schedule_activities
          ORDER BY activity_date, start_time
        `)
        .all();


      res.json(
        rows.map(activityFromRow),
      );

    } catch (error) {

      console.error(error);

      res.status(500).json({
        error:
          "Failed to load activities",
      });

    }

  },
);


// ======================================================
// CREATE activity
// KAN-96 / KAN-97 / KAN-99 / KAN-100
// ======================================================

app.post(
  "/api/activities",
  (req, res) => {

    try {

      if (
        !req.body.type ||
        !req.body.title ||
        !req.body.date ||
        !req.body.time
      ) {

        return res
          .status(400)
          .json({

            error:
              "Type, title, date and time are required",

          });

      }


      // Appointment-specific validation
      if (
        req.body.type ===
        "appointment"
      ) {

        if (
          !req.body.clientId ||
          !req.body.clientName ||
          !req.body.appointmentType
        ) {

          return res
            .status(400)
            .json({

              error:
                "Client and appointment type are required",

            });

        }


        if (
          !req.body.startTime ||
          !req.body.endTime
        ) {

          return res
            .status(400)
            .json({

              error:
                "Start time and end time are required",

            });

        }


        // Make sure selected client exists
        const client = db
          .prepare(`
            SELECT id
            FROM clients
            WHERE id = ?
          `)
          .get(
            req.body.clientId,
          );


        if (!client) {

          return res
            .status(400)
            .json({

              error:
                "Selected client was not found",

            });

        }


        // Conflict check
        const conflict =
          findConflict(
            req.body,
          );


        if (conflict) {

          return conflictResponse(
            res,
            conflict,
          );

        }

      }


      const result =
        db.prepare(`
          INSERT INTO schedule_activities (
            type,
            title,
            client_id,
            client_name,
            appointment_type,
            activity_date,
            start_time,
            end_time,
            time_label,
            location,
            meta,
            position,
            capacity,
            badge,
            time_type,
            repeat_setting,
            reason,
            prevent_bookings,
            status
          )
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `)
        .run(
          ...activityValues(
            req.body,
          ),
        );


      const row = db
        .prepare(`
          SELECT *
          FROM schedule_activities
          WHERE id = ?
        `)
        .get(
          result.lastInsertRowid,
        );


      res
        .status(201)
        .json(
          activityFromRow(row),
        );

    } catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          error:
            "Failed to create activity",

        });

    }

  },
);


// ======================================================
// UPDATE activity
// KAN-97 / KAN-99
// ======================================================

app.put(
  "/api/activities/:id",
  (req, res) => {

    try {

      if (
        !req.body.type ||
        !req.body.title ||
        !req.body.date ||
        !req.body.time
      ) {

        return res
          .status(400)
          .json({

            error:
              "Type, title, date and time are required",

          });

      }


      if (
        req.body.type ===
        "appointment"
      ) {

        if (
          !req.body.clientId ||
          !req.body.clientName ||
          !req.body.appointmentType
        ) {

          return res
            .status(400)
            .json({

              error:
                "Client and appointment type are required",

            });

        }


        const conflict =
          findConflict(
            req.body,
            req.params.id,
          );


        if (conflict) {

          return conflictResponse(
            res,
            conflict,
          );

        }

      }


      const result =
        db.prepare(`
          UPDATE schedule_activities
          SET
            type = ?,
            title = ?,
            client_id = ?,
            client_name = ?,
            appointment_type = ?,
            activity_date = ?,
            start_time = ?,
            end_time = ?,
            time_label = ?,
            location = ?,
            meta = ?,
            position = ?,
            capacity = ?,
            badge = ?,
            time_type = ?,
            repeat_setting = ?,
            reason = ?,
            prevent_bookings = ?,
            status = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .run(
          ...activityValues(
            req.body,
          ),
          req.params.id,
        );


      if (
        result.changes === 0
      ) {

        return res
          .status(404)
          .json({

            error:
              "Activity not found",

          });

      }


      const row = db
        .prepare(`
          SELECT *
          FROM schedule_activities
          WHERE id = ?
        `)
        .get(
          req.params.id,
        );


      res.json(
        activityFromRow(row),
      );

    } catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          error:
            "Failed to update activity",

        });

    }

  },
);


// ======================================================
// Drag-and-drop activity to another date
// KAN-101 / KAN-102
// ======================================================

app.patch(
  "/api/activities/:id/date",
  (req, res) => {

    try {

      if (!req.body.date) {

        return res
          .status(400)
          .json({

            error:
              "Date is required",

          });

      }


      const existing = db
        .prepare(`
          SELECT *
          FROM schedule_activities
          WHERE id = ?
        `)
        .get(
          req.params.id,
        );


      if (!existing) {

        return res
          .status(404)
          .json({

            error:
              "Activity not found",

          });

      }


      // Appointment conflict checking
      // when dragging to another date
      if (
        existing.type ===
        "appointment"
      ) {

        const conflict =
          findConflict(
            {

              date:
                req.body.date,

              startTime:
                existing.start_time,

              endTime:
                existing.end_time,

            },
            req.params.id,
          );


        if (conflict) {

          return conflictResponse(
            res,
            conflict,
          );

        }

      }


      db.prepare(`
        UPDATE schedule_activities
        SET
          activity_date = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
        .run(
          req.body.date,
          req.params.id,
        );


      const row = db
        .prepare(`
          SELECT *
          FROM schedule_activities
          WHERE id = ?
        `)
        .get(
          req.params.id,
        );


      res.json(
        activityFromRow(row),
      );

    } catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          error:
            "Failed to move activity",

        });

    }

  },
);


// ======================================================
// CANCEL / DELETE activity
// KAN-97
// ======================================================

app.delete(
  "/api/activities/:id",
  (req, res) => {

    try {

      const result = db
        .prepare(`
          DELETE FROM schedule_activities
          WHERE id = ?
        `)
        .run(
          req.params.id,
        );


      if (
        result.changes === 0
      ) {

        return res
          .status(404)
          .json({

            error:
              "Activity not found",

          });

      }


      res
        .status(204)
        .end();

    } catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          error:
            "Failed to cancel activity",

        });

    }

  },
);


// ======================================================
// Event Series API (KAN-80 to KAN-86)
// ======================================================

const seriesFromRow = (row) => {
  const sessions = db.prepare(`
    SELECT id, session_date, start_time, end_time, status, activity_id
    FROM event_series_sessions
    WHERE series_id = ?
    ORDER BY CASE WHEN session_date IS NULL OR session_date = '' THEN 1 ELSE 0 END, session_date, start_time
  `).all(row.id).map((session) => ({
    id: session.id,
    date: session.session_date || "",
    startTime: session.start_time || "",
    endTime: session.end_time || "",
    status: session.status || "scheduled",
    activityId: session.activity_id || undefined,
  }));

  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    instructor: row.instructor || "",
    location: row.location || "",
    capacity: row.capacity || 0,
    price: row.price || 0,
    image: row.image || null,
    status: row.status || "draft",
    sessions,
  };
};

const createSeriesActivity = (series, session, progressLabel) => {
  const activity = {
    type: "series",
    title: series.name,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    time: `${session.startTime}–${session.endTime}`,
    location: series.location || undefined,
    meta: `Event Series · ${series.location || "Location not set"}`,
    position: "morning",
    capacity: progressLabel,
    status: "Scheduled",
  };
  const result = db.prepare(`
    INSERT INTO schedule_activities (
      type, title, client_id, client_name, appointment_type,
      activity_date, start_time, end_time, time_label, location,
      meta, position, capacity, badge, time_type, repeat_setting,
      reason, prevent_bookings, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(...activityValues(activity));
  return Number(result.lastInsertRowid);
};

app.get("/api/event-series", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM event_series ORDER BY created_at DESC").all();
    res.json(rows.map(seriesFromRow));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load event series" });
  }
});

app.post("/api/event-series", (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: "Series name is required" });
    const id = req.body.id || `series-${Date.now()}`;
    const sessions = Array.isArray(req.body.sessions) ? req.body.sessions : [];
    if (req.body.status === "published" && !sessions.some((session) => session.date)) {
      return res.status(400).json({ error: "A published series needs at least one dated session" });
    }

    const save = db.transaction(() => {
      db.prepare(`
        INSERT INTO event_series (id, name, description, instructor, location, capacity, price, image, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, req.body.name, req.body.description || null, req.body.instructor || null,
        req.body.location || null, req.body.capacity || 0, req.body.price || 0,
        req.body.image || null, req.body.status || "draft");

      const datedCount = sessions.filter((session) => session.date).length;
      sessions.forEach((session, index) => {
        const sessionId = session.id || `session-${Date.now()}-${index}`;
        let activityId = null;
        if (req.body.status === "published" && session.date) {
          activityId = createSeriesActivity(
            { ...req.body, id },
            { ...session, id: sessionId },
            `${index + 1} of ${datedCount}`,
          );
        }
        db.prepare(`
          INSERT INTO event_series_sessions (id, series_id, session_date, start_time, end_time, status, activity_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(sessionId, id, session.date || null, session.startTime || null,
          session.endTime || null, session.status || "scheduled", activityId);
      });
    });
    save();
    res.status(201).json(seriesFromRow(db.prepare("SELECT * FROM event_series WHERE id = ?").get(id)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create event series" });
  }
});

app.put("/api/event-series/:id", (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM event_series WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Event series not found" });
    if (!req.body.name || !String(req.body.name).trim()) {
      return res.status(400).json({ error: "Series name is required" });
    }

    const update = db.transaction(() => {
      db.prepare(`
        UPDATE event_series
        SET name = ?, description = ?, instructor = ?, location = ?, capacity = ?, price = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        String(req.body.name).trim(),
        req.body.description || null,
        req.body.instructor || null,
        req.body.location || null,
        Number(req.body.capacity) || 0,
        Number(req.body.price) || 0,
        req.params.id,
      );

      const sessionRows = db.prepare(
        "SELECT activity_id FROM event_series_sessions WHERE series_id = ? AND activity_id IS NOT NULL",
      ).all(req.params.id);
      const activityUpdate = db.prepare(`
        UPDATE schedule_activities
        SET title = ?, location = ?, meta = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      sessionRows.forEach((session) => {
        activityUpdate.run(
          String(req.body.name).trim(),
          req.body.location || null,
          `Event Series · ${req.body.location || "Location not set"}`,
          session.activity_id,
        );
      });
    });
    update();

    res.json(seriesFromRow(db.prepare("SELECT * FROM event_series WHERE id = ?").get(req.params.id)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update event series" });
  }
});

app.delete("/api/event-series/:id", (req, res) => {
  try {
    const existing = db.prepare("SELECT * FROM event_series WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Event series not found" });

    const remove = db.transaction(() => {
      const sessions = db.prepare(
        "SELECT activity_id FROM event_series_sessions WHERE series_id = ? AND activity_id IS NOT NULL",
      ).all(req.params.id);
      const deleteActivity = db.prepare("DELETE FROM schedule_activities WHERE id = ?");
      sessions.forEach((session) => deleteActivity.run(session.activity_id));
      db.prepare("DELETE FROM event_series_sessions WHERE series_id = ?").run(req.params.id);
      db.prepare("DELETE FROM event_series WHERE id = ?").run(req.params.id);
    });
    remove();

    res.status(204).end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to remove event series" });
  }
});

app.post("/api/event-series/:id/sessions", (req, res) => {
  try {
    const series = db.prepare("SELECT * FROM event_series WHERE id = ?").get(req.params.id);
    if (!series) return res.status(404).json({ error: "Event series not found" });
    if (!req.body.date || !req.body.startTime || !req.body.endTime) {
      return res.status(400).json({ error: "Date, start time and end time are required" });
    }
    const sessionId = req.body.id || `session-${Date.now()}`;
    const activityId = createSeriesActivity(series, { ...req.body, id: sessionId }, null);
    db.prepare(`
      INSERT INTO event_series_sessions (id, series_id, session_date, start_time, end_time, status, activity_id)
      VALUES (?, ?, ?, ?, ?, 'scheduled', ?)
    `).run(sessionId, req.params.id, req.body.date, req.body.startTime, req.body.endTime, activityId);
    db.prepare("UPDATE event_series SET status = 'published', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.status(201).json(seriesFromRow(db.prepare("SELECT * FROM event_series WHERE id = ?").get(req.params.id)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add series session" });
  }
});

app.put("/api/event-series/:seriesId/sessions/:sessionId", (req, res) => {
  try {
    const selected = db.prepare("SELECT * FROM event_series_sessions WHERE id = ? AND series_id = ?")
      .get(req.params.sessionId, req.params.seriesId);
    const series = db.prepare("SELECT * FROM event_series WHERE id = ?").get(req.params.seriesId);
    if (!selected || !series) return res.status(404).json({ error: "Series session not found" });

    const targets = req.body.scope === "series"
      ? db.prepare("SELECT * FROM event_series_sessions WHERE series_id = ? AND status <> 'cancelled'").all(req.params.seriesId)
      : [selected];

    const update = db.transaction(() => {
      targets.forEach((session) => {
        const isSelected = session.id === req.params.sessionId;
        const date = isSelected ? req.body.date : session.session_date;
        const startTime = req.body.startTime;
        const endTime = req.body.endTime;
        db.prepare("UPDATE event_series_sessions SET session_date = ?, start_time = ?, end_time = ? WHERE id = ?")
          .run(date, startTime, endTime, session.id);
        if (session.activity_id) {
          const activity = {
            type: "series", title: series.name, date, startTime, endTime,
            time: `${startTime}–${endTime}`, location: series.location || undefined,
            meta: `Event Series · ${series.location || "Location not set"}`,
            position: "morning", status: "Scheduled",
          };
          db.prepare(`
            UPDATE schedule_activities SET type=?, title=?, client_id=?, client_name=?, appointment_type=?,
            activity_date=?, start_time=?, end_time=?, time_label=?, location=?, meta=?, position=?,
            capacity=?, badge=?, time_type=?, repeat_setting=?, reason=?, prevent_bookings=?, status=?,
            updated_at=CURRENT_TIMESTAMP WHERE id=?
          `).run(...activityValues(activity), session.activity_id);
        }
      });
    });
    update();
    res.json(seriesFromRow(db.prepare("SELECT * FROM event_series WHERE id = ?").get(req.params.seriesId)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update series session" });
  }
});

app.patch("/api/event-series/:seriesId/sessions/:sessionId/cancel", (req, res) => {
  try {
    const session = db.prepare("SELECT * FROM event_series_sessions WHERE id = ? AND series_id = ?")
      .get(req.params.sessionId, req.params.seriesId);
    if (!session) return res.status(404).json({ error: "Series session not found" });
    const cancel = db.transaction(() => {
      if (session.activity_id) db.prepare("DELETE FROM schedule_activities WHERE id = ?").run(session.activity_id);
      db.prepare("UPDATE event_series_sessions SET status = 'cancelled', activity_id = NULL WHERE id = ?").run(session.id);
    });
    cancel();
    res.json(seriesFromRow(db.prepare("SELECT * FROM event_series WHERE id = ?").get(req.params.seriesId)));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to cancel series session" });
  }
});

app.delete("/api/event-series/:seriesId/sessions/:sessionId", (req, res) => {
  try {
    const session = db.prepare("SELECT * FROM event_series_sessions WHERE id = ? AND series_id = ?")
      .get(req.params.sessionId, req.params.seriesId);
    const series = db.prepare("SELECT * FROM event_series WHERE id = ?").get(req.params.seriesId);
    if (!session || !series) return res.status(404).json({ error: "Series session not found" });

    let seriesDeleted = false;
    const remove = db.transaction(() => {
      if (session.activity_id) db.prepare("DELETE FROM schedule_activities WHERE id = ?").run(session.activity_id);
      db.prepare("DELETE FROM event_series_sessions WHERE id = ?").run(session.id);

      const remaining = db.prepare("SELECT COUNT(*) AS count FROM event_series_sessions WHERE series_id = ?")
        .get(req.params.seriesId).count;
      if (series.status === "published" && remaining === 0) {
        db.prepare("DELETE FROM event_series WHERE id = ?").run(req.params.seriesId);
        seriesDeleted = true;
      }
    });
    remove();

    if (seriesDeleted) {
      return res.json({ ok: true, seriesDeleted: true });
    }
    const savedSeries = db.prepare("SELECT * FROM event_series WHERE id = ?").get(req.params.seriesId);
    res.json({ ok: true, seriesDeleted: false, series: seriesFromRow(savedSeries) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to remove series session" });
  }
});


// ======================================================
// GET all clients
// ======================================================

app.get(
  "/api/clients",
  (req, res) => {

    try {

      const clients = db
        .prepare(`
          SELECT *
          FROM clients
          ORDER BY created_at DESC
        `)
        .all();


      res.json(clients);

    } catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          error:
            "Failed to load clients",

        });

    }

  },
);


// ======================================================
// GET one client + intake + linked appointments
// KAN-100
// ======================================================

app.get(
  "/api/clients/:id",
  (req, res) => {

    try {

      const client = db
        .prepare(`
          SELECT *
          FROM clients
          WHERE id = ?
        `)
        .get(
          req.params.id,
        );


      if (!client) {

        return res
          .status(404)
          .json({

            error:
              "Client not found",

          });

      }


      const intake = db
        .prepare(`
          SELECT *
          FROM client_intakes
          WHERE client_id = ?
        `)
        .get(
          req.params.id,
        );


      const appointments = db
        .prepare(`
          SELECT *
          FROM schedule_activities
          WHERE
            type = 'appointment'
            AND client_id = ?
          ORDER BY
            activity_date,
            start_time
        `)
        .all(
          req.params.id,
        )
        .map(
          activityFromRow,
        );


      res.json({

        ...client,

        intake:
          intake || null,

        appointments,

      });

    } catch (error) {

      console.error(error);

      res
        .status(500)
        .json({

          error:
            "Failed to load client profile",

        });

    }

  },
);


// ======================================================
// ADD new client
// ======================================================

app.post(
  "/api/clients",
  (req, res) => {

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


      if (
        !firstName ||
        !lastName ||
        !email
      ) {

        return res
          .status(400)
          .json({

            error:
              "First name, last name and email are required",

          });

      }


      const statement =
        db.prepare(`
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
          VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `);


      const result =
        statement.run(

          firstName,

          lastName,

          email,

          phone || null,

          dateOfBirth || null,

          gender || null,

          emergencyName || null,

          emergencyRelationship ||
            null,

          emergencyPhone ||
            null,

          additionalInfo ||
            null,

          "New client",

          "Just added",

        );


      const newClient = db
        .prepare(`
          SELECT *
          FROM clients
          WHERE id = ?
        `)
        .get(
          result.lastInsertRowid,
        );


      res
        .status(201)
        .json(
          newClient,
        );

    } catch (error) {

      console.error(error);


      if (
        error.code ===
        "SQLITE_CONSTRAINT_UNIQUE"
      ) {

        return res
          .status(409)
          .json({

            error:
              "A client with this email already exists",

          });

      }


      res
        .status(500)
        .json({

          error:
            "Failed to add client",

        });

    }

  },
);


// ======================================================
// SAVE / UPDATE client intake
// ======================================================

app.post(
  "/api/intakes",
  (req, res) => {

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


      if (
        !clientId ||
        !experienceLevel ||
        !hasInjury
      ) {

        return res
          .status(400)
          .json({

            error:
              "Client, experience level and injury status are required",

          });

      }


      const client = db
        .prepare(`
          SELECT *
          FROM clients
          WHERE id = ?
        `)
        .get(
          clientId,
        );


      if (!client) {

        return res
          .status(404)
          .json({

            error:
              "Client not found",

          });

      }


      const statement =
        db.prepare(`
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

          ON CONFLICT(client_id)
          DO UPDATE SET

            experience_level =
              excluded.experience_level,

            years_of_practice =
              excluded.years_of_practice,

            previous_experience =
              excluded.previous_experience,

            had_yoga_therapy =
              excluded.had_yoga_therapy,

            last_yoga_therapy_session =
              excluded.last_yoga_therapy_session,

            yoga_therapy_frequency =
              excluded.yoga_therapy_frequency,

            yoga_styles =
              excluded.yoga_styles,

            other_yoga_style =
              excluded.other_yoga_style,

            goals =
              excluded.goals,

            other_goals =
              excluded.other_goals,

            yoga_interests =
              excluded.yoga_interests,

            other_yoga_interest =
              excluded.other_yoga_interest,

            activity_level =
              excluded.activity_level,

            stress_level =
              excluded.stress_level,

            has_injury =
              excluded.has_injury,

            injury_details =
              excluded.injury_details,

            health_conditions =
              excluded.health_conditions,

            other_health_condition =
              excluded.other_health_condition,

            taking_medication =
              excluded.taking_medication,

            medication_details =
              excluded.medication_details,

            accessibility_requirements =
              excluded.accessibility_requirements,

            medical_care =
              excluded.medical_care,

            additional_info =
              excluded.additional_info,

            updated_at =
              CURRENT_TIMESTAMP
        `);


      statement.run(

        clientId,

        experienceLevel,

        yearsOfPractice ||
          null,

        previousExperience ||
          null,

        hadYogaTherapy ||
          null,

        lastYogaTherapySession ||
          null,

        yogaTherapyFrequency ||
          null,

        JSON.stringify(
          yogaStyles || [],
        ),

        otherYogaStyle ||
          null,

        JSON.stringify(
          goals || [],
        ),

        otherGoals ||
          null,

        JSON.stringify(
          yogaInterests || [],
        ),

        otherYogaInterest ||
          null,

        activityLevel ||
          null,

        stressLevel
          ? Number(stressLevel)
          : null,

        hasInjury,

        injuryDetails ||
          null,

        JSON.stringify(
          healthConditions || [],
        ),

        otherHealthCondition ||
          null,

        takingMedication ||
          null,

        medicationDetails ||
          null,

        accessibilityRequirements ||
          null,

        medicalCare ||
          null,

        additionalInformation ||
          null,

      );


      const savedIntake = db
        .prepare(`
          SELECT *
          FROM client_intakes
          WHERE client_id = ?
        `)
        .get(
          clientId,
        );


      res
        .status(200)
        .json(
          savedIntake,
        );

    } catch (error) {

      console.error(
        "Failed to save intake:",
        error,
      );


      res
        .status(500)
        .json({

          error:
            "Failed to save intake",

        });

    }

  },
);


// ======================================================
// Start server
// ======================================================

app.listen(
  PORT,
  () => {

    console.log(
      `Server running on http://localhost:${PORT}`,
    );

  },
);