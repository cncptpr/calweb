import { Todo } from "ts-caldav";
import { COMPLETED_STATUS, Id, UNCOMPLETED_STATUS } from "@/data/todos";
import { callOrderSubscriber, getOrder, TodoStore } from "@/data/todos/store";
import { match } from "ts-pattern";

type ReplaceUndefinedWithNull<T> = {
  [K in keyof T]: undefined extends T[K]
    ? Exclude<T[K], undefined> | null
    : T[K];
};

/**
  Payload of a mutate `TodoSingleUpdate`.
  To be applied to a `Todo` via the `merge` function.

  `undefiend`/not provided -> field stays unchanged
  value -> field gets replaced
  `null` -> field get unset (to `undefined`)
*/
export type Change<T extends Todo> = Partial<
  ReplaceUndefinedWithNull<Omit<T, "uid">>
>;

export type TodoSingleUpdate =
  | { tag: "add"; summary: string }
  | { tag: "set"; todo: Todo }
  | { tag: "mutate"; uid: Id; change: Change<Todo> }
  | { tag: "delete"; uid: Id };

export type TodoUpdate =
  | { tag: "replace"; todos: Todo[] }
  | { tag: "batch"; updates: TodoSingleUpdate[] }
  | TodoSingleUpdate;

/**
  Applied a `Change` to a `Todo`.

  The field of the change are interpreted as follows:
  - value -> field gets replaced
  - `undefiend`/not provided -> field stays unchanged
  - `null` -> field get unset (to `undefined`)
*/
function merge<T extends Todo>(todo: T, change: Change<T>): T {
  const converted = {} as { [K in keyof T]?: T[K] | undefined };

  for (const key of Object.keys(change) as Array<keyof typeof change>) {
    const v = change[key];
    // map null -> undefined, keep other values (including explicit undefined) as-is
    (converted as { [K in keyof T]?: T[K] | undefined })[key] =
      v === null ? undefined : (v as unknown as T[typeof key]);
  }

  return { ...todo, ...converted } as T;
}

export function makeToggleMutate(uid: Id, isCompleted: boolean): TodoUpdate {
  return {
    tag: "mutate",
    uid,
    change: isCompleted
      ? {
          completed: new Date(),
          status: COMPLETED_STATUS,
        }
      : { completed: null, status: UNCOMPLETED_STATUS },
  };
}

/**
  Updates the `TodoStore` with the given `TodoUpdate`, and notifies all relevant subsribers of the store.

  Returns:
  - updated: All `Todo`s that got updated.
  - add: Summaries for `Todo`s that need creating
  - removed: `Id`'s for `Todo`s that where removed

  The return values are expected to be applied to the CalDAV server by the backend.
  The replace update returns empty.
*/
export function updateStore(
  store: TodoStore,
  update: TodoUpdate,
): { updated: Todo[]; add: string[]; removed: Id[] } {
  console.log("update():", update);
  const changes = {
    updated: new Map<Id, Todo>(),
    add: new Set<string>(),
    removed: new Set<Id>(),
  };
  function rec(store: TodoStore, update: TodoUpdate) {
    match(update)
      .with({ tag: "replace" }, (update) => {
        store._data.clear();
        update.todos.forEach((t) => {
          store._data.set(t.uid, t);
        });
        store._orderSubscribers.forEach((s) => callOrderSubscriber(store, s));
      })
      .with({ tag: "batch" }, (update) =>
        update.updates.forEach((u) => rec(store, u)),
      )
      .with({ tag: "set" }, (update) => {
        store._data.set(update.todo.uid, update.todo);
        store._subscribers
          .get(update.todo.uid)
          ?.forEach((cb) => cb(update.todo));
        changes.updated.set(update.todo.uid, update.todo);
      })
      .with({ tag: "mutate" }, (update) => {
        const todo = store._data.get(update.uid);
        if (!todo) {
          console.log("[Error] Mutation of not exisiting todo! Ignoring...");
          return;
        }
        const updatedTodo = merge(todo, update.change);
        store._data.set(update.uid, updatedTodo);
        store._subscribers
          .get(updatedTodo.uid)
          ?.forEach((cb) => cb(updatedTodo));
        changes.updated.set(update.uid, updatedTodo);
      })
      .with({ tag: "delete" }, (update) => {
        store._data.delete(update.uid);
        changes.removed.add(update.uid);
      })
      .with({ tag: "add" }, (update) => {
        changes.add.add(update.summary);
      })
      .exhaustive();
  }
  rec(store, update);
  store._orderSubscribers.forEach((s) => {
    const order = getOrder(store, s.orderFn);
    s.lastOrder = order;
    s.cb(order);
  });
  return {
    updated: Array.from(changes.updated.values()),
    add: Array.from(changes.add.values()),
    removed: Array.from(changes.removed.values()),
  };
}
