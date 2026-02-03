import { Todo } from "@/types";
import React from "react";

export const TodoStore = {
  _data: new Map<string, Todo>(),
  _subscribers: new Map<string, Set<(todo: Todo) => void>>(),
  _listeners: new Set<(todos: Todo[]) => void>(),
  has: (id: string) => TodoStore._data.has(id),
  get: (id: string) => ({ ...TodoStore._data.get(id)! }),
  subscribe: (id: string, cb: (todo: Todo) => void): (() => void) => {
    if (!TodoStore._subscribers.has(id)) {
      TodoStore._subscribers.set(id, new Set());
    }
    TodoStore._subscribers.get(id)?.add(cb);
    return () => {
      TodoStore._subscribers.get(id)?.delete(cb);
    };
  },
  list: () => Array.from(TodoStore._data.values()).map((todo) => ({ ...todo })),
  listenAll: (cb: (todos: Todo[]) => void): (() => void) => {
    TodoStore._listeners.add(cb);
    return () => {
      TodoStore._listeners.delete(cb);
    };
  },
  set: (todo: Todo) => {
    const storedTodo = TodoStore.get(todo.id);
    TodoStore._data.set(todo.id, todo);
    if (storedTodo === undefined || todo.completed !== storedTodo.completed) {
      TodoStore._listeners.forEach((cb) => cb(TodoStore.list()));
    }
    TodoStore._subscribers
      .get(todo.id)
      ?.forEach((cb) => cb(TodoStore.get(todo.id)));
  },
  setMany: (todos: Todo[]) => {
    todos.forEach((todo) => TodoStore.set(todo));
  },
  delete: (id: string) => {
    if (TodoStore._data.has(id)) {
      TodoStore._data.delete(id);
      TodoStore._listeners.forEach((cb) => cb(TodoStore.list()));
    }
  },
  replaceWith: (todos: Todo[]) => {
    TodoStore._data.clear();
    todos.forEach((todo) => TodoStore._data.set(todo.id, todo));
    TodoStore._listeners.forEach((cb) => cb(TodoStore.list()));
  },
};

export const useTodo = (id: string) => {
  const [todo, setTodo] = React.useState<Todo>(TodoStore.get(id)!);
  React.useEffect(() => {
    return TodoStore.subscribe(id, setTodo);
  }, [id]);
  return todo;
};

export const useTodos = () => {
  const [todos, setTodos] = React.useState<Todo[]>(TodoStore.list());
  React.useEffect(() => {
    return TodoStore.listenAll((todos) => {
      console.log("listenAll Called");
      setTodos(todos);
    });
  }, []);
  return todos;
};
