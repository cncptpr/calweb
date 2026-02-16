import { Todo } from "ts-caldav";

export type Id = string;

export const COMPLETED_STATUS = "COMPLETED";
export const UNCOMPLETED_STATUS = "NEEDS-ACTION";

export function isCompleted(todo: Todo): boolean {
  return todo.status ? todo.status === COMPLETED_STATUS : !!todo.completed;
}
