import { createStore } from "@/data/todos/store";
import { createIsomorphicFn } from "@tanstack/react-start";
import { fetchTodos, getTodoStream } from "@/data/todos/api";
import { updateStore } from "@/data/todos/update";
import { Listener } from "@/server/distributeService";

export const listeners = new Set<Listener>();

export const todoStore = createStore([]);

createIsomorphicFn().client(async () => {
  fetchTodos().then((todos) =>
    updateStore(todoStore, { tag: "replace", todos }),
  );
  const stream = await getTodoStream();
  const reader = stream.getReader();

  while (true) {
    const result = await reader.read();
    if (result.done) break;
    const update = result.value!;
    updateStore(todoStore, update);
  }
})();
