import { CalDAVClient, Calendar } from "ts-caldav";
import dotenv from "dotenv";
import { Todo, TodoUpdate } from "../types";
import { createServerOnlyFn } from "@tanstack/react-start";

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
      console.log(calendars);
      _calendar = calendar;
    }
    return _calendar;
  },
);

export const listTodos = createServerOnlyFn(async (): Promise<Todo[]> => {
  const client = await getClient();
  const calendar = await getCalendar(client);
  console.log("Listing todos from CalDAV");
  const todos = await client.getTodos(calendar.url, { all: true });
  return todos.map((todo) => ({
    id: todo.uid,
    title: todo.summary || "",
    completed: todo.status === "COMPLETED" || !!todo.completed,
  }));
});

export const addTodo = createServerOnlyFn(
  async (title: string): Promise<Todo> => {
    const client = await getClient();
    const calendar = await getCalendar(client);
    console.log("Adding todo with title:", title);
    const uid = (Date.now() + Math.random()).toString(36);
    await client.createTodo(calendar.url, {
      summary: title,
      uid,
      status: "NEEDS-ACTION",
    });
    return {
      id: uid,
      title,
      completed: false,
    };
  },
);

export const updateTodo = createServerOnlyFn(
  async (
    id: string,
    updates: { title?: string; completed?: boolean },
  ): Promise<Todo> => {
    console.log("Updating todo", id, updates);
    const client = await getClient();
    const calendar = await getCalendar(client);
    const todos = await client.getTodos(calendar.url, { all: true });
    const todo = todos.find((t) => t.uid === id);
    if (!todo) throw new Error("Todo not found");
    if (updates.title !== undefined) todo.summary = updates.title;
    if (updates.completed !== undefined) {
      todo.status = updates.completed ? "COMPLETED" : "NEEDS-ACTION";
      todo.completed = updates.completed ? new Date() : undefined;
    }
    await client.updateTodo(calendar.url, todo);
    return {
      id: todo.uid,
      title: todo.summary || "",
      completed: todo.status === "COMPLETED" || !!todo.completed,
    };
  },
);

export const deleteTodo = createServerOnlyFn(
  async (id: string): Promise<{ id: string }> => {
    console.log("Deleting todo with id:", id);
    const client = await getClient();
    const calendar = await getCalendar(client);
    const todos = await client.getTodos(calendar.url, { all: true });
    const todo = todos.find((t) => t.uid === id);
    if (!todo) throw new Error("Todo not found");
    await client.deleteTodo(calendar.url, todo.uid, todo.etag);
    return { id };
  },
);
