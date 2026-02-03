import * as React from 'react';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { TodoList } from '../components/TodoList';
import { Todo } from '../types';
import { listTodos as caldavListTodos, addTodo as caldavAddTodo, updateTodo as caldavUpdateTodo, deleteTodo as caldavDeleteTodo } from '../server/caldavService';

export const listTodos = createServerFn({ method: 'GET' })
  .handler(async () => await caldavListTodos());

export const addTodo = createServerFn({ method: 'POST' })
  .inputValidator((input: { title: string }) => input)
  .handler(async ({ data }) => {
    return await caldavAddTodo(data.title);
  });

export const updateTodo = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string; title?: string; completed?: boolean }) => input)
  .handler(async ({ data }) => {
    return await caldavUpdateTodo(data.id, { title: data.title, completed: data.completed });
  });

export const deleteTodo = createServerFn({ method: 'POST' })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    await caldavDeleteTodo(data.id);
    return { id: data.id };
  });

export const Route = createFileRoute('/')({
  loader: async () => await listTodos(),
  component: TodoApp,
});

function TodoApp() {
  const router = useRouter();
  const loadedTodos = Route.useLoaderData() as Todo[];
  // Sorted: active on top, completed at bottom
  const sorted = [
    ...loadedTodos.filter(t => !t.completed),
    ...loadedTodos.filter(t => t.completed)
  ];

  async function handleToggle(id: string) {
    const todo = loadedTodos.find(t => t.id === id);
    if (todo) {
      await updateTodo({ data: { id, completed: !todo.completed } });
      router.invalidate();
    }
  }
  async function handleEdit(id: string, title: string) {
    await updateTodo({ data: { id, title } });
    router.invalidate();
  }
  async function handleDelete(id: string) {
    await deleteTodo({ data: { id } });
    router.invalidate();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="p-4 text-center text-xl font-bold">TODOs</header>
      <div className="flex justify-center pt-2">
        <AddTodo />
      </div>
      <TodoList todos={sorted} onToggle={handleToggle} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}

function AddTodo() {
  const router = useRouter();
  const [text, setText] = React.useState('');
  async function onAdd(title: string) {
    if (title.trim().length) {
      await addTodo({ data: { title: title.trim() } });
      setText('');
      router.invalidate();
    }
  }
  return (
    <form className="flex gap-2" onSubmit={e => {
      e.preventDefault();
      onAdd(text);
    }}>
      <input className="border rounded px-2" value={text} onChange={e => setText(e.target.value)} placeholder="Add todo" />
      <button className="bg-blue-500 text-white px-3 py-1 rounded" type="submit">Add</button>
    </form>
  );
}
