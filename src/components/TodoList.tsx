import { Todo } from '../types'

export function TodoList({ todos, onToggle, onEdit, onDelete }: {
  todos: Todo[],
  onToggle: (id: string) => void,
  onEdit: (id: string, title: string) => void,
  onDelete: (id: string) => void
}) {
  return (
    <div className="p-4 max-w-md mx-auto">
      {todos.length === 0 ? (
        <div className="text-center text-gray-500 py-4">No todos yet</div>
      ) : (
        <ul className="space-y-2">
          {todos.map(todo => (
            <li key={todo.id} className="flex items-center justify-between bg-white p-3 rounded shadow">
              <button
                onClick={() => onToggle(todo.id)}
                className="mr-2"
                aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
              >
                <span className={`w-5 h-5 border rounded-full flex items-center justify-center ${todo.completed ? 'bg-green-400 border-green-400' : 'border-gray-400'}`}>
                  {todo.completed ? <span className="text-white">✓</span> : ''}
                </span>
              </button>
              <span className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-gray-900'} text-lg`}>
                {todo.title}
              </span>
              <button
                className="ml-2 text-blue-500 hover:text-blue-700 px-2 py-1"
                onClick={() => {
                  const newTitle = prompt('Edit todo:', todo.title)
                  if (newTitle !== null && newTitle !== todo.title) onEdit(todo.id, newTitle)
                }}
                aria-label="Edit"
              >Edit</button>
              <button
                className="ml-2 text-red-500 hover:text-red-700 px-2 py-1"
                onClick={() => { if (confirm('Delete todo?')) onDelete(todo.id) }}
                aria-label="Delete"
              >Del</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
