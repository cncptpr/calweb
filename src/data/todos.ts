import { createServerFn } from "@tanstack/react-start";
import * as caldav from "../server/caldavService";
import { distributor } from "@/server/distributeService";

import React from "react";

export type Id = string;

export interface Todo {
  id: Id;
  title: string;
  completed: boolean;
}

export type TodoUpdate =
  | { type: "one"; todo: Todo }
  | { type: "batch" | "all"; todos: Todo[] };

export type OrderSubscriber = {
  orderFn: (todos: Todo[]) => Id[];
  cb: (todos: Id[]) => void;
  lastOrder: Id[];
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

export function set(store: TodoStore, todo: Todo): void {
  setMany(store, [todo]);
}

export function setMany(store: TodoStore, todos: Todo[]): void {
  todos.forEach((todo) => {
    store._data.set(todo.id, todo);
    store._subscribers.get(todo.id)?.forEach((cb) => cb(get(store, todo.id)!));
  });
  store._orderSubscribers.forEach((s) => callOrderSubscriber(store, s));
}

export function remove(store: TodoStore, id: Id): void {
  if (store._data.has(id)) {
    store._data.delete(id);
    store._orderSubscribers.forEach((s) => callOrderSubscriber(store, s));
  }
}

export function replaceWith(store: TodoStore, todos: Todo[]): void {
  store._data.clear();
  todos.forEach((t) => store._data.set(t.id, t));
  store._orderSubscribers.forEach((s) => callOrderSubscriber(store, s));
}

export function addListener(store: TodoStore, l: Listener): void {
  store._listeners.add(l);
}
export function removeListener(store: TodoStore, l: Listener): void {
  store._listeners.delete(l);
}

function ordersEqual(as: Id[], bs: Id[]) {
  if (as.length != bs.length) return false;
  for (let i = 0; i < as.length; i++) {
    if (as[i] != bs[i]) return false;
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

export type Listener = {
  handler: (update: TodoUpdate) => void;
};

export const getTodoStream = createServerFn().handler(() =>
  distributor.getSteam(),
);

export const listTodos = createServerFn({ method: "GET" }).handler(
  async () => await caldav.listTodos(),
);

export const addTodo = createServerFn({ method: "POST" })
  .inputValidator((input: { title: string }) => input)
  .handler(async ({ data }) => {
    const todo = await caldav.addTodo(data.title);
    distributor.enqueue({ type: "one", todo });
    return todo;
  });

export const updateTodo = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id: string; title?: string; completed?: boolean }) => input,
  )
  .handler(async ({ data }) => {
    const todo = await caldav.updateTodo(data.id, {
      title: data.title,
      completed: data.completed,
    });
    console.log("[DEBUG] Sending todo to clients", todo);
    distributor.enqueue({ type: "one", todo });
    return todo;
  });

export const deleteTodo = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await caldav.deleteTodo(data.id);
    return { id: data.id };
  });

export function useTodo(store: TodoStore, id: string) {
  const [todo, setTodo] = React.useState<Todo>(get(store, id)!);
  React.useEffect(() => {
    setTodo(get(store, id)!);
    return subscribe(store, id, setTodo);
  }, [id]);
  return {
    todo,
    toggle: async () => {
      const completed = !todo.completed;
      set(store, { ...todo, completed });
      await updateTodo({ data: { id, completed } });
    },
    edit: async (title: string) => {
      set(store, { ...todo, title });
      await updateTodo({ data: { id, title } });
    },
    remove: async () => {
      remove(store, id);
      await deleteTodo({ data: { id } });
    },
  };
}

export function useOrder(store: TodoStore, orderFn: (todo: Todo[]) => Id[]) {
  const [order, setOrder] = React.useState<Id[]>(getOrder(store, orderFn));
  React.useEffect(() => subscribeToOrder(store, orderFn, setOrder), []);
  return order;
}
