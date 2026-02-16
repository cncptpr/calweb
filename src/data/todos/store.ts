import { Todo } from "ts-caldav";
import { Id } from "@/data/todos";

export type OrderSubscriber = {
  orderFn: (todos: Todo[]) => Id[];
  cb: (todos: Id[]) => void;
  lastOrder: Id[];
};

/**
  TodoStore holds the global state of calweb and provides subscriptionsto make calweb realtime.

  The contents of the TodoStore are not meant to be modified
  directly (hence the _), but instead with it's helper functions.

  There are the expected functions for state:
  `has`, `get`, `getAll`, `set`, etc.
  All 'setters' will trigger the events themselfs.

  TODO: subsriber docu
*/
export type TodoStore = {
  _data: Map<Id, Todo>;
  _subscribers: Map<Id, Set<(todo: Todo) => void>>;
  _orderSubscribers: Set<OrderSubscriber>;
};

export function createStore(initialTodos: Todo[] = []): TodoStore {
  const store: TodoStore = {
    _data: new Map<Id, Todo>(initialTodos.map((t) => [t.uid, t])),
    _subscribers: new Map<Id, Set<(todo: Todo) => void>>(),
    _orderSubscribers: new Set<OrderSubscriber>(),
  };
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


function ordersEqual(a: Id[], b: Id[]) {
  if (a.length != b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}

export function callOrderSubscriber(store: TodoStore, subscriber: OrderSubscriber) {
  const order = getOrder(store, subscriber.orderFn);
  if (!ordersEqual(order, subscriber.lastOrder)) {
    subscriber.lastOrder = order;
    subscriber.cb(order);
  }
}

export function generateId() {
  return (Date.now() + Math.random()).toString(36);
}
