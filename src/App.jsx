import { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Diamond,
  Settings,
  SlidersHorizontal,
  UsersRound,
  X,
} from 'lucide-react';
import { activities, activityTypes, baseWeek, filters } from './data/schedule';

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatRange(start) {
  const end = addDays(start, 6);
  if (start.getMonth() === end.getMonth()) {
    return `${MONTHS[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  }
  return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
}

function Sidebar() {
  const links = [
    { label: 'Schedule', icon: CalendarDays, active: true },
    { label: 'Clients', icon: UsersRound },
    { label: 'Event Series', icon: SlidersHorizontal },
    { label: 'Appointments', icon: Diamond },
    { label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <strong>Strong &amp; Steady</strong>
        <span>PRACTITIONER</span>
      </div>
      <nav aria-label="Main navigation">
        {links.map(({ label, icon: Icon, active }) => (
          <button className={`nav-item ${active ? 'active' : ''}`} key={label} type="button">
            <Icon size={16} strokeWidth={1.8} />
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

function ActivityCard({ activity }) {
  return (
    <button className={`activity-card ${activity.type} ${activity.position}`} type="button">
      <strong>{activity.title}</strong>
      <span>{activity.time}</span>
      <small>{activity.meta}</small>
      {activity.capacity && <em>{activity.capacity}</em>}
      {activity.badge && <em>{activity.badge}</em>}
    </button>
  );
}

function CreateActivityModal({ onClose }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="activity-modal" role="dialog" aria-modal="true" aria-labelledby="create-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div>
            <h2 id="create-title">Create activity</h2>
            <p>Choose what you would like to add to the schedule.</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close create activity menu"><X size={18} /></button>
        </div>
        <div className="activity-options">
          {['Single class', 'Event series', 'Appointment', 'Blocked time'].map((item) => (
            <button type="button" key={item} onClick={onClose}>{item}<ChevronRight size={17} /></button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [weekOffset, setWeekOffset] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const weekStart = useMemo(() => addDays(baseWeek, weekOffset * 7), [weekOffset]);
  const visibleActivities = activities.filter((activity) => {
    if (weekOffset !== 0) return false;
    return activeFilter === 'All' || activityTypes[activity.type].filter === activeFilter;
  });

  return (
    <div className="app-shell">
      <Sidebar />
      <main>
        <header className="page-header">
          <div>
            <h1>Schedule</h1>
            <p>Manage classes, appointments and your availability.</p>
          </div>
          <button className="primary-button" type="button" onClick={() => setShowCreate(true)}>＋ Create activity</button>
        </header>

        <section className="schedule-toolbar" aria-label="Schedule controls">
          <h2>{formatRange(weekStart)}</h2>
          <div className="week-controls">
            <button className="icon-button" type="button" onClick={() => setWeekOffset((value) => value - 1)} aria-label="Previous week"><ChevronLeft size={18} /></button>
            <button className="today-button" type="button" onClick={() => setWeekOffset(0)}>Today</button>
            <button className="icon-button" type="button" onClick={() => setWeekOffset((value) => value + 1)} aria-label="Next week"><ChevronRight size={18} /></button>
          </div>
        </section>

        <section className="filter-and-legend">
          <div className="filters" aria-label="Filter schedule">
            {filters.map((filter) => (
              <button
                type="button"
                key={filter}
                className={activeFilter === filter ? 'selected' : ''}
                onClick={() => setActiveFilter(filter)}
                aria-pressed={activeFilter === filter}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="legend" aria-label="Activity colour legend">
            {Object.entries(activityTypes).map(([type, item]) => (
              <span key={type} className={type}><i />{item.label}</span>
            ))}
          </div>
        </section>

        <section className="calendar" aria-label={`Schedule for ${formatRange(weekStart)}`}>
          {DAY_LABELS.map((label, index) => {
            const date = addDays(weekStart, index);
            const isReferenceToday = weekOffset === 0 && index === 4;
            const dayActivities = visibleActivities.filter((activity) => activity.dayOffset === index);
            return (
              <article className="day-column" key={label}>
                <header>
                  <span>{label}</span>
                  <strong className={isReferenceToday ? 'today-date' : ''}>{date.getDate()}</strong>
                </header>
                <div className="day-content">
                  {dayActivities.map((activity) => <ActivityCard activity={activity} key={activity.id} />)}
                </div>
              </article>
            );
          })}
          {visibleActivities.length === 0 && (
            <div className="empty-state">
              <CalendarDays size={28} strokeWidth={1.5} />
              <strong>No activities this week</strong>
              <span>Use Create activity to add something to this schedule.</span>
            </div>
          )}
          <p className="calendar-tip">Tip: Select any activity to open details.</p>
        </section>
      </main>
      {showCreate && <CreateActivityModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
