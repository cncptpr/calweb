import TodoItem from "@/components/TodoItem";
import { useOrder, useTodoStore } from "@/data/todos/react";

export function TodoList() {
  const store = useTodoStore()
  const order = useOrder(store, (todos) =>
    [
      ...todos.filter((t) => !t.completed),
      ...todos.filter((t) => t.completed),
    ].map((todo) => todo.uid),
  );
  return (
    <div className="p-4 max-w-md mx-auto">
      {order.length === 0 ? (
        <div className="text-center text-gray-500 py-4">No todos yet</div>
      ) : (
        <ul className="space-y-2">
          {order.map((id) => (
            <TodoItem id={id} key={id}></TodoItem>
          ))}
        </ul>
      )}
    </div>
  );
}
