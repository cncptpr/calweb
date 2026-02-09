import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TodoList } from "@/components/TodoList";
import { useTodoStore } from "@/data/store";
import { generateId, optimisicUpdate } from "@/data/todos";

export const Route = createFileRoute("/")({
  component: TodoApp,
});

function TodoApp() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="p-4 text-center text-xl font-bold">TODOs</header>
      <TodoList />
      <div className="mt-auto flex justify-center p-4 sticky bottom-0 bg-white">
        <AddTodo />
      </div>
    </div>
  );
}

function AddTodo() {
  const store = useTodoStore()
  const [text, setText] = React.useState("");
  async function onAdd(title: string) {
    if (title.trim().length) {
      optimisicUpdate(store, {type:"add", todo: {id: generateId(), title: title.trim(), completed:false}})
      setText("");
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
