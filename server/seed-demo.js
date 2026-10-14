import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database(path.join(__dirname, "strong_steady.db"));


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
  );

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

const today = new Date();
today.setHours(0, 0, 0, 0);

const monday = new Date(today);
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

const dateKey = (offset) => {
  const date = new Date(monday);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const positionFromTime = (time) => {
  const hour = Number(String(time).split(":")[0]);
  if (hour < 10) return "morning";
  if (hour < 12) return "lateMorning";
  if (hour < 14) return "midday";
  if (hour < 16) return "afternoon";
  return "lateAfternoon";
};

const insertActivity = db.prepare(`
  INSERT INTO schedule_activities (
    type, title, client_id, client_name, appointment_type,
    activity_date, start_time, end_time, time_label,
    location, meta, position, capacity, badge,
    prevent_bookings, status
  )
  VALUES (
    @type, @title, @clientId, @clientName, @appointmentType,
    @date, @startTime, @endTime, @time,
    @location, @meta, @position, @capacity, @badge,
    @preventBookings, 'Scheduled'
  )
`);

const findActivity = db.prepare(`
  SELECT id
  FROM schedule_activities
  WHERE type = ?
    AND title = ?
    AND activity_date = ?
    AND start_time = ?
    AND end_time = ?
  LIMIT 1
`);

const ensureActivity = (activity) => {
  const existing = findActivity.get(
    activity.type,
    activity.title,
    activity.date,
    activity.startTime,
    activity.endTime,
  );

  if (existing) return existing.id;

  return Number(insertActivity.run({
    clientId: null,
    clientName: null,
    appointmentType: null,
    location: null,
    meta: null,
    capacity: null,
    badge: "Demo",
    preventBookings: 0,
    position: positionFromTime(activity.startTime),
    ...activity,
  }).lastInsertRowid);
};

let demoClient = null;
try {
  demoClient = db.prepare(`
    SELECT id, first_name, last_name
    FROM clients
    ORDER BY id
    LIMIT 1
  `).get();
} catch {
  // The schedule demo still works if no client table has been initialised yet.
}

const weekKey = dateKey(0);
const seriesId = `demo-strong-start-${weekKey}`;

const seedDemoData = db.transaction(() => {
  ensureActivity({
    type: "class",
    title: "Gentle Yoga",
    date: dateKey(2),
    startTime: "09:00",
    endTime: "10:00",
    time: "9:00–10:00",
    location: "Studio A",
    meta: "Studio A",
  });

  ensureActivity({
    type: "recurring",
    title: "Balance Basics",
    date: dateKey(3),
    startTime: "10:30",
    endTime: "11:30",
    time: "10:30–11:30",
    location: "Studio B",
    meta: "Recurring · Studio B",
  });

  ensureActivity({
    type: "appointment",
    title: "Yoga Therapy Session",
    clientId: demoClient?.id ?? null,
    clientName: demoClient
      ? `${demoClient.first_name} ${demoClient.last_name}`.trim()
      : "Sarah Wilson",
    appointmentType: "Initial consultation",
    date: dateKey(4),
    startTime: "13:30",
    endTime: "14:15",
    time: "1:30–2:15",
    location: "Room 2",
    meta: "Appointment · Room 2",
  });

  ensureActivity({
    type: "blocked",
    title: "Administration Work",
    date: dateKey(5),
    startTime: "14:00",
    endTime: "16:00",
    time: "2:00–4:00",
    meta: "Planning and paperwork",
    preventBookings: 1,
  });

  db.prepare(`
    INSERT OR IGNORE INTO event_series (
      id, name, description, instructor, location,
      capacity, price, image, status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')
  `).run(
    seriesId,
    "Strong Start",
    "A two-session demo series for the presentation.",
    "Jessie Ni",
    "Studio A",
    8,
    0,
    null,
  );

  const sessions = [
    { id: `${seriesId}-1`, offset: 3, startTime: "17:30", endTime: "18:30", progress: "1 of 2" },
    { id: `${seriesId}-2`, offset: 6, startTime: "09:00", endTime: "10:00", progress: "2 of 2" },
  ];

  for (const session of sessions) {
    const date = dateKey(session.offset);
    const activityId = ensureActivity({
      type: "series",
      title: "Strong Start",
      date,
      startTime: session.startTime,
      endTime: session.endTime,
      time: `${session.startTime}–${session.endTime}`,
      location: "Studio A",
      meta: "Event Series · Studio A",
      capacity: session.progress,
    });

    db.prepare(`
      INSERT OR IGNORE INTO event_series_sessions (
        id, series_id, session_date, start_time,
        end_time, status, activity_id
      )
      VALUES (?, ?, ?, ?, ?, 'scheduled', ?)
    `).run(
      session.id,
      seriesId,
      date,
      session.startTime,
      session.endTime,
      activityId,
    );
  }
});

seedDemoData();
db.close();

console.log(`Demo schedule added for ${dateKey(0)} to ${dateKey(6)}.`);
