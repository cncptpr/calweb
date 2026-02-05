import { createServerFn } from "@tanstack/react-start";
import * as caldav from "../server/caldavService";
import { distributor } from "@/server/distributeService";

export const getTodoStream = createServerFn().handler(() =>
  distributor.getSteam(),
);

export const listTodos = createServerFn({ method: "GET" }).handler(
  async () => await caldav.listTodos(),
);

export const addTodo = createServerFn({ method: "POST" })
  .inputValidator((input: { title: string }) => input)
  .handler(async ({ data }) => {
    const todo = await caldav.addTodo(data.title);
    distributor.enqueue({ type: "one", todo });
    return todo;
  });

export const updateTodo = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id: string; title?: string; completed?: boolean }) => input,
  )
  .handler(async ({ data }) => {
    const todo = await caldav.updateTodo(data.id, {
      title: data.title,
      completed: data.completed,
    });
    console.log("[DEBUG] Sending todo to clients", todo);
    distributor.enqueue({ type: "one", todo });
    return todo;
  });

export const deleteTodo = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await caldav.deleteTodo(data.id);
    return { id: data.id };
  });
