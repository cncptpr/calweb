import * as Todo from "@/data/todos";
import { todoStore } from "@/data/store";
import { createServerFn } from "@tanstack/react-start";
import { listTodos } from "./caldavService";

export const sendUpdate = createServerFn()
  .inputValidator((update: Todo.TodoUpdate) => update)
  .handler(async ({ data }) => {
    Todo.update(todoStore, data);

    const unsubscribe = Todo.subscribe(todoStore, ()=>);
  });

export function getSteam(): ReadableStream {
  console.log("[DEBUG] creating Distributor");
  const listener = Todo.addListener(todoStore);
  const stream = new ReadableStream<Todo.TodoUpdate>({
    pull(controller) {
      listener.handler = (update) => {
        controller.enqueue(update);
      };
    },
    cancel() {
      Todo.removeListener(todoStore, listener);
      console.log("Removed Listener");
    },
  });
  return stream;
}
