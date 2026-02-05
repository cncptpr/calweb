export interface Todo {
  id: string;
  title: string;
  completed: boolean;
}

export type TodoUpdate =
  | { type: "one"; todo: Todo }
  | { type: "batch" | "all"; todos: Todo[] };
