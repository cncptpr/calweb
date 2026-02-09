import React from "react";
import * as Todo from "@/data/todos";

export const todoStore = Todo.createStore([]);
export const TodoStoreContext = React.createContext<Todo.TodoStore>(todoStore);

export function useTodoStore() {
  return React.useContext(TodoStoreContext);
}

Todo.fetchTodos().then((todos) =>
  Todo.serverUpdate(todoStore, { type: "replace", todos }),
);
setTimeout(async () => {
  const stream = await Todo.getTodoStream();
  const reader = stream.getReader();

  while (true) {
    const result = await reader.read();
    if (result.done) break;
    const update = result.value!;
    Todo.serverUpdate(todoStore, update);
  }
}, 0);
