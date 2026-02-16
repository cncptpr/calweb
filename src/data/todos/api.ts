import { createClientOnlyFn, createServerFn } from "@tanstack/react-start";
import * as caldav from "@/server/caldavService";
import {
  distibluteUpdate,
  getSteam as getStream,
} from "@/server/distributeService";
import { TodoSingleUpdate, TodoUpdate, updateStore } from "@/data/todos/update";
import { TodoStore } from "@/data/todos/store";
import { todoStore, listeners } from "./instances";

export const getTodoStream = createServerFn().handler(() => {
  console.log("Stream requested");
  return getStream(listeners);
});

export const fetchTodos = createServerFn().handler(async () => {
  const todos = await caldav.fetchTodos();
  updateStore(todoStore, { tag: "replace", todos });
  return todos;
});

export const updateAndSend = createClientOnlyFn(
  async (store: TodoStore, todoUpdate: TodoUpdate) => {
    updateStore(store, todoUpdate);
    sendUpdate({ data: todoUpdate });
  },
);

export const sendUpdate = createServerFn()
  .inputValidator((u: TodoUpdate) => u)
  .handler(async ({ data: todoUpdate }) => {
    distibluteUpdate(listeners, todoUpdate);
    const { updated, add, removed } = updateStore(todoStore, todoUpdate);
    const addReq = Promise.all(
      add.map((summary) => caldav.createTodo(summary)),
    );
    const updatedReq = Promise.all(
      updated.map((todo) => caldav.updateTodo(todo)),
    );
    const removedReq = Promise.all(
      removed.map((uid) => caldav.deleteTodo(uid)),
    );
    const addedTodoUpdates: TodoSingleUpdate[] = (await addReq).map((todo) => ({
      tag: "set",
      todo,
    }));
    const updateTodoUpdates: TodoSingleUpdate[] = (await updatedReq).map(
      (res) => ({
        tag: "mutate",
        uid: res.uid,
        change: {
          etag: res.etag,
          href: res.href,
        },
      }),
    );
    const addedTodoUpdate: TodoUpdate = {
      tag: "batch",
      updates: [...addedTodoUpdates, ...updateTodoUpdates],
    };
    if (addedTodoUpdate.updates.length > 0) {
      distibluteUpdate(listeners, addedTodoUpdate);
      updateStore(todoStore, addedTodoUpdate);
    }
    await removedReq;
  });
