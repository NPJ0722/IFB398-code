export const activityTypes = {
  class: { label: 'Single class', filter: 'Classes' },
  recurring: { label: 'Recurring', filter: 'Classes' },
  series: { label: 'Event series', filter: 'Event Series' },
  appointment: { label: 'Appointment', filter: 'Appointments' },
  blocked: { label: 'Blocked', filter: 'Blocked Time' },
};

export const filters = ['All', 'Classes', 'Event Series', 'Appointments', 'Blocked Time'];

export const baseWeek = new Date(2026, 8, 14);

export const activities = [
  {
    id: 1,
    dayOffset: 0,
    title: 'Gentle Yoga',
    time: '9:00–10:00',
    meta: 'Studio A',
    type: 'class',
    position: 'morning',
  },
  {
    id: 2,
    dayOffset: 1,
    title: 'Balance Basics',
    time: '10:30–11:30',
    meta: 'Studio B',
    type: 'recurring',
    position: 'lateMorning',
  },
  {
    id: 3,
    dayOffset: 2,
    title: 'Strong Start',
    time: '9:00–10:00',
    meta: 'Event Series · Studio A',
    type: 'series',
    position: 'morning',
    capacity: '3 of 6',
  },
  {
    id: 4,
    dayOffset: 3,
    title: 'Jane Wilson',
    time: '1:30–2:15',
    meta: 'Appointment · Room 2',
    type: 'appointment',
    position: 'afternoon',
  },
  {
    id: 5,
    dayOffset: 4,
    title: 'Gentle Yoga',
    time: '9:00–10:00',
    meta: 'Studio A',
    type: 'class',
    position: 'morning',
  },
  {
    id: 6,
    dayOffset: 5,
    title: 'Core & Calm',
    time: '12:00–1:00',
    meta: 'Recurring · Studio B',
    type: 'recurring',
    position: 'midday',
  },
  {
    id: 7,
    dayOffset: 6,
    title: 'Blocked time',
    time: '2:00–4:00',
    meta: 'Admin work',
    type: 'blocked',
    position: 'lateAfternoon',
    badge: 'No bookings',
  },
];
