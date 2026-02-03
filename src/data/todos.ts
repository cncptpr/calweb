import { createServerFn } from "@tanstack/react-start";
import {
  listTodos as caldavListTodos,
  addTodo as caldavAddTodo,
  updateTodo as caldavUpdateTodo,
  deleteTodo as caldavDeleteTodo,
} from "../server/caldavService";

export const listTodos = createServerFn({ method: "GET" }).handler(
  async () => await caldavListTodos(),
);

export const addTodo = createServerFn({ method: "POST" })
  .inputValidator((input: { title: string }) => input)
  .handler(async ({ data }) => {
    return await caldavAddTodo(data.title);
  });

export const updateTodo = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id: string; title?: string; completed?: boolean }) => input,
  )
  .handler(async ({ data }) => {
    return await caldavUpdateTodo(data.id, {
      title: data.title,
      completed: data.completed,
    });
  });

export const deleteTodo = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await caldavDeleteTodo(data.id);
    return { id: data.id };
  });
