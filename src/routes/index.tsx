import * as React from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { addTodo, deleteTodo, listTodos, updateTodo } from "@/data/todos";
import { TodoList } from "@/components/TodoList";
import { TodoStore, useOrder } from "@/data/todo-store";

export const Route = createFileRoute("/")({
  component: TodoApp,
});

function TodoApp() {


  React.useEffect(() => {
    console.log("Filling Store");
    listTodos().then(TodoStore.replaceWith);
  }, []);
  async function handleToggle(id: string) {
    console.log("Toggling ", id);
    const todo = TodoStore.get(id);
    if (!todo) return;
    todo.completed = !todo.completed;
    TodoStore.set(todo);
    await updateTodo({ data: { id, completed: todo.completed } });
  }
  async function handleEdit(id: string, title: string) {
    const todo = TodoStore.get(id);
    if (!todo) return;
    todo.title = title;
    TodoStore.set(todo);
    await updateTodo({ data: { id, title } });
  }
  async function handleDelete(id: string) {
    TodoStore.delete(id);
    await deleteTodo({ data: { id } });
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="p-4 text-center text-xl font-bold">TODOs</header>
      <TodoList
        onToggle={handleToggle}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <div className="mt-auto flex justify-center p-4 sticky bottom-0 bg-white">
        <AddTodo />
      </div>
    </div>
  );
}

function AddTodo() {
  const router = useRouter();
  const [text, setText] = React.useState("");
  async function onAdd(title: string) {
    if (title.trim().length) {
      await addTodo({ data: { title: title.trim() } });
      setText("");
      router.invalidate();
    }
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(text);
      }}
    >
      <input
        className="border rounded px-2"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add todo"
      />
      <button
        className="bg-blue-500 text-white px-3 py-1 rounded"
        type="submit"
      >
        Add
      </button>
    </form>
  );
}
