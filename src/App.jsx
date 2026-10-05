import { useEffect, useMemo, useState } from "react";
import Intake from "./pages/Intake";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Diamond,
  Eye,
  Info,
  Search,
  Settings,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react";
import {
  activities as sampleActivities,
  activityTypes,
  filters,
} from "./data/schedule";
import Clients from "./pages/Clients";
import AddClient from "./pages/AddClient";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const NAV = [
  ["schedule", "Schedule", CalendarDays],
  ["clients", "Clients", UsersRound],
  ["series", "Event Series", SlidersHorizontal],
  ["appointments", "Appointments", Diamond],
  ["settings", "Settings", Settings],
];
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};
const startOfWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};
const toDateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const formatClock = (value) => {
  if (!value) return "";
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hours, minutes));
};
const positionFromTime = (value) => {
  const hour = Number(value.split(":")[0]);
  if (hour < 10) return "morning";
  if (hour < 12) return "lateMorning";
  if (hour < 13) return "midday";
  if (hour < 15) return "afternoon";
  return "lateAfternoon";
};
const formatRange = (start) => {
  const end = addDays(start, 6);
  return start.getMonth() === end.getMonth()
    ? `${MONTHS[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`
    : `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
};
const ACTIVITIES_API = "http://localhost:3001/api/activities";
const CLIENTS_API = "http://localhost:3001/api/clients";
const APPOINTMENT_TYPES = [
  "Private Yoga",
  "Yoga Therapy",
  "Initial Consultation",
  "Follow-up",
];

const readApiResponse = async (response) => {
  if (response.ok) return response.status === 204 ? null : response.json();
  const data = await response.json().catch(() => ({}));
  throw new Error(data.error || "The schedule database request failed.");
};

const clientDisplayName = (client) =>
  `${client.firstName ?? client.first_name ?? ""} ${client.lastName ?? client.last_name ?? ""}`.trim();

const findAppointmentConflict = (activities, candidate, excludeId = null) =>
  activities.find((activity) => {
    if (excludeId !== null && String(activity.id) === String(excludeId)) return false;
    if (activity.date !== candidate.date) return false;
    if (!activity.startTime || !activity.endTime) return false;
    if (activity.type === "blocked" && activity.preventBookings === false) return false;
    return candidate.startTime < activity.endTime && candidate.endTime > activity.startTime;
  });

const conflictMessage = (conflict) =>
  `This appointment conflicts with ${conflict.title} (${formatClock(conflict.startTime)}–${formatClock(conflict.endTime)}). Please choose another time.`;

function Sidebar({ page, go }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <strong>Strong &amp; Steady</strong>
        <span>PRACTITIONER</span>
      </div>
      <nav>
        {NAV.map(([id, label, Icon]) => (
          <button
            key={id}
            className={`nav-item ${page === id ? "active" : ""}`}
            onClick={() => go(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="profile-card">
        <div className="avatar">JN</div>
        <div>
          <strong>Jessie Ni</strong>
          <span>Practitioner</span>
        </div>
      </div>
    </aside>
  );
}
function Header({ title, subtitle, action, onAction }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && (
        <button className="primary-button" onClick={onAction}>
          ＋ {action}
        </button>
      )}
    </header>
  );
}
function Field({ label, children }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function InfoBox({ title, children }) {
  return (
    <div className="info-box">
      <Info size={18} />
      <span>
        <strong>{title}</strong>
        <p>{children}</p>
      </span>
    </div>
  );
}
function Page({ title, subtitle, action, onAction, children }) {
  return (
    <main>
      <Header
        title={title}
        subtitle={subtitle}
        action={action}
        onAction={onAction}
      />
      {children}
    </main>
  );
}

function ActivityCard({ a, onClick, onDragStart, onDragEnd }) { return <button className={`activity-card ${a.type} ${a.position}`} onClick={onClick} draggable onDragStart={event => onDragStart(event, a)} onDragEnd={onDragEnd}><strong>{a.title}</strong><span>{a.time}</span><small>{a.meta}</small>{a.capacity && <em>{a.capacity}</em>}{a.badge && <em>{a.badge}</em>}</button> }
function CreateMenu({ close, go }) { const rows = [['Single class', 'Add a one-time class', () => go('create-class')], ['Event series', 'Add a fixed series of sessions', () => go('create-series')], ['Appointment', 'Book a private client session', () => go('create-appointment')], ['Block time', 'Prevent client bookings', () => go('block-time')]]; return <div className="modal-backdrop" onMouseDown={close}><section className="activity-modal" onMouseDown={e => e.stopPropagation()}><div className="modal-heading"><div><h2>Create activity</h2><p>Choose what you want to add.</p></div><button className="icon-button" onClick={close}><X size={18} /></button></div><div className="activity-options">{rows.map(([t, d, fn]) => <button key={t} onClick={fn}><span><strong>{t}</strong><small>{d}</small></span><ChevronRight size={17} /></button>)}</div></section></div> }
function ActivityDetails({
  activity,
  close,
  onSave,
  onCancel,
  clients = [],
  activities = [],
}) {
  const isAppointment = activity.type === "appointment";
  const legacyLocation = activity.location ||
    (isAppointment && activity.meta ? activity.meta.split("·").at(-1)?.trim() : activity.meta || "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => ({
    title: activity.title,
    date: activity.date,
    time: activity.time,
    meta: activity.meta || "",
    clientId: activity.clientId ? String(activity.clientId) : "",
    clientName: activity.clientName || "",
    appointmentType: activity.appointmentType || APPOINTMENT_TYPES[0],
    startTime: activity.startTime || "09:00",
    endTime: activity.endTime || "10:00",
    location: legacyLocation || "",
  }));
  const [error, setError] = useState("");
  const date = new Date(`${activity.date}T00:00:00`);
  const formattedDate = new Intl.DateTimeFormat("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const typeLabel = activityTypes[activity.type]?.label || "Activity";

  const update = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const save = async (event) => {
    event.preventDefault();

    if (isAppointment) {
      if (!draft.clientId) {
        setError("Client is required.");
        return;
      }
      if (!draft.appointmentType) {
        setError("Appointment type is required.");
        return;
      }
      if (!draft.title.trim()) {
        setError("Title is required.");
        return;
      }
      if (!draft.date) {
        setError("Date is required.");
        return;
      }
      if (!draft.startTime || !draft.endTime || draft.endTime <= draft.startTime) {
        setError("End time must be later than start time.");
        return;
      }

      const selectedClient = clients.find(
        (client) => String(client.id) === String(draft.clientId),
      );
      const clientName = selectedClient
        ? clientDisplayName(selectedClient)
        : draft.clientName;
      const candidate = {
        ...activity,
        title: draft.title.trim(),
        date: draft.date,
        clientId: draft.clientId,
        clientName,
        appointmentType: draft.appointmentType,
        startTime: draft.startTime,
        endTime: draft.endTime,
        time: `${formatClock(draft.startTime)}–${formatClock(draft.endTime)}`,
        location: draft.location.trim(),
        meta: `${clientName} · ${draft.appointmentType}${draft.location.trim() ? ` · ${draft.location.trim()}` : ""}`,
        position: positionFromTime(draft.startTime),
        status: activity.status || "Scheduled",
      };

      const conflict = findAppointmentConflict(activities, candidate, activity.id);
      if (conflict) {
        setError(conflictMessage(conflict));
        return;
      }

      const result = await onSave(candidate);
      if (result?.ok === false) {
        setError(result.message || "Appointment could not be updated.");
        return;
      }
      close();
      return;
    }

    if (!draft.title.trim() || !draft.date || !draft.time.trim()) {
      setError("Title, date and time are required.");
      return;
    }
    const result = await onSave({
      ...activity,
      title: draft.title.trim(),
      date: draft.date,
      time: draft.time.trim(),
      meta: draft.meta.trim(),
    });
    if (result?.ok === false) {
      setError(result.message || "Activity could not be updated.");
      return;
    }
    close();
  };

  return (
    <div className="drawer-backdrop" onMouseDown={close}>
      <aside className="details-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-title">
          <h2>{editing ? "Edit activity" : "Activity details"}</h2>
          <button onClick={close} aria-label="Close"><X /></button>
        </div>

        {editing ? (
          <form className="activity-edit-form" onSubmit={save} noValidate>
            {isAppointment ? (
              <>
                <Field label="Client *">
                  <select
                    value={draft.clientId}
                    onChange={(event) => {
                      const client = clients.find(
                        (item) => String(item.id) === event.target.value,
                      );
                      setDraft((current) => ({
                        ...current,
                        clientId: event.target.value,
                        clientName: client ? clientDisplayName(client) : "",
                      }));
                      setError("");
                    }}
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {clientDisplayName(client)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Appointment type *">
                  <select
                    value={draft.appointmentType}
                    onChange={(event) => update("appointmentType", event.target.value)}
                  >
                    {APPOINTMENT_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </Field>
                <Field label="Title *">
                  <input value={draft.title} onChange={(event) => update("title", event.target.value)} />
                </Field>
                <Field label="Date *">
                  <input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} />
                </Field>
                <div className="two-cols">
                  <Field label="Start time *">
                    <input type="time" value={draft.startTime} onChange={(event) => update("startTime", event.target.value)} />
                  </Field>
                  <Field label="End time *">
                    <input type="time" value={draft.endTime} onChange={(event) => update("endTime", event.target.value)} />
                  </Field>
                </div>
                <Field label="Location">
                  <input value={draft.location} onChange={(event) => update("location", event.target.value)} />
                </Field>
              </>
            ) : (
              <>
                <Field label="Title *">
                  <input value={draft.title} onChange={(event) => update("title", event.target.value)} />
                </Field>
                <Field label="Date *">
                  <input type="date" value={draft.date} onChange={(event) => update("date", event.target.value)} />
                </Field>
                <Field label="Time *">
                  <input value={draft.time} onChange={(event) => update("time", event.target.value)} placeholder="e.g. 9:00–10:00" />
                </Field>
                <Field label="Location / details">
                  <input value={draft.meta} onChange={(event) => update("meta", event.target.value)} />
                </Field>
              </>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="blocked-actions">
              <button type="button" className="secondary-button" onClick={() => setEditing(false)}>Back</button>
              <button type="submit" className="primary-button">Save changes</button>
            </div>
          </form>
        ) : (
          <>
            <span className={`activity-detail-badge ${activity.type}`}>{typeLabel.toUpperCase()}</span>
            <h3>{activity.title}</h3>
            <p>{activity.meta || "No additional details."}</p>
            {activity.type === "series" && (
              <div className="progress-card">
                <small>SERIES PROGRESS</small>
                <strong>Session {activity.capacity || "3 of 6"}</strong>
                <div className="progress"><i style={{ width: "50%" }} /></div>
              </div>
            )}
            <h4>Activity information</h4>
            <dl className="detail-list">
              {isAppointment && <><dt>Client</dt><dd>{activity.clientName || "Not linked"}</dd></>}
              {isAppointment && <><dt>Appointment type</dt><dd>{activity.appointmentType || "Private appointment"}</dd></>}
              <dt>Date</dt><dd>{formattedDate}</dd>
              <dt>Time</dt><dd>{activity.time}</dd>
              <dt>Type</dt><dd>{typeLabel}</dd>
              {isAppointment && <><dt>Status</dt><dd>{activity.status || "Scheduled"}</dd></>}
              <dt>Location / details</dt><dd>{isAppointment ? (activity.location || legacyLocation || "—") : (activity.meta || "—")}</dd>
              {activity.capacity && <><dt>Progress</dt><dd>{activity.capacity}</dd></>}
            </dl>
            <div className="blocked-actions">
              <button className="secondary-button" onClick={() => setEditing(true)}>Edit activity</button>
              <button className="danger-button" onClick={() => onCancel(activity.id)}>Cancel activity</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
function BlockedDetails({ activity, close, onEdit, onCancel }) { const date = new Date(`${activity.date}T00:00:00`); const formattedDate = new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date); return <div className="drawer-backdrop" onMouseDown={close}><aside className="details-drawer blocked-drawer" onMouseDown={e => e.stopPropagation()}><div className="drawer-title"><h2>Blocked time details</h2><button onClick={close} aria-label="Close"><X /></button></div><span className="blocked-badge">BLOCKED TIME</span><h3>{activity.title}</h3><p>{activity.reason || activity.meta || 'No reason provided.'}</p><h4>Time information</h4><dl className="detail-list"><dt>Date</dt><dd>{formattedDate}</dd><dt>Time</dt><dd>{activity.time}</dd><dt>Time type</dt><dd>{activity.timeType || 'Unavailable'}</dd><dt>Repeat</dt><dd>{activity.repeat || 'Does not repeat'}</dd><dt>Client bookings</dt><dd>{activity.preventBookings === false ? 'Allowed' : 'Prevented'}</dd></dl><div className="blocked-actions"><button className="secondary-button" onClick={() => onEdit(activity)}>Edit blocked time</button><button className="danger-button" onClick={() => onCancel(activity.id)}>Cancel blocked time</button></div></aside></div> }

function Schedule({
  go,
  activities,
  clients,
  notice,
  clearNotice,
  onEditBlocked,
  onCancelBlocked,
  onUpdateActivity,
  onCancelActivity,
  onMoveActivity,
}) {
  const [filter, setFilter] = useState("All");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [menu, setMenu] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedBlocked, setSelectedBlocked] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dropDate, setDropDate] = useState(null);

  const todayKey = toDateKey(new Date());
  const startKey = toDateKey(weekStart);
  const endKey = toDateKey(addDays(weekStart, 6));
  const visible = useMemo(
    () =>
      activities.filter(
        (activity) =>
          activity.date >= startKey &&
          activity.date <= endKey &&
          (filter === "All" || activityTypes[activity.type].filter === filter),
      ),
    [activities, endKey, filter, startKey],
  );

  const openActivity = (activity) =>
    activity.type === "blocked"
      ? setSelectedBlocked(activity)
      : setSelectedActivity(activity);

  const startDrag = (event, activity) => {
    setDraggingId(activity.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(activity.id));
  };

  const finishDrag = () => {
    setDraggingId(null);
    setDropDate(null);
  };

  const dropActivity = async (event, dateKey) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain");
    await onMoveActivity(id, dateKey);
    finishDrag();
  };

  return (
    <Page
      title="Schedule"
      subtitle="Manage classes, appointments and your availability."
      action="Create activity"
      onAction={() => setMenu(true)}
    >
      {notice && (
        <div className="success-toast">
          ✓ <span>{notice}</span><button onClick={clearNotice}>×</button>
        </div>
      )}

      <section className="schedule-toolbar">
        <h2>{formatRange(weekStart)}</h2>
        <div className="week-controls">
          <button className="icon-button" aria-label="Previous week" onClick={() => setWeekStart((value) => addDays(value, -7))}><ChevronLeft size={18} /></button>
          <button className="today-button" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</button>
          <button className="icon-button" aria-label="Next week" onClick={() => setWeekStart((value) => addDays(value, 7))}><ChevronRight size={18} /></button>
        </div>
      </section>

      <section className="filter-and-legend">
        <div className="filters">
          {filters.map((item) => (
            <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>
          ))}
        </div>
        <div className="legend">
          {Object.entries(activityTypes).map(([key, value]) => (
            <span key={key} className={key}><i />{value.label}</span>
          ))}
        </div>
      </section>

      <section className={`calendar ${draggingId !== null ? "is-dragging" : ""}`}>
        {DAYS.map((label, index) => {
          const date = addDays(weekStart, index);
          const dateKey = toDateKey(date);
          const list = visible.filter((activity) => activity.date === dateKey);
          return (
            <article
              className={`day-column ${dropDate === dateKey ? "drop-target" : ""}`}
              key={dateKey}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropDate(dateKey);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDropDate(null);
              }}
              onDrop={(event) => dropActivity(event, dateKey)}
            >
              <header>
                <span>{label}</span>
                <strong className={dateKey === todayKey ? "today-date" : ""}>{date.getDate()}</strong>
              </header>
              <div className="day-content">
                {list.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    a={activity}
                    onClick={() => openActivity(activity)}
                    onDragStart={startDrag}
                    onDragEnd={finishDrag}
                  />
                ))}
              </div>
            </article>
          );
        })}
        {visible.length === 0 && (
          <div className="empty-state">
            <CalendarDays />
            <strong>No activities this week</strong>
            <span>Use Create activity to add something to this schedule.</span>
          </div>
        )}
        <p className="calendar-tip">Tip: Select an activity for details, or drag it to another day.</p>
      </section>

      {menu && <CreateMenu close={() => setMenu(false)} go={(next) => { setMenu(false); go(next); }} />}
      {selectedActivity && (
        <ActivityDetails
          activity={selectedActivity}
          clients={clients}
          activities={activities}
          close={() => setSelectedActivity(null)}
          onSave={onUpdateActivity}
          onCancel={(id) => {
            if (window.confirm("Cancel this activity?")) {
              setSelectedActivity(null);
              onCancelActivity(id);
            }
          }}
        />
      )}
      {selectedBlocked && (
        <BlockedDetails
          activity={selectedBlocked}
          close={() => setSelectedBlocked(null)}
          onEdit={(activity) => {
            setSelectedBlocked(null);
            onEditBlocked(activity);
          }}
          onCancel={(id) => {
            if (window.confirm("Cancel this blocked time?")) {
              setSelectedBlocked(null);
              onCancelBlocked(id);
            }
          }}
        />
      )}
    </Page>
  );
}
function Series({go,eventSeries,onSelectSeries}){const sampleCards=[['Strong Start','3 of 6 sessions','9 participants',50,'purple'],['Balance & Mobility','1 of 4 sessions','12 participants',25,'blue'],['Healthy Back Program','Draft','Starts 5 October',0,'green']];return <Page title="Event Series" subtitle="Create and track multi-session programs." action="New event series" onAction={()=>go('create-series')}><div className="series-grid">{eventSeries.map(series=>{const dated=series.sessions.filter(session=>session.date);const progress=series.status==='draft'?'Draft':`${dated.length} session${dated.length===1?'':'s'}`;return <article className="series-card green" key={series.id}><small>EVENT SERIES</small><h2>{series.name}</h2><strong>{progress}</strong><div className="progress"><i style={{width:series.status==='draft'?'0%':'100%'}}/></div><p>{series.location} · Capacity {series.capacity||'—'}</p><button onClick={()=>{onSelectSeries(series.id);go('series-details')}}>View details</button></article>})}{eventSeries.length===0&&sampleCards.map(([n,status,meta,p,t])=><article className={`series-card ${t}`} key={n}><small>EVENT SERIES</small><h2>{n}</h2><strong>{status}</strong><div className="progress"><i style={{width:`${p}%`}}/></div><p>{meta}</p><button onClick={()=>go('schedule')}>View schedule</button></article>)}</div><h2 className="section-title">Upcoming sessions</h2><section className="panel upcoming-list">{eventSeries.flatMap(series=>series.sessions.filter(session=>session.date&&session.status!=='cancelled').map(session=><div className="upcoming-row" key={session.id}><strong>{session.date}</strong><span><b>{series.name}</b><small>{formatClock(session.startTime)}–{formatClock(session.endTime)} · {series.location}</small></span></div>))}{eventSeries.length===0&&<div className="appointment-empty">Create an event series to see its sessions here.</div>}</section></Page>}

function SeriesDetails({go,series,onAddSession,onEditSession,onCancelSession,onRemoveSession}){if(!series)return <Page title="Event Series" subtitle="Series not found."><button className="secondary-button" onClick={()=>go('series')}>Back to Event Series</button></Page>;const [editing,setEditing]=useState(null);const [adding,setAdding]=useState(false);const [draft,setDraft]=useState({date:'',startTime:'09:00',endTime:'10:00'});const [scope,setScope]=useState('one');const [error,setError]=useState('');const openEdit=session=>{setEditing(session);setDraft({date:session.date,startTime:session.startTime,endTime:session.endTime});setScope('one');setError('')};const validate=()=>{if(!draft.date||!draft.startTime||!draft.endTime){setError('Date, start time and end time are required.');return false}if(draft.endTime<=draft.startTime){setError('End time must be later than start time.');return false}return true};const saveEdit=()=>{if(!validate())return;onEditSession(series.id,editing.id,draft,scope);setEditing(null)};const add=()=>{if(!validate())return;onAddSession(series.id,draft);setAdding(false);setDraft({date:'',startTime:'09:00',endTime:'10:00'})};return <main className="form-page"><button className="back-link" onClick={()=>go('series')}>‹ Event Series</button><Header title={series.name} subtitle={series.description||'Event series details and sessions.'}/><section className="form-card wide-form"><div className="series-detail-summary"><div><small>STATUS</small><strong>{series.status==='draft'?'Draft':'Published'}</strong></div><div><small>LOCATION</small><strong>{series.location}</strong></div><div><small>CAPACITY</small><strong>{series.capacity||'—'}</strong></div><div><small>PRICE</small><strong>{series.price? `$${series.price}`:'Free / not set'}</strong></div></div><h2>Sessions</h2>{series.sessions.filter(session=>session.date).length===0&&<div className="series-empty">No dates have been confirmed yet. Add a session when the schedule is ready.</div>}<div className="series-session-list">{series.sessions.filter(session=>session.date).map((session,index)=><article className={`series-session-item ${session.status==='cancelled'?'cancelled':''}`} key={session.id}><div><small>SESSION {index+1}</small><strong>{session.date}</strong><span>{formatClock(session.startTime)}–{formatClock(session.endTime)} · {series.location}</span>{session.status==='cancelled'&&<em>Cancelled</em>}</div><div className="session-actions"><button className="secondary-button" onClick={()=>openEdit(session)}>Edit</button>{session.status!=='cancelled'&&<button className="secondary-button" onClick={()=>{if(window.confirm('Cancel this session? It will remain in the series as cancelled.'))onCancelSession(series.id,session.id)}}>Cancel</button>}<button className="danger-button" onClick={()=>{if(window.confirm('Remove this session permanently? This cannot be undone.'))onRemoveSession(series.id,session.id)}}>Remove</button></div></article>)}</div><button className="add-outline" onClick={()=>{setAdding(true);setDraft({date:'',startTime:'09:00',endTime:'10:00'});setError('')}}>＋ Add Session</button></section>{(editing||adding)&&<div className="modal-backdrop" onMouseDown={()=>{setEditing(null);setAdding(false)}}><section className="activity-modal session-modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-heading"><div><h2>{adding?'Add Session':'Edit Session'}</h2><p>{adding?'Add another dated session to this series.':'Choose whether this change affects one session or the whole series.'}</p></div><button className="icon-button" onClick={()=>{setEditing(null);setAdding(false)}}><X size={18}/></button></div>{editing&&<Field label="Apply changes to"><div className="scope-options"><label><input type="radio" name="scope" checked={scope==='one'} onChange={()=>setScope('one')}/> This session only</label><label><input type="radio" name="scope" checked={scope==='series'} onChange={()=>setScope('series')}/> Whole series</label></div></Field>}<Field label="Date *"><input type="date" value={draft.date} onChange={e=>{setDraft(current=>({...current,date:e.target.value}));setError('')}}/></Field><div className="two-cols"><Field label="Start time *"><input type="time" value={draft.startTime} onChange={e=>{setDraft(current=>({...current,startTime:e.target.value}));setError('')}}/></Field><Field label="End time *"><input type="time" value={draft.endTime} onChange={e=>{setDraft(current=>({...current,endTime:e.target.value}));setError('')}}/></Field></div>{editing&&scope==='series'&&<InfoBox title="Whole series edit">The time change will apply to every active session. The selected date remains specific to this session.</InfoBox>}{error&&<p className="form-error">{error}</p>}<div className="form-actions"><button className="secondary-button" onClick={()=>{setEditing(null);setAdding(false)}}>Cancel</button><button className="primary-button" onClick={adding?add:saveEdit}>Save Changes</button></div></section></div>}</main>}
function Appointments({
  activities,
  clients,
  go,
  onUpdateActivity,
  onCancelActivity,
}) {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const todayKey = toDateKey(new Date());
  const appointments = activities
    .filter((activity) => activity.type === "appointment")
    .sort((a, b) =>
      `${a.date}${a.startTime || a.time}`.localeCompare(
        `${b.date}${b.startTime || b.time}`,
      ),
    );
  const todayCount = appointments.filter(
    (activity) => activity.date === todayKey,
  ).length;
  const dateLabel = (activity) => {
    const date = new Date(`${activity.date}T00:00:00`);
    const day =
      activity.date === todayKey
        ? "TODAY"
        : new Intl.DateTimeFormat("en-AU", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })
            .format(date)
            .toUpperCase();
    return `${day} · ${formatClock(activity.startTime) || activity.time.split("–")[0].trim()}`;
  };

  return (
    <Page
      title="Appointments"
      subtitle="Manage private sessions and client bookings."
      action="New appointment"
      onAction={() => go("create-appointment")}
    >
      <section className="appointments-layout">
        <div>
          <h2 className="section-title">Upcoming appointments</h2>
          <div className="panel appointment-list">
            {appointments.map((activity) => (
              <button
                type="button"
                className="appointment-row"
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
              >
                <strong>{dateLabel(activity)}</strong>
                <span>
                  <b>{activity.title}</b>
                  <small>{activity.meta || "Private appointment"}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
            {appointments.length === 0 && (
              <p className="helper appointment-empty">No appointments have been created yet.</p>
            )}
          </div>
        </div>
        <aside className="today-summary">
          <small>TODAY</small>
          <strong>{todayCount}</strong>
          <span>{todayCount === 1 ? "private appointment" : "private appointments"}</span>
          <p>No booking conflicts</p>
        </aside>
      </section>

      {selectedActivity && (
        <ActivityDetails
          activity={selectedActivity}
          clients={clients}
          activities={activities}
          close={() => setSelectedActivity(null)}
          onSave={onUpdateActivity}
          onCancel={(id) => {
            if (window.confirm("Cancel this appointment?")) {
              setSelectedActivity(null);
              onCancelActivity(id);
            }
          }}
        />
      )}
    </Page>
  );
}
function SettingsPage() {
  return (
    <Page
      title="Settings"
      subtitle="Manage your practice and booking preferences."
    >
      <section className="panel settings-list">
        {[
          ["Practice details", "Business name, locations and contact details"],
          ["Booking settings", "Availability, cancellation and booking rules"],
          ["Notifications", "Email reminders and schedule updates"],
          ["Team access", "Practitioner accounts and permissions"],
        ].map((r) => (
          <button key={r[0]}>
            <span>
              <strong>{r[0]}</strong>
              <small>{r[1]}</small>
            </span>
            <ChevronRight />
          </button>
        ))}
      </section>
    </Page>
  );
}

function CreateScheduledActivity({
  go,
  onSubmit,
  type,
  clients = [],
  activities = [],
}) {
  const isAppointment = type === "appointment";
  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    appointmentType: APPOINTMENT_TYPES[0],
    title: "",
    date: toDateKey(new Date()),
    startTime: "09:00",
    endTime: "10:00",
    location: "",
  });
  const [error, setError] = useState("");

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();

    if (isAppointment && !form.clientId) {
      setError("Client is required.");
      return;
    }
    if (isAppointment && !form.appointmentType) {
      setError("Appointment type is required.");
      return;
    }
    if (!form.title.trim()) {
      setError(`${isAppointment ? "Title" : "Class title"} is required.`);
      return;
    }
    if (!form.date) {
      setError("Date is required.");
      return;
    }
    if (!form.startTime || !form.endTime || form.endTime <= form.startTime) {
      setError("End time must be later than start time.");
      return;
    }

    const payload = {
      ...form,
      type,
      title: form.title.trim(),
      location: form.location.trim(),
    };

    if (isAppointment) {
      const conflict = findAppointmentConflict(activities, payload);
      if (conflict) {
        setError(conflictMessage(conflict));
        return;
      }
    }

    const result = await onSubmit(payload);
    if (result?.ok === false) {
      setError(result.message || "Appointment could not be saved to the database.");
      return;
    }
    go("schedule");
  };

  return (
    <main className="form-page">
      <button className="back-link" onClick={() => go("schedule")}>‹ Schedule</button>
      <Header
        title={isAppointment ? "Create appointment" : "Create single class"}
        subtitle={isAppointment ? "Book a private session for a client." : "Add a one-time class to the weekly schedule."}
      />
      <form className="form-card compact-form" onSubmit={submit} noValidate>
        {isAppointment ? (
          <>
            <Field label="Client *">
              <select
                value={form.clientId}
                onChange={(event) => {
                  const selectedClient = clients.find(
                    (client) => String(client.id) === event.target.value,
                  );
                  setForm((current) => ({
                    ...current,
                    clientId: event.target.value,
                    clientName: selectedClient ? clientDisplayName(selectedClient) : "",
                  }));
                  setError("");
                }}
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{clientDisplayName(client)}</option>
                ))}
              </select>
            </Field>
            <Field label="Appointment type *">
              <select value={form.appointmentType} onChange={(event) => update("appointmentType", event.target.value)}>
                {APPOINTMENT_TYPES.map((appointmentType) => (
                  <option key={appointmentType}>{appointmentType}</option>
                ))}
              </select>
            </Field>
            <Field label="Title *">
              <input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Initial consultation" />
            </Field>
          </>
        ) : (
          <Field label="Class title *">
            <input value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="Enter class title" />
          </Field>
        )}

        <Field label="Date *">
          <input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} />
        </Field>
        <div className="two-cols">
          <Field label="Start time *">
            <input type="time" value={form.startTime} onChange={(event) => update("startTime", event.target.value)} />
          </Field>
          <Field label="End time *">
            <input type="time" value={form.endTime} onChange={(event) => update("endTime", event.target.value)} />
          </Field>
        </div>
        <Field label="Location">
          <input value={form.location} onChange={(event) => update("location", event.target.value)} placeholder={isAppointment ? "e.g. Room 2 or Zoom" : "e.g. Studio A"} />
        </Field>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={() => go("schedule")}>Cancel</button>
          <button type="submit" className="primary-button">{isAppointment ? "Create appointment" : "Create class"}</button>
        </div>
      </form>
    </main>
  );
}

function BlockTime({ go, onSubmit, initial }) { const [form, setForm] = useState(() => initial ? { timeType: initial.timeType || 'Personal appointment', title: initial.title, date: initial.date, endDate: initial.date, startTime: initial.startTime || '14:00', endTime: initial.endTime || '16:00', repeat: initial.repeat || 'Does not repeat', reason: initial.reason || '', preventBookings: initial.preventBookings !== false } : { timeType: 'Personal appointment', title: '', date: toDateKey(new Date()), endDate: toDateKey(new Date()), startTime: '14:00', endTime: '16:00', repeat: 'Does not repeat', reason: '', preventBookings: true }); const [error, setError] = useState(''); const update = (field, value) => { setForm(current => ({ ...current, [field]: value, ...(field === 'date' && current.endDate < value ? { endDate: value } : {}) })); if ((field === 'title' && value.trim()) || field === 'date' || field === 'endDate' || field === 'startTime' || field === 'endTime') setError('') }; const submit = event => { event.preventDefault(); if (!form.title.trim()) { setError('Title is required. Please enter a title.'); return } if (!form.date || !form.endDate) { setError('Start date and end date are required.'); return } if (form.endDate < form.date) { setError('End date must be the same as or later than start date.'); return } if (!form.startTime || !form.endTime || form.endTime <= form.startTime) { setError('End time must be later than start time.'); return } onSubmit({ ...form, id: initial?.id, title: form.title.trim() }); go('schedule') }; return <main className="form-page"><button className="back-link" onClick={() => go('schedule')}>‹ Schedule</button><Header title={initial ? 'Edit blocked time' : 'Block personal or work time'} subtitle={initial ? 'Update this unavailable period.' : 'Add unavailable time to prevent clients from booking you.'} /><form className="form-card compact-form" onSubmit={submit} noValidate><Field label="Time type"><select value={form.timeType} onChange={e => update('timeType', e.target.value)}><option>Personal appointment</option><option>Administration work</option></select></Field><Field label="Title *"><input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Enter a title" aria-required="true" /></Field><div className="two-cols"><Field label="Start date"><input type="date" value={form.date} onChange={e => update('date', e.target.value)} required /></Field><Field label="End date"><input type="date" value={form.endDate} min={form.date} onChange={e => update('endDate', e.target.value)} required /></Field></div><div className="two-cols"><Field label="Start time"><input type="time" value={form.startTime} onChange={e => update('startTime', e.target.value)} required /></Field><Field label="End time"><input type="time" value={form.endTime} onChange={e => update('endTime', e.target.value)} required /></Field></div><Field label="Repeat"><select value={form.repeat} onChange={e => update('repeat', e.target.value)}><option>Does not repeat</option><option>Weekly</option></select></Field><Field label="Reason"><textarea value={form.reason} onChange={e => update('reason', e.target.value)} placeholder="e.g. Personal appointment or administration work" /></Field><label className="check-line"><input type="checkbox" checked={form.preventBookings} onChange={e => update('preventBookings', e.target.checked)} /> Prevent client bookings during this time</label>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={() => go('schedule')}>Cancel</button><button type="submit" className="primary-button">{initial ? 'Save changes' : 'Block time'}</button></div></form></main> }
function CreateSeries({go,onSubmit}){const emptySession=()=>({id:`session-${Date.now()}-${Math.random().toString(36).slice(2)}`,date:'',startTime:'09:00',endTime:'10:00'});const [form,setForm]=useState({name:'',description:'',instructor:'Claire',location:'Studio A',capacity:'12',price:'',image:null,sessions:[emptySession()]});const [error,setError]=useState('');const update=(field,value)=>{setForm(current=>({...current,[field]:value}));setError('')};const updateSession=(id,field,value)=>{setForm(current=>({...current,sessions:current.sessions.map(session=>session.id===id?{...session,[field]:value}:session)}));setError('')};const addSession=()=>setForm(current=>({...current,sessions:[...current.sessions,emptySession()]}));const removeSession=id=>setForm(current=>({...current,sessions:current.sessions.filter(session=>session.id!==id)}));const save=(status)=>{if(!form.name.trim()){setError('Series name is required.');return}const completed=form.sessions.filter(session=>session.date);if(status==='published'&&!completed.length){setError('Add at least one session date before creating the event series. You can save it as a draft instead.');return}if(completed.some(session=>!session.startTime||!session.endTime||session.endTime<=session.startTime)){setError('Each dated session must have an end time later than its start time.');return}onSubmit({...form,name:form.name.trim(),description:form.description.trim(),capacity:Number(form.capacity)||0,price:Number(form.price)||0,status,sessions:form.sessions.filter(session=>session.date||status==='draft')});go('series')};return <main className="form-page"><button className="back-link" onClick={()=>go('series')}>‹ Event Series</button><Header title="Create Event Series" subtitle="Create a multi-session program and manage all sessions in one place."/><section className="form-card wide-form"><h2>Basic information</h2><Field label="Series name *"><input value={form.name} onChange={e=>update('name',e.target.value)} placeholder="e.g. Strong Start"/></Field><Field label="Description"><textarea value={form.description} onChange={e=>update('description',e.target.value)} placeholder="Describe this event series"/></Field><Field label="Optional image"><input type="file" accept="image/*" onChange={e=>update('image',e.target.files?.[0]?.name||null)}/></Field><div className="two-cols"><Field label="Instructor"><select value={form.instructor} onChange={e=>update('instructor',e.target.value)}><option>Claire</option><option>Jessie Ni</option></select></Field><Field label="Location"><select value={form.location} onChange={e=>update('location',e.target.value)}><option>Studio A</option><option>Studio B</option><option>Online</option></select></Field></div><div className="two-cols"><Field label="Capacity"><input type="number" min="1" value={form.capacity} onChange={e=>update('capacity',e.target.value)}/></Field><Field label="Program price ($)"><input type="number" min="0" step="0.01" value={form.price} onChange={e=>update('price',e.target.value)} placeholder="e.g. 120"/></Field></div><h2>Sessions</h2><p className="helper session-helper">Add dates now, or save the series as a draft and add them later.</p><div className="session-list">{form.sessions.map((session,index)=><div className="session-editor" key={session.id}><div className="session-editor-heading"><small>SESSION {index+1}</small>{form.sessions.length>1&&<button type="button" className="session-remove" onClick={()=>removeSession(session.id)}>Remove</button>}</div><div className="three-cols"><Field label="Date"><input type="date" value={session.date} onChange={e=>updateSession(session.id,'date',e.target.value)}/></Field><Field label="Start time"><input type="time" value={session.startTime} onChange={e=>updateSession(session.id,'startTime',e.target.value)}/></Field><Field label="End time"><input type="time" value={session.endTime} onChange={e=>updateSession(session.id,'endTime',e.target.value)}/></Field></div></div>)}</div><button type="button" className="add-outline" onClick={addSession}>＋ Add another session</button>{error&&<p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={()=>go('series')}>Cancel</button><button type="button" className="secondary-button" onClick={()=>save('draft')}>Save as Draft</button><button type="button" className="primary-button" onClick={()=>save('published')}>Create Event Series</button></div></section></main>}

const STEPS = [
  "Client details",
  "Intake form",
  "Eligibility review",
  "Complete registration",
];
function Progress({ step }) {
  return (
    <aside className="progress-panel">
      <h3>Registration progress</h3>
      {STEPS.map((n, i) => (
        <div className={`progress-step ${i + 1 <= step ? "done" : ""}`} key={n}>
          <i>{i + 1 < step ? "✓" : i + 1}</i>
          <span>
            <strong>{n}</strong>
            <small>
              {
                [
                  "Basic information",
                  "Health and experience information",
                  "Practitioner checks",
                  "Add to class and client record",
                ][i]
              }
            </small>
          </span>
        </div>
      ))}
    </aside>
  );
}
function Reg({ title, subtitle, step, children, back, next, nextLabel }) {
  return (
    <main className="registration-page">
      <button className="back-link" onClick={back}>
        ‹ Back to Add New Client
      </button>
      <Header title={title} subtitle={subtitle} />
      <div className="registration-grid">
        <section className="form-card">{children}</section>
        <Progress step={step} />
      </div>
      <div className="registration-actions">
        <button className="secondary-button" onClick={back}>
          ← Back
        </button>
        <button className="primary-button" onClick={next}>
          {nextLabel} →
        </button>
      </div>
    </main>
  );
}

function Eligibility({ go }) {
  return (
    <Reg
      title="Eligibility Review"
      subtitle="Review the client's intake information and confirm suitability before registration."
      step={3}
      back={() => go("intake")}
      next={() => go("complete")}
      nextLabel="Confirm & Continue"
    >
      <h2>Client summary</h2>
      <Summary />
      <h2>Eligibility checks</h2>
      <p>
        Confirm that all required information has been provided and reviewed.
      </p>
      {[
        "Intake form completed",
        "Required information reviewed",
        "Waiver signed (if applicable)",
        "Practitioner confirms suitability",
      ].map((x) => (
        <label className="check-line" key={x}>
          <input type="checkbox" defaultChecked /> {x}
        </label>
      ))}
      <Field label="Suitability assessment *">
        <select>
          <option>Suitable</option>
          <option>Needs review</option>
          <option>Not suitable</option>
        </select>
      </Field>
      <Field label="Practitioner notes (optional)">
        <textarea />
      </Field>
      <InfoBox title="Note">
        Please review all information carefully to ensure the client's safety
        and suitability for classes.
      </InfoBox>
    </Reg>
  );
}
function Summary() {
  return (
    <dl className="summary-list">
      <dt>Full name</dt>
      <dd>Mia Chen</dd>
      <dt>Email address</dt>
      <dd>mia.chen@email.com</dd>
      <dt>Phone number</dt>
      <dd>0412 345 678</dd>
      <dt>Date of birth</dt>
      <dd>15 March 1998</dd>
      <dt>Experience level</dt>
      <dd>Beginner</dd>
    </dl>
  );
}
function Complete({ go, onComplete }) {
  return (
    <Reg
      title="Complete Registration"
      subtitle="Review the client record and complete the registration."
      step={4}
      back={() => go("eligibility")}
      next={onComplete}
      nextLabel="Complete Registration"
    >
      <h2>Registration summary</h2>
      <div className="summary-badges">
        <span>
          <small>CLIENT</small>
          <b>Mia Chen</b>
          <em>mia.chen@email.com</em>
        </span>
        <span>
          <small>INTAKE FORM</small>
          <b>✓ Complete</b>
        </span>
        <span>
          <small>ELIGIBILITY</small>
          <b>✓ Suitable</b>
        </span>
        <span>
          <small>WAIVER</small>
          <b>✓ Signed</b>
        </span>
      </div>
      <h2>Client record</h2>
      <Summary />
      <dl className="summary-list">
        <dt>Goals / reasons</dt>
        <dd>Flexibility, relaxation and strength</dd>
        <dt>Injuries / limitations</dt>
        <dd>None reported</dd>
        <dt>Accessibility requirements</dt>
        <dd>None reported</dd>
      </dl>
      <InfoBox title="Ready to register">
        All required client information has been completed and reviewed.
      </InfoBox>
    </Reg>
  );
}
function ClientProfile({ go, client }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(client?.id));
  const [error, setError] = useState("");
  const [showIntake, setShowIntake] = useState(false);

  useEffect(() => {
    if (!client?.id) return;
    setLoading(true);
    setError("");
    fetch(`${CLIENTS_API}/${client.id}`)
      .then(readApiResponse)
      .then((data) => setProfile(data))
      .catch((err) => {
        console.error("Failed to load client profile:", err);
        setError("Could not load this client profile.");
      })
      .finally(() => setLoading(false));
  }, [client?.id]);

  if (!client) {
    return (
      <Page title="Client profile" subtitle="No client selected.">
        <button className="back-link" onClick={() => go("clients")}>‹ Clients</button>
      </Page>
    );
  }

  const data = profile || client;
  const intake = profile?.intake;
  const appointments = profile?.appointments || [];
  const firstName = data.first_name ?? data.firstName ?? "";
  const lastName = data.last_name ?? data.lastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim();
  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  const value = (v, fallback = "Not provided") => v || fallback;

  const formatStoredList = (stored) => {
    if (!stored) return "Not provided";
    try {
      const parsed = typeof stored === "string" ? JSON.parse(stored) : stored;
      return Array.isArray(parsed) && parsed.length ? parsed.join(", ") : "Not provided";
    } catch {
      return stored;
    }
  };

  const formatDate = (date) => {
    if (!date) return "Not provided";
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? date
      : new Intl.DateTimeFormat("en-AU", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(parsed);
  };

  const appointmentDateLabel = (appointment) => {
    const parsed = new Date(`${appointment.date}T00:00:00`);
    const day = new Intl.DateTimeFormat("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(parsed).toUpperCase();
    return `${day} · ${formatClock(appointment.startTime)}`;
  };

  return (
    <Page title={fullName} subtitle="Client profile and registration record.">
      <button className="back-link" onClick={() => go("clients")}>‹ Clients</button>
      {loading && <p>Loading client profile…</p>}
      {error && <p className="form-error">{error}</p>}

      <div className="profile-layout">
        <section className="form-card">
          <div className="profile-heading">
            <div className="large-avatar">{initials}</div>
            <div>
              <h2>{fullName}</h2>
              <p>{value(data.email)}{data.phone ? ` · ${data.phone}` : ""}</p>
            </div>
            <span className="status-pill">{value(data.membership, "Client")}</span>
          </div>

          <h2>Personal information</h2>
          <dl className="summary-list">
            <dt>Full name</dt><dd>{fullName}</dd>
            <dt>Email address</dt><dd>{value(data.email)}</dd>
            <dt>Phone number</dt><dd>{value(data.phone)}</dd>
            <dt>Date of birth</dt><dd>{formatDate(data.date_of_birth)}</dd>
            <dt>Gender</dt><dd>{value(data.gender)}</dd>
            <dt>Experience level</dt><dd>{value(intake?.experience_level)}</dd>
            <dt>Years of practice</dt><dd>{value(intake?.years_of_practice)}</dd>
          </dl>

          <h2>Upcoming appointments</h2>
          {appointments.length === 0 ? (
            <p className="profile-empty">No appointments linked to this client.</p>
          ) : (
            <div className="profile-appointments">
              {appointments.map((appointment) => (
                <div className="profile-appointment-row" key={appointment.id}>
                  <strong>{appointmentDateLabel(appointment)}</strong>
                  <span>
                    <b>{appointment.title}</b>
                    <small>
                      {appointment.appointmentType || "Private appointment"}
                      {appointment.location ? ` · ${appointment.location}` : ""}
                    </small>
                  </span>
                  <em>{appointment.status || "Scheduled"}</em>
                </div>
              ))}
            </div>
          )}

          <h2>Safety information</h2>
          <dl className="summary-list">
            <dt>Injuries / limitations</dt>
            <dd>{intake?.has_injury === "No" ? "None reported" : value(intake?.injury_details)}</dd>
            <dt>Accessibility requirements</dt>
            <dd>{value(intake?.accessibility_requirements, "None reported")}</dd>
            <dt>Medical care</dt>
            <dd>{value(intake?.medical_care, "No")}</dd>
            <dt>Medication</dt>
            <dd>{intake?.taking_medication === "No" ? "No" : value(intake?.medication_details, intake?.taking_medication || "Not provided")}</dd>
          </dl>
        </section>

        <aside className="progress-panel">
          <h3>{intake ? "Registration details" : "Client record"}</h3>
          <p>{intake ? "✓ Intake form completed" : "○ Intake form not completed"}</p>
          <p>✓ {appointments.length} appointment{appointments.length === 1 ? "" : "s"} linked</p>
          <p>Membership: {value(data.membership, "New client")}</p>
          <p>Last activity: {value(data.last_activity, "No activity")}</p>
          <button
            className="secondary-button"
            disabled={!intake}
            onClick={() => setShowIntake(true)}
          >
            <Eye size={16} /> View intake form
          </button>
        </aside>
      </div>

      {showIntake && intake && (
        <div className="drawer-backdrop" onMouseDown={() => setShowIntake(false)}>
          <aside className="details-drawer" onMouseDown={(event) => event.stopPropagation()}>
            <div className="drawer-title">
              <div>
                <h2>Intake form</h2>
                <p>{fullName}</p>
              </div>
              <button onClick={() => setShowIntake(false)} aria-label="Close"><X /></button>
            </div>

            <h4>Yoga experience</h4>
            <dl className="detail-list">
              <dt>Experience level</dt><dd>{value(intake.experience_level)}</dd>
              <dt>Years of practice</dt><dd>{value(intake.years_of_practice)}</dd>
              <dt>Previous experience</dt><dd>{value(intake.previous_experience)}</dd>
              <dt>Had yoga therapy</dt><dd>{value(intake.had_yoga_therapy)}</dd>
              <dt>Last yoga therapy session</dt><dd>{value(intake.last_yoga_therapy_session)}</dd>
              <dt>Yoga therapy frequency</dt><dd>{value(intake.yoga_therapy_frequency)}</dd>
              <dt>Yoga styles</dt><dd>{formatStoredList(intake.yoga_styles)}</dd>
            </dl>

            <h4>Goals and wellbeing</h4>
            <dl className="detail-list">
              <dt>Goals / reasons</dt><dd>{formatStoredList(intake.goals)}</dd>
              <dt>Other goals</dt><dd>{value(intake.other_goals)}</dd>
              <dt>Yoga interests</dt><dd>{formatStoredList(intake.yoga_interests)}</dd>
              <dt>Activity level</dt><dd>{value(intake.activity_level)}</dd>
              <dt>Stress level</dt><dd>{value(intake.stress_level)}</dd>
            </dl>

            <h4>Health and safety</h4>
            <dl className="detail-list">
              <dt>Has injury</dt><dd>{value(intake.has_injury)}</dd>
              <dt>Injury details</dt><dd>{value(intake.injury_details, "None reported")}</dd>
              <dt>Health conditions</dt><dd>{formatStoredList(intake.health_conditions)}</dd>
              <dt>Taking medication</dt><dd>{value(intake.taking_medication)}</dd>
              <dt>Medication details</dt><dd>{value(intake.medication_details, "None reported")}</dd>
              <dt>Accessibility requirements</dt><dd>{value(intake.accessibility_requirements, "None reported")}</dd>
              <dt>Medical care</dt><dd>{value(intake.medical_care, "No")}</dd>
              <dt>Additional information</dt><dd>{value(intake.additional_info)}</dd>
            </dl>
          </aside>
        </div>
      )}
    </Page>
  );
}

export default function App() {
  const [eventSeries, setEventSeries] = useState([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState(null);
  const currentWeek = useMemo(() => startOfWeek(new Date()), []);
  const [page, setPage] = useState("schedule");
  const [clients, setClients] = useState([]);
  const [currentClient, setCurrentClient] = useState(null);
  const [notice, setNotice] = useState("");
  const [editingBlocked, setEditingBlocked] = useState(null);
  const [registrationData, setRegistrationData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    emergencyName: "",
    emergencyRelationship: "",
    emergencyPhone: "",
    additionalInfo: "",
  });
  const [activities, setActivities] = useState(() =>
    sampleActivities.map((activity) => ({
      ...activity,
      date: toDateKey(addDays(currentWeek, activity.dayOffset)),
      ...(activity.type === "blocked"
        ? {
            timeType: "Administration work",
            startTime: "14:00",
            endTime: "16:00",
            repeat: "Does not repeat",
            reason: activity.meta,
            preventBookings: true,
          }
        : {}),
    })),
  );

  const loadClients = async () => {
    try {
      const response = await fetch(CLIENTS_API);
      const data = await readApiResponse(response);
      setClients(
        data.map((client) => ({
          id: client.id,
          firstName: client.first_name,
          lastName: client.last_name,
          email: client.email,
          phone: client.phone,
          dateOfBirth: client.date_of_birth,
          gender: client.gender,
          membership: client.membership,
          lastActivity: client.last_activity,
        })),
      );
    } catch (error) {
      console.error("Failed to load clients:", error);
    }
  };

  useEffect(() => {
    let active = true;
    fetch(ACTIVITIES_API)
      .then(readApiResponse)
      .then((savedActivities) => {
        if (active) setActivities(savedActivities);
      })
      .catch((error) => {
        console.error("Failed to load schedule activities:", error);
        if (active) {
          setNotice("Could not connect to the schedule database. Showing demo data.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (page === "create-appointment") loadClients();
  }, [page]);

  const go = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveClientToDatabase = async () => {
    try {
      setRegistrationData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: "",
        emergencyName: "",
        emergencyRelationship: "",
        emergencyPhone: "",
        additionalInfo: "",
      });
      setCurrentClient(null);
      await loadClients();
      go("clients");
    } catch (error) {
      console.error("Error completing client registration:", error);
      alert(error.message);
    }
  };

  const saveScheduledActivity = async (form) => {
    const isAppointment = form.type === "appointment";
    const activity = {
      type: form.type,
      title: form.title,
      clientId: isAppointment ? form.clientId : undefined,
      clientName: isAppointment ? form.clientName : undefined,
      appointmentType: isAppointment ? form.appointmentType : undefined,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      time: `${formatClock(form.startTime)}–${formatClock(form.endTime)}`,
      location: form.location || undefined,
      meta: isAppointment
        ? `${form.clientName} · ${form.appointmentType}${form.location ? ` · ${form.location}` : ""}`
        : form.location || "Location not set",
      position: positionFromTime(form.startTime),
      status: isAppointment ? "Scheduled" : undefined,
    };

    try {
      const saved = await readApiResponse(
        await fetch(ACTIVITIES_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activity),
        }),
      );
      setActivities((current) => [...current, saved]);
      setNotice(isAppointment ? "Appointment created." : "Single class created.");
      return { ok: true, saved };
    } catch (error) {
      console.error(error);
      setNotice(isAppointment ? "Appointment could not be saved to the database." : "Activity could not be saved to the database.");
      return { ok: false, message: error.message };
    }
  };

  const saveBlockedTime = async (form) => {
    const createBlocked = (date, id) => ({
      id,
      type: "blocked",
      title: form.title,
      date,
      startTime: form.startTime,
      endTime: form.endTime,
      time: `${formatClock(form.startTime)}–${formatClock(form.endTime)}`,
      timeType: form.timeType,
      repeat: form.repeat,
      reason: form.reason,
      preventBookings: form.preventBookings,
      meta: form.reason.trim() || form.timeType,
      position: positionFromTime(form.startTime),
      badge: form.preventBookings ? "No bookings" : undefined,
    });

    if (form.id) {
      try {
        const updated = createBlocked(form.date, form.id);
        const saved = await readApiResponse(
          await fetch(`${ACTIVITIES_API}/${form.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated),
          }),
        );
        setActivities((current) =>
          current.map((activity) =>
            String(activity.id) === String(form.id) ? saved : activity,
          ),
        );
        setNotice("Blocked time updated.");
      } catch (error) {
        console.error(error);
        setNotice("Blocked time could not be updated in the database.");
      }
    } else {
      const blocks = [];
      let date = new Date(`${form.date}T00:00:00`);
      const endDate = new Date(`${form.endDate}T00:00:00`);
      let index = 0;
      while (date <= endDate) {
        blocks.push(createBlocked(toDateKey(date), `blocked-${Date.now()}-${index}`));
        date = addDays(date, 1);
        index += 1;
      }
      try {
        const savedBlocks = await Promise.all(
          blocks.map((block) =>
            fetch(ACTIVITIES_API, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(block),
            }).then(readApiResponse),
          ),
        );
        setActivities((current) => [...current, ...savedBlocks]);
        setNotice(savedBlocks.length === 1 ? "Blocked time created." : `${savedBlocks.length} blocked times created.`);
      } catch (error) {
        console.error(error);
        setNotice("Blocked time could not be saved to the database.");
      }
    }
    setEditingBlocked(null);
  };

  const editBlocked = (activity) => {
    setEditingBlocked(activity);
    go("block-time");
  };

  const deleteActivity = async (id, successMessage) => {
    try {
      await readApiResponse(
        await fetch(`${ACTIVITIES_API}/${id}`, { method: "DELETE" }),
      );
      setActivities((current) =>
        current.filter((activity) => String(activity.id) !== String(id)),
      );
      setNotice(successMessage);
      return { ok: true };
    } catch (error) {
      console.error(error);
      setNotice("Activity could not be removed from the database.");
      return { ok: false, message: error.message };
    }
  };

  const cancelBlocked = (id) => deleteActivity(id, "Blocked time cancelled.");

  const updateActivity = async (updated) => {
    try {
      const saved = await readApiResponse(
        await fetch(`${ACTIVITIES_API}/${updated.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        }),
      );
      setActivities((current) =>
        current.map((activity) =>
          String(activity.id) === String(saved.id) ? saved : activity,
        ),
      );
      setNotice(updated.type === "appointment" ? "Appointment updated." : "Activity updated.");
      return { ok: true, saved };
    } catch (error) {
      console.error(error);
      setNotice("Activity could not be updated in the database.");
      return { ok: false, message: error.message };
    }
  };

  const cancelActivity = (id) => deleteActivity(id, "Appointment cancelled.");

  const moveActivity = async (id, date) => {
    const activity = activities.find((item) => String(item.id) === String(id));
    if (!activity || activity.date === date) return { ok: true };

    if (activity.type === "appointment") {
      const conflict = findAppointmentConflict(
        activities,
        { ...activity, date },
        activity.id,
      );
      if (conflict) {
        const message = conflictMessage(conflict);
        setNotice(`Move blocked: ${message}`);
        return { ok: false, message };
      }
    }

    try {
      const saved = await readApiResponse(
        await fetch(`${ACTIVITIES_API}/${id}/date`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date }),
        }),
      );
      setActivities((current) =>
        current.map((item) =>
          String(item.id) === String(id) ? saved : item,
        ),
      );
      setNotice(activity.type === "appointment" ? "Appointment moved." : "Activity moved.");
      return { ok: true, saved };
    } catch (error) {
      console.error(error);
      setNotice(`Activity could not be moved: ${error.message}`);
      return { ok: false, message: error.message };
    }
  };

  const syncSeriesActivity=(seriesId,session,series)=>({id:`${seriesId}-${session.id}`,seriesId,sessionId:session.id,type:'series',title:series.name,date:session.date,startTime:session.startTime,endTime:session.endTime,time:`${formatClock(session.startTime)}–${formatClock(session.endTime)}`,meta:`Event Series · ${series.location}`,position:positionFromTime(session.startTime)});const addSeriesSession=(seriesId,data)=>{const session={...data,id:`session-${Date.now()}`,status:'scheduled'};let target;setEventSeries(current=>current.map(series=>{if(series.id!==seriesId)return series;target={...series,status:'published',sessions:[...series.sessions.filter(item=>item.date),session]};return target}));if(target)setActivities(current=>[...current,syncSeriesActivity(seriesId,session,target)]);setNotice('Session added to the event series and schedule.')};const editSeriesSession=(seriesId,sessionId,data,scope)=>{let target;setEventSeries(current=>current.map(series=>{if(series.id!==seriesId)return series;const sessions=series.sessions.map(session=>{if(scope==='series'&&session.status!=='cancelled')return {...session,startTime:data.startTime,endTime:data.endTime,...(session.id===sessionId?{date:data.date}:{})};if(session.id===sessionId)return {...session,...data};return session});target={...series,sessions};return target}));if(target)setActivities(current=>current.map(activity=>{if(activity.seriesId!==seriesId)return activity;const session=target.sessions.find(item=>item.id===activity.sessionId);return session?{...activity,...syncSeriesActivity(seriesId,session,target)}:activity}));setNotice(scope==='series'?'Whole series times updated.':'Session updated.')};const cancelSeriesSession=(seriesId,sessionId)=>{setEventSeries(current=>current.map(series=>series.id===seriesId?{...series,sessions:series.sessions.map(session=>session.id===sessionId?{...session,status:'cancelled'}:session)}:series));setActivities(current=>current.filter(activity=>!(activity.seriesId===seriesId&&activity.sessionId===sessionId)));setNotice('Session cancelled and removed from the schedule.')};const removeSeriesSession=(seriesId,sessionId)=>{setEventSeries(current=>current.map(series=>series.id===seriesId?{...series,sessions:series.sessions.filter(session=>session.id!==sessionId)}:series));setActivities(current=>current.filter(activity=>!(activity.seriesId===seriesId&&activity.sessionId===sessionId)));setNotice('Session removed.')};const saveEventSeries=series=>{const id=`series-${Date.now()}`;const saved={...series,id};setEventSeries(current=>[...current,saved]);if(series.status==='published'){const dated=series.sessions.filter(session=>session.date).map((session,index)=>({id:`${id}-${session.id}`,seriesId:id,sessionId:session.id,type:'series',title:series.name,date:session.date,startTime:session.startTime,endTime:session.endTime,time:`${formatClock(session.startTime)}–${formatClock(session.endTime)}`,meta:`Event Series · ${series.location}`,position:positionFromTime(session.startTime),capacity:`${index+1} of ${series.sessions.filter(item=>item.date).length}`}));setActivities(current=>[...current,...dated])}setNotice(series.status==='draft'?'Event series saved as draft.':'Event series created and sessions added to the schedule.')};  let view;
  if (page === "schedule") {
    view = (
      <Schedule
        go={go}
        activities={activities}
        clients={clients}
        notice={notice}
        clearNotice={() => setNotice("")}
        onEditBlocked={editBlocked}
        onCancelBlocked={cancelBlocked}
        onUpdateActivity={updateActivity}
        onCancelActivity={cancelActivity}
        onMoveActivity={moveActivity}
      />
    );
  } else if (page === "clients") {
    view = <Clients go={go} Page={Page} clients={clients} onSelectClient={setCurrentClient} />;
  } else if (page === "series") {
    view = <Series go={go} eventSeries={eventSeries} onSelectSeries={setSelectedSeriesId} />;
  } else if (page === "appointments") {
    view = (
      <Appointments
        activities={activities}
        clients={clients}
        go={go}
        onUpdateActivity={updateActivity}
        onCancelActivity={cancelActivity}
      />
    );
  } else if (page === "settings") {
    view = <SettingsPage />;
  } else if (page === "block-time") {
    view = (
      <BlockTime
        go={(nextPage) => {
          if (nextPage === "schedule") setEditingBlocked(null);
          go(nextPage);
        }}
        onSubmit={saveBlockedTime}
        initial={editingBlocked}
      />
    );
  } else if (page === "create-class") {
    view = (
      <CreateScheduledActivity
        go={go}
        onSubmit={saveScheduledActivity}
        type="class"
        activities={activities}
      />
    );
  } else if (page === "create-appointment") {
    view = (
      <CreateScheduledActivity
        go={go}
        onSubmit={saveScheduledActivity}
        type="appointment"
        clients={clients}
        activities={activities}
      />
    );
  } else if (page === "series-details") {
    view = <SeriesDetails go={go} series={eventSeries.find((series) => series.id === selectedSeriesId)} onAddSession={addSeriesSession} onEditSession={editSeriesSession} onCancelSession={cancelSeriesSession} onRemoveSession={removeSeriesSession} />;
  } else if (page === "create-series") {
    view = <CreateSeries go={go} onSubmit={saveEventSeries} />;
  } else if (page === "add-client") {
    view = (
      <AddClient
        go={go}
        Header={Header}
        form={registrationData}
        setForm={setRegistrationData}
        setCurrentClient={setCurrentClient}
      />
    );
  } else if (page === "intake") {
    view = <Intake go={go} Header={Header} currentClient={currentClient} />;
  } else if (page === "eligibility") {
    view = <Eligibility go={go} />;
  } else if (page === "complete") {
    view = <Complete go={go} onComplete={saveClientToDatabase} />;
  } else {
    view = <ClientProfile go={go} client={currentClient} />;
  }

  return (
    <div className="app-shell">
      <Sidebar page={page} go={go} />
      {view}
    </div>
  );
}
