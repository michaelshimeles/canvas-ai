import React, { useState } from 'react';
import TodoInput from './components/TodoInput';
import TodoList from './components/TodoList';

function App() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text) => {
    const newTodo = {
      id: Date.now(),
      text,
      completed: false,
    };
    setTodos([...todos, newTodo]);
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const completedCount = todos.filter(todo => todo.completed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">My Tasks</h1>
          <p className="text-gray-600">
            {completedCount} of {todos.length} tasks completed
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Input Section */}
          <TodoInput onAdd={addTodo} />

          {/* Todo List Section */}
          {todos.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 text-lg">No tasks yet. Add one to get started! 🚀</p>
            </div>
          ) : (
            <TodoList
              todos={todos}
              onDelete={deleteTodo}
              onToggle={toggleTodo}
            />
          )}
        </div>

        {/* Footer Stats */}
        {todos.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {todos.filter(t => !t.completed).length} active · {completedCount} completed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;