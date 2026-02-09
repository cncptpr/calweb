import React from "react";
import {
  deleteTodo,
  get,
  getOrder,
  Id,
  remove,
  subscribe,
  upda
  subscribeToOrder,
  Todo,
  TodoStore,
  updateTodo,
} from "./todos";

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
