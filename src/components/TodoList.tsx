import { useTodos } from "@/data/todo-store";
import Todo from "@/components/Todo";

export function TodoList({
  onToggle,
  onEdit,
  onDelete,
}: {
  onToggle: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const todos = useTodos();
  const sorted = [
    ...todos.filter((t) => !t.completed),
    ...todos.filter((t) => t.completed),
  ];
  return (
    <div className="p-4 max-w-md mx-auto">
      {sorted.length === 0 ? (
        <div className="text-center text-gray-500 py-4">No todos yet</div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((todo) => (
            <Todo
              id={todo.id}
              key={todo.id}
              onToggle={() => onToggle(todo.id)}
              onEdit={(title) => onEdit(todo.id, title)}
              onDelete={() => onDelete(todo.id)}
            ></Todo>
          ))}
        </ul>
      )}
    </div>
  );
}
