import { TodoUpdate } from "@/data/todos/update";

export type Listener = { handler?: (update: TodoUpdate) => void };

export function distibluteUpdate(listeners: Set<Listener>, update: TodoUpdate) {
  listeners.forEach((l) => l.handler?.(update));
}

export function getSteam(listeners: Set<Listener>): ReadableStream {
  console.log("[DEBUG] creating Distributor");
  const listener: Listener = {};
  listeners.add(listener);
  const stream = new ReadableStream<TodoUpdate>({
    pull(controller) {
      listener.handler = (update) => {
        controller.enqueue(update);
      };
    },
    cancel() {
      listeners.delete(listener);
      console.log("Removed Listener");
    },
  });
  return stream;
}
