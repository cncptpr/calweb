import { useOrder } from "@/data/todo-store";
import Todo from "@/components/Todo";

export function TodoList() {
  const order = useOrder((todos) =>
    [
      ...todos.filter((t) => !t.completed),
      ...todos.filter((t) => t.completed),
    ].map((todo) => todo.id),
  );
  return (
    <div className="p-4 max-w-md mx-auto">
      {order.length === 0 ? (
        <div className="text-center text-gray-500 py-4">No todos yet</div>
      ) : (
        <ul className="space-y-2">
          {order.map((id) => (
            <Todo id={id} key={id}></Todo>
          ))}
        </ul>
      )}
    </div>
  );
}
