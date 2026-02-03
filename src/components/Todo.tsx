import { useTodo } from "@/data/todo-store";

export default function Todo(props: {
  id: string;
  onToggle: () => void;
  onEdit: (title: string) => void;
  onDelete: () => void;
}) {
  const todo = useTodo(props.id);
  return (
    <li
      key={todo.id}
      className="flex items-center justify-between bg-white p-3 rounded shadow"
    >
      <button
        onClick={() => props.onToggle()}
        className="mr-2"
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
      >
        <span
          className={`w-5 h-5 border rounded-full flex items-center justify-center ${todo.completed ? "bg-green-400 border-green-400" : "border-gray-400"}`}
        >
          {todo.completed ? <span className="text-white">✓</span> : ""}
        </span>
      </button>
      <span
        className={`flex-1 ${todo.completed ? "line-through text-gray-400" : "text-gray-900"} text-lg`}
      >
        {todo.title}
      </span>
      <button
        className="ml-2 text-blue-500 hover:text-blue-700 px-2 py-1"
        onClick={() => {
          const newTitle = prompt("Edit todo:", todo.title);
          if (newTitle !== null && newTitle !== todo.title)
            props.onEdit(newTitle);
        }}
        aria-label="Edit"
      >
        Edit
      </button>
      <button
        className="ml-2 text-red-500 hover:text-red-700 px-2 py-1"
        onClick={() => {
          if (confirm("Delete todo?")) props.onDelete();
        }}
        aria-label="Delete"
      >
        Del
      </button>
    </li>
  );
}
