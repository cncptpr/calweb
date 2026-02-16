import { CalDAVClient, Calendar, Todo } from "ts-caldav";
import dotenv from "dotenv";
import { createServerOnlyFn } from "@tanstack/react-start";
import { UNCOMPLETED_STATUS } from "@/data/todos";

dotenv.config();

const CALDAV_URL = createServerOnlyFn(() => process.env.CALDAV_URL as string);
const CALDAV_USERNAME = createServerOnlyFn(
  () => process.env.CALDAV_USERNAME as string,
);
const CALDAV_PASSWORD = createServerOnlyFn(
  () => process.env.CALDAV_PASSWORD as string,
);
const CALDAV_KALENDAR = createServerOnlyFn(
  () => process.env.CALDAV_KALENDAR as string,
);

if (
  !CALDAV_URL() ||
  !CALDAV_USERNAME() ||
  !CALDAV_PASSWORD() ||
  !CALDAV_KALENDAR()
) {
  throw new Error("Missing CalDAV environment variables");
}

let _client: CalDAVClient | null = null;
let _calendar: Calendar | null = null;

const getClient = createServerOnlyFn(async (): Promise<CalDAVClient> => {
  if (!_client) {
    console.log("[INFO] Creating CalDAV client");
    // TODO: Error handling
    _client = await CalDAVClient.create({
      baseUrl: CALDAV_URL(),
      auth: {
        type: "basic",
        username: CALDAV_USERNAME(),
        password: CALDAV_PASSWORD(),
      },
      logRequests: true,
    });
  }
  return _client;
});

const getCalendar = createServerOnlyFn(
  async (client: CalDAVClient): Promise<Calendar> => {
    if (!_calendar) {
      console.log("[Info] Fetching calendar for the first time");
      const calendars = await client.getCalendars();
      const calendar = calendars.find(
        (cal) => cal.displayName === CALDAV_KALENDAR(),
      );
      if (!calendar) {
        console.log(
          `[ERROR] No Calendar in`,
          calendars.map((c) => c.displayName),
          `matches provided CALDAV_CALENDAR '${CALDAV_KALENDAR()}'.`,
        );
        throw new Error("Calendar not found");
      }
      _calendar = calendar;
    }
    return _calendar;
  },
);

export const fetchTodos = createServerOnlyFn(async (): Promise<Todo[]> => {
  const client = await getClient();
  const calendar = await getCalendar(client);
  const todos = await client.getTodos(calendar.url, { all: true });
  return todos;
});

export const createTodo = createServerOnlyFn(
  async (summary: string): Promise<Todo> => {
    const client = await getClient();
    const calendar = await getCalendar(client);
    console.log("Adding todo with title:", summary);
    const uid = (Date.now() + Math.random()).toString(36);
    const res = await client.createTodo(calendar.url, {
      summary,
      uid,
      status: UNCOMPLETED_STATUS,
    });
    return {
      uid: res.uid,
      etag: res.etag,
      href: res.href,
      summary,
      status: UNCOMPLETED_STATUS,
    };
  },
);

export const updateTodo = createServerOnlyFn(
  async (todo: Todo) => {
    try {
      const client = await getClient();
      const calendar = await getCalendar(client);
      console.log(`Updating Todo:`, todo);
      const res = await client.updateTodo(calendar.url, todo);
      return res;
    } catch (e) {
      console.log("updateTodo:", e);
      throw e;
    }
  },
);

export const deleteTodo = createServerOnlyFn(
  async (uid: string, etag?: string) => {
    console.log("Deleting todo with id:", uid);
    const client = await getClient();
    const calendar = await getCalendar(client);
    await client.deleteTodo(calendar.url, uid, etag);
  },
);
