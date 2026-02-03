import { DAVClient, DAVCalendar } from "tsdav";
import dotenv from "dotenv";
import { Todo } from "../types";

dotenv.config();

// TODO: use t3 typesafe env vars
const {
  CALDAV_URL: _CALDAV_URL,
  CALDAV_USERNAME: _CALDAV_USERNAME,
  CALDAV_PASSWORD: _CALDAV_PASSWORD,
  CALDAV_KALENDAR: _CALDAV_KALENDAR,
} = process.env;

const CALDAV_URL = _CALDAV_URL as string;
const CALDAV_USERNAME = _CALDAV_USERNAME as string;
const CALDAV_PASSWORD = _CALDAV_PASSWORD as string;
const CALDAV_KALENDAR = _CALDAV_KALENDAR as string;

if (!CALDAV_URL || !CALDAV_USERNAME || !CALDAV_PASSWORD || !CALDAV_KALENDAR) {
  throw new Error("Missing CalDAV environment variables");
}

let _client: DAVClient | null = null;
let _calendar: DAVCalendar | null = null;

async function getClient() {
  if (!_client) {
    _client = new DAVClient({
      serverUrl: CALDAV_URL,
      credentials: {
        username: CALDAV_USERNAME,
        password: CALDAV_PASSWORD,
      },
      authMethod: "Basic",
      defaultAccountType: "caldav",
    });
    await _client.login();
  }
  return _client;
}

async function getCalendar() {
  if (!_calendar) {
    const cl = await getClient();
    const calendars = await cl.fetchCalendars();
    if (!calendars?.length) throw new Error("No calendars found");
    _calendar =
      calendars.find((item) => item.displayName === CALDAV_KALENDAR) || null;
    console.log(
      "Available calendars:",
      calendars.map(
        (c) => c.displayName + (c.displayName === CALDAV_KALENDAR ? "*" : ""),
      ),
    );
    if (!_calendar) throw new Error("Calendar not found: " + CALDAV_KALENDAR);
  }
  return _calendar;
}

function parseVTodoFromIcal(ical: string): {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
} | null {
  // TODO: Use a proper iCal parser library
  const vtodoMatch = ical.match(/BEGIN:VTODO([\s\S]*?)END:VTODO/);
  if (!vtodoMatch) return null;
  const vtodoStr = vtodoMatch[1];
  const getField = (field: string) => {
    const m = vtodoStr.match(new RegExp(`${field}:([^\n\r]+)`));
    return m ? m[1].trim() : "";
  };
  const id = getField("UID") || getField("X-UID") || "";
  const title = getField("SUMMARY") || "";
  const status = getField("STATUS") || "";
  const completed = status === "COMPLETED";
  const createdAt = getField("DTSTAMP") || new Date().toISOString();
  const updatedAt = getField("LAST-MODIFIED") || createdAt;
  return { id, title, completed, createdAt, updatedAt };
}

export async function listTodos(): Promise<Todo[]> {
  console.log("Listing todos from CalDAV...");
  const client = await getClient();
  const calendar = await getCalendar();
  // const [syncCalendar] = await client.syncCalendars({
  //   oldCalendars: [calendar],
  // });
  const objects = await client.fetchCalendarObjects({ calendar: calendar });

  const todos: Todo[] = [];
  console.log(`Found ${objects.length} calendar objects`);
  for (const obj of objects) {
    // TODO: don't use any
    const ical = (obj as any).calendarData;
    if (!ical) continue;
    const parsed = parseVTodoFromIcal(ical);
    if (parsed && parsed.id) {
      todos.push({
        id: parsed.id,
        title: parsed.title,
        completed: parsed.completed,
        createdAt: parsed.createdAt || new Date().toISOString(),
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      });
    }
  }
  console.log(`Found ${todos.length} todos`);
  return todos;
}

export async function addTodo(title: string): Promise<Todo> {
  const cl = await getClient();
  const cal = await getCalendar();
  const now = new Date().toISOString().replace(/[-:.]/g, "") + "Z";
  const uid = (Date.now() + Math.random()).toString(36);
  // TODO: use a proper iCal builder library
  const vcalString = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//calweb//EN",
    "BEGIN:VTODO",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${title}`,
    "STATUS:NEEDS-ACTION",
    "END:VTODO",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  await cl.createCalendarObject({
    calendar: cal,
    filename: `${uid}.ics`,
    iCalString: vcalString,
  });
  return {
    id: uid,
    title,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateTodo(
  id: string,
  updates: { title?: string; completed?: boolean },
): Promise<Todo> {
  const cl = await getClient();
  const cal = await getCalendar();
  const objects = await cl.fetchCalendarObjects({ calendar: cal });
  const obj = objects.find((obj) => {
    const ical = (obj as any).calendarData;
    const parsed = ical ? parseVTodoFromIcal(ical) : undefined;
    return parsed && parsed.id === id;
  });
  if (!obj) throw new Error("Todo not found for update");
  const ical = (obj as any).calendarData;
  if (!ical) throw new Error("No calendarData for todo");
  const parsed = parseVTodoFromIcal(ical);
  if (!parsed) throw new Error("Unable to parse VTODO for update");
  const now = new Date().toISOString().replace(/[-:.]/g, "") + "Z";
  // TODO: use a proper iCal builder library
  const vcalString = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//calweb//EN",
    "BEGIN:VTODO",
    `UID:${parsed.id}`,
    `DTSTAMP:${parsed.createdAt?.replace(/[-:.]/g, "") || now}`,
    `SUMMARY:${updates.title ?? parsed.title}`,
    updates.completed ? "STATUS:COMPLETED" : "STATUS:NEEDS-ACTION",
    "END:VTODO",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
  await cl.updateCalendarObject({
    calendarObject: obj,
    iCalString: vcalString,
    filename: (obj as any).filename,
  } as any); // type cast as any for runtime
  return {
    id: parsed.id,
    title: updates.title ?? parsed.title,
    completed: !!updates.completed,
    createdAt: parsed.createdAt || new Date().toISOString(),
    updatedAt: now,
  };
}

export async function deleteTodo(id: string): Promise<{ id: string }> {
  const cl = await getClient();
  const cal = await getCalendar();
  const objects = await cl.fetchCalendarObjects({ calendar: cal });
  const obj = objects.find((obj) => {
    const ical = (obj as any).calendarData;
    const parsed = ical ? parseVTodoFromIcal(ical) : undefined;
    return parsed && parsed.id === id;
  });
  if (!obj) throw new Error("Todo not found for delete");
  await cl.deleteCalendarObject({ calendarObject: obj } as any);
  return { id };
}
