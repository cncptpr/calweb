import { CalDAVClient } from 'ts-caldav';
import dotenv from 'dotenv';
import { Todo } from '../types';

dotenv.config();

const CALDAV_URL = process.env.CALDAV_URL as string;
const CALDAV_USERNAME = process.env.CALDAV_USERNAME as string;
const CALDAV_PASSWORD = process.env.CALDAV_PASSWORD as string;
const CALDAV_KALENDAR = process.env.CALDAV_KALENDAR as string;

if (!CALDAV_URL || !CALDAV_USERNAME || !CALDAV_PASSWORD || !CALDAV_KALENDAR) {
  throw new Error('Missing CalDAV environment variables');
}

async function getClient() {
  return await CalDAVClient.create({
    baseUrl: CALDAV_URL,
    auth: {
      type: 'basic',
      username: CALDAV_USERNAME,
      password: CALDAV_PASSWORD,
    },
    logRequests: false,
  });
}

async function getCalendarUrl(client: CalDAVClient): Promise<string> {
  const calendars = await client.getCalendars();
  const calendar = calendars.find(
    cal => cal.displayName === CALDAV_KALENDAR
  );
  if (!calendar) throw new Error('Calendar not found');
  return calendar.url;
}

function dateToISOStringOrNow(date: Date | string | undefined): string {
  if (!date) return new Date().toISOString();
  if (typeof date === 'string') return date;
  return date.toISOString();
}

export async function listTodos(): Promise<Todo[]> {
  const client = await getClient();
  const calUrl = await getCalendarUrl(client);
  const todos = await client.getTodos(calUrl, { all: true });
  return todos.map(todo => ({
    id: todo.uid,
    title: todo.summary || '',
    completed: (todo.status === 'COMPLETED') || !!todo.completed,
    createdAt: dateToISOStringOrNow(todo.completed),
    updatedAt: dateToISOStringOrNow(todo.completed),
  }));
}

export async function addTodo(title: string): Promise<Todo> {
  const client = await getClient();
  const calUrl = await getCalendarUrl(client);
  const now = new Date().toISOString();
  const uid = (Date.now() + Math.random()).toString(36);
  await client.createTodo(calUrl, {
    summary: title,
    uid,
    status: 'NEEDS-ACTION',
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
  updates: { title?: string; completed?: boolean }
): Promise<Todo> {
  const client = await getClient();
  const calUrl = await getCalendarUrl(client);
  const todos = await client.getTodos(calUrl, { all: true });
  const todo = todos.find(t => t.uid === id);
  if (!todo) throw new Error('Todo not found');
  if (updates.title !== undefined) todo.summary = updates.title;
  if (updates.completed !== undefined) {
    todo.status = updates.completed ? 'COMPLETED' : 'NEEDS-ACTION';
    todo.completed = updates.completed ? new Date() : undefined;
  }
  await client.updateTodo(calUrl, todo);
  return {
    id: todo.uid,
    title: todo.summary || '',
    completed: (todo.status === 'COMPLETED') || !!todo.completed,
    createdAt: dateToISOStringOrNow(todo.completed),
    updatedAt: dateToISOStringOrNow(todo.completed),
  };
}

export async function deleteTodo(id: string): Promise<{ id: string }> {
  const client = await getClient();
  const calUrl = await getCalendarUrl(client);
  const todos = await client.getTodos(calUrl, { all: true });
  const todo = todos.find(t => t.uid === id);
  if (!todo) throw new Error('Todo not found');
  await client.deleteTodo(calUrl, todo.uid, todo.etag);
  return { id };
}
