import React from 'react';

function TodoItem({ todo, onDelete, onToggle }) {
  return (
    <li className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="w-5 h-5 text-blue-500 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
        />
        <span
          className={`flex-1 text-lg transition-all ${
            todo.completed
              ? 'line-through text-gray-400'
              : 'text-gray-800'
          }`}
        >
          {todo.text}
        </span>
        <button
          onClick={() => onDelete(todo.id)}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all transform hover:scale-105 active:scale-95 text-sm font-medium"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export default TodoItem;