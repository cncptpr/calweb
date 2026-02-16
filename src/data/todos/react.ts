import React from "react";
import {
  get,
  getOrder,
  subscribe,
  subscribeToOrder,
  TodoStore,
} from "@/data/todos/store";
import { todoStore } from "@/data/todos/instances";
import { Todo } from "ts-caldav";
import { Id, isCompleted } from ".";
import { updateAndSend } from "./api";
import { makeToggleMutate } from "./update";

export const TodoStoreContext = React.createContext<TodoStore>(todoStore);

export function useTodoStore() {
  return React.useContext(TodoStoreContext);
}
export function useTodo(store: TodoStore, uid: string) {
  const [todo, setTodo] = React.useState<Todo>(get(store, uid)!);
  React.useEffect(() => {
    setTodo(get(store, uid)!);
    return subscribe(store, uid, setTodo);
  }, [uid]);
  return {
    todo,
    toggle: async () => {
      const update = makeToggleMutate(uid, !isCompleted(todo));
      updateAndSend(store, update);
    },
    edit: async (summary: string) => {
      updateAndSend(store, { tag: "mutate", uid, change: { summary } });
    },
    remove: async () => {
      updateAndSend(store, { tag: "delete", uid });
    },
  };
}

export function useOrder(store: TodoStore, orderFn: (todo: Todo[]) => Id[]) {
  const [order, setOrder] = React.useState<Id[]>(getOrder(store, orderFn));
  React.useEffect(() => subscribeToOrder(store, orderFn, setOrder), []);
  return order;
}
