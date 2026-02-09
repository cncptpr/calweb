import React from "react";
import {
  get,
  getOrder,
  Id,
  optimisicUpdate,
  subscribe,
  Todo,
  TodoStore,
} from "./todos";
import { subscribeToOrder } from "./subscribeToOrder";

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
      await optimisicUpdate(store, {
        type: "mutate",
        id,
        change: { completed },
      });
    },
    edit: async (title: string) => {
      await optimisicUpdate(store, { type: "mutate", id, change: { title } });
    },
    remove: async () => {
      await optimisicUpdate(store, { type: "delete", id });
    },
  };
}

export function useOrder(store: TodoStore, orderFn: (todo: Todo[]) => Id[]) {
  const [order, setOrder] = React.useState<Id[]>(getOrder(store, orderFn));
  React.useEffect(() => subscribeToOrder(store, orderFn, setOrder), []);
  return order;
}
