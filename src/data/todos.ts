import { createIsomorphicFn, createServerFn } from "@tanstack/react-start";
import * as caldav from "../server/caldavService";
import { getSteam as getStream, sendUpdate } from "@/server/distributeService";

export type Id = string;

export interface Todo {
  id: Id;
  title: string;
  completed: boolean;
}

export type TodoSingleUpdate =
  | { type: "set" | "add"; todo: Todo }
  | { type: "mutate"; id: Id; change: Partial<Omit<Todo, "id">> }
  | { type: "delete"; id: Id };

export type TodoUpdate =
  | { type: "replace"; todos: Todo[] }
  | { type: "batch"; updates: TodoSingleUpdate[] }
  | TodoSingleUpdate;

export type OrderSubscriber = {
  orderFn: (todos: Todo[]) => Id[];
  cb: (todos: Id[]) => void;
  lastOrder: Id[];
};

export type Listener = {
  handler?: (update: TodoUpdate) => void;
};

/**
  TodoStore holds the global state of calweb and provides subscriptions and
  events to make calweb realtime.

  The contents of the TodoStore are not meant to be modified
  directly (hence the _), but instead with it's helper functions.

  There are the expected functions for state:
  `has`, `get`, `getAll`, `set`, etc.
  All 'setters' will trigger the events themselfs.

  TODO: subsriber and listener docu
*/
export type TodoStore = {
  _data: Map<Id, Todo>;
  _subscribers: Map<Id, Set<(todo: Todo) => void>>;
  _orderSubscribers: Set<OrderSubscriber>;
  _listeners: Set<Listener>;
};

export function createStore(initialTodos: Todo[] = []): TodoStore {
  const store: TodoStore = {
    _data: new Map<Id, Todo>(),
    _subscribers: new Map<Id, Set<(todo: Todo) => void>>(),
    _orderSubscribers: new Set<OrderSubscriber>(),
    // TODO: add listeners functionality
    _listeners: new Set<Listener>(),
  };
  initialTodos.forEach((t) => store._data.set(t.id, t));
  return store;
}

export function has(store: TodoStore, id: Id): boolean {
  return store._data.has(id);
}

export function get(store: TodoStore, id: Id): Todo | undefined {
  return store._data.get(id);
}

export function subscribe(
  store: TodoStore,
  id: Id,
  cb: (todo: Todo) => void,
): () => void {
  if (!store._subscribers.has(id)) {
    store._subscribers.set(id, new Set());
  }
  store._subscribers.get(id)!.add(cb);
  return function unsubscribe() {
    store._subscribers.get(id)?.delete(cb);
export function subscribeToOrder(
  store: TodoStore,
  orderFn: (todos: Todo[]) => Id[],
  cb: (todos: Id[]) => void,
  lastOrder?: Id[],
): () => void {
  const subscriber: OrderSubscriber = {
    cb,
    orderFn,
    lastOrder: lastOrder ?? getOrder(store, orderFn),
  };
  store._orderSubscribers.add(subscriber);
  return function unsubscribe() {
    store._orderSubscribers.delete(subscriber);
  };
}

export function getAll(store: TodoStore): Todo[] {
  return Array.from(store._data.values());
}

export function getOrder(
  store: TodoStore,
  orderFn: (todos: Todo[]) => Id[],
): Id[] {
  return orderFn(getAll(store));
}

export function serverUpdate(store: TodoStore, todoUpdate: TodoUpdate) {
  update(store, todoUpdate);
}

export const updateAndSend = createIsomorphicFn().client(
  async (store: TodoStore, todoUpdate: TodoUpdate) => {
    update(store, todoUpdate);
    await sendUpdate({ data: todoUpdate });
  },
);

export function update(store: TodoStore, update: TodoUpdate): void {
  function rec(store: TodoStore, update: TodoUpdate) {
    switch (update.type) {
      case "replace": {
        replace(store, update.todos);
        break;
      }
      case "batch": {
        update.updates.forEach((u) => rec(store, u));
        break;
      }
      case "set":
      case "add": {
        const todo = store._data.get(update.todo.id);
        store._data.set(update.todo.id, update.todo);
        notifyIfChanged(store, update.todo, todo);
        break;
      }
      case "mutate": {
        const todo = store._data.get(update.id);
        if (!todo) {
          console.log("[Error] Mutation of not exisiting todo! Ignoring...");
          return;
        }
        const updatedTodo = { ...todo, ...update.change };
        store._data.set(update.id, updatedTodo);
        notifyIfChanged(store, updatedTodo, todo);
        break;
      }
      case "delete": {
        store._data.delete(update.id);
        break;
      }
      default:
        update satisfies never;
    }
  }
  rec(store, update);
  store._orderSubscribers.forEach((s) => {
    const order = getOrder(store, s.orderFn);
    if (ordersEqual(order, s.lastOrder)) return;
    s.lastOrder = order;
    s.cb(order);
  });
  store._listeners.forEach((l) => l.handler?.call(l.handler, update));
}

function notifyIfChanged(store: TodoStore, now: Todo, old: Todo | undefined) {
  if (!todosEqual(now, old)) {
    store._subscribers.get(now.id)?.forEach((cb) => cb(now));
  }
}

function replace(store: TodoStore, todos: Todo[]): void {
  store._data.clear();
  todos.forEach((t) => store._data.set(t.id, t));
  store._orderSubscribers.forEach((s) => callOrderSubscriber(store, s));
}

export function addListener(store: TodoStore): Listener {
  const l = {};
  store._listeners.add(l);
  return l;
}
export function removeListener(store: TodoStore, l: Listener): void {
  store._listeners.delete(l);
}

function todosEqual(a: Todo | undefined, b: Todo | undefined) {
  return (
    a && b && a.id == b.id && a.title == b.title && a.completed == b.completed
  );
}

function ordersEqual(a: Id[], b: Id[]) {
  if (a.length != b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

function callOrderSubscriber(store: TodoStore, subscriber: OrderSubscriber) {
  const order = getOrder(store, subscriber.orderFn);
  if (!ordersEqual(order, subscriber.lastOrder)) {
    subscriber.lastOrder = order;
    subscriber.cb(order);
  }
}

export const getTodoStream = createServerFn().handler(() => getStream());

export const fetchTodos = createServerFn().handler(
  async () => await caldav.listTodos(),
);

export function generateId() {
  return (Date.now() + Math.random()).toString(36);
}
