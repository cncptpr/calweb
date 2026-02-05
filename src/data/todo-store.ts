import { Todo } from "@/types";
import React from "react";
import { deleteTodo, getTodoStream, updateTodo } from "./todos";

type Id = string;

type OrderSubscriber = {
  orderFn: (todos: Todo[]) => Id[];
  cb: (todos: Id[]) => void;
  lastOrder: Id[];
};

const ordersEqual = (as: Id[], bs: Id[]) => {
  if (as.length != bs.length) return false;
  for (let i = 0; i < as.length; i++) {
    if (as[i] != bs[i]) return false;
  }
  return true;
};

const callOrderSubscriber = (subscriber: OrderSubscriber) => {
  const order = TodoStore.getInOrder(subscriber.orderFn);
  if (!ordersEqual(order, subscriber.lastOrder)) {
    subscriber.lastOrder = order;
    subscriber.cb(order);
  }
};

export const TodoStore = {
  _data: new Map<Id, Todo>(),
  _subscribers: new Map<Id, Set<(todo: Todo) => void>>(),
  _orderSubscribers: new Set<OrderSubscriber>(),
  has: (id: Id) => TodoStore._data.has(id),
  get: (id: Id) => TodoStore._data.get(id)!,
  subscribe: (id: Id, cb: (todo: Todo) => void): (() => void) => {
    if (!TodoStore._subscribers.has(id)) {
      TodoStore._subscribers.set(id, new Set());
    }
    TodoStore._subscribers.get(id)?.add(cb);
    return () => {
      TodoStore._subscribers.get(id)?.delete(cb);
    };
  },
  list: () => Array.from(TodoStore._data.values()),
  getInOrder: (orderFn: (todos: Todo[]) => Id[]): Id[] =>
    orderFn(TodoStore.list()),
  subscribeToOrder: (
    orderFn: (todos: Todo[]) => Id[],
    cb: (todos: Id[]) => void,
    lastOrder?: Id[],
  ): (() => void) => {
    const subscriber = {
      cb,
      orderFn,
      lastOrder: lastOrder ?? TodoStore.getInOrder(orderFn),
    };
    TodoStore._orderSubscribers.add(subscriber);
    return () => TodoStore._orderSubscribers.delete(subscriber);
  },
  set: (todo: Todo) => TodoStore.setMany([todo]),
  setMany: (todos: Todo[]) => {
    todos.forEach((todo) => {
      TodoStore._data.set(todo.id, todo);
      TodoStore._subscribers
        .get(todo.id)
        ?.forEach((cb) => cb(TodoStore.get(todo.id)));
    });
    TodoStore._orderSubscribers.forEach(callOrderSubscriber);
  },
  delete: (id: string) => {
    if (TodoStore._data.has(id)) {
      TodoStore._data.delete(id);
      TodoStore._orderSubscribers.forEach(callOrderSubscriber);
    }
  },
  replaceWith: (todos: Todo[]) => {
    TodoStore._data.clear();
    todos.forEach((todo) => TodoStore._data.set(todo.id, todo));
    TodoStore._orderSubscribers.forEach(callOrderSubscriber);
  },
};

export const useTodo = (id: string) => {
  const [todo, setTodo] = React.useState<Todo>(TodoStore.get(id));
  React.useEffect(() => {
    setTodo(TodoStore.get(id));
    return TodoStore.subscribe(id, setTodo);
  }, [id]);
  return {
    todo,
    toggle: async () => {
      const completed = !todo.completed;
      TodoStore.set({ ...todo, completed });
      await updateTodo({ data: { id, completed } });
    },
    edit: async (title: string) => {
      TodoStore.set({ ...todo, title });
      await updateTodo({ data: { id, title } });
    },
    remove: async () => {
      TodoStore.delete(id);
      await deleteTodo({ data: { id } });
    },
  };
};

export const useOrder = (orderFn: (todo: Todo[]) => Id[]) => {
  const [order, setOrder] = React.useState<Id[]>(TodoStore.getInOrder(orderFn));
  React.useEffect(() => {
    return TodoStore.subscribeToOrder(orderFn, (order) => {
      setOrder(order);
    });
  }, []);
  return order;
};

setTimeout(async () => {
  const stream = await getTodoStream();
  const reader = stream.getReader();

  while (true) {
    const result = await reader.read();
    if (result.done) break;
    const update = result.value!;
    switch (update.type) {
      case "one": {
        TodoStore.set(update.todo);
        break;
      }
      case "batch": {
        TodoStore.setMany(update.todos);
        break;
      }
      case "all": {
        TodoStore.replaceWith(update.todos);
        break;
      }
    }
  }
}, 10);
