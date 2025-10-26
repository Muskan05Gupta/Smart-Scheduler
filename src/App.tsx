import React, { useState } from 'react';
import './App.css'; // Import the component-specific styles

// --- CONFIGURATION ---
// 1. CHECK YOUR BACKEND PORT!
//    Run your 'SmartScheduler.Api' project. The terminal will show a URL like:
//    'Now listening on: http://localhost:5123'
// 2. UPDATE THE URL BELOW to match that port.
const API_BASE_URL = 'http://localhost:5206'; // Example: 'http://localhost:5123' or 'https://localhost:7123'
// ---------------------

// Define the types for our state and API
interface Task {
  id: number;
  title: string;
  estimatedHours: number;
  dueDate: string;
  dependencies: string[];
}

// This matches the C# TaskInput DTO
interface ApiTaskInput {
  title: string;
  estimatedHours: number;
  dueDate: string;
  dependencies: string[];
}

interface ScheduleRequest {
  tasks: ApiTaskInput[];
}

interface ScheduleResponse {
  recommendedOrder: string[];
}

interface ScheduleErrorResponse {
  error: string;
}

export default function App() {
  // State for the form
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newEstimatedHours, setNewEstimatedHours] = useState(8); // Default to 8
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [newDependencies, setNewDependencies] = useState('');

  // State for the API response
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduledOrder, setScheduledOrder] = useState<string[]>([]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) {
      setError('Task title cannot be empty.');
      return;
    }
    if (tasks.find(t => t.title.toLowerCase() === newTaskTitle.toLowerCase())) {
        setError('A task with this title already exists.');
        return;
    }

    // Convert comma-separated string to a clean array
    const dependenciesArray = newDependencies
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0); // Remove any empty strings

    const newTask: Task = {
      id: Date.now(),
      title: newTaskTitle,
      estimatedHours: newEstimatedHours,
      dueDate: newDueDate,
      dependencies: dependenciesArray,
    };

    setTasks([...tasks, newTask]);

    // Reset form
    setNewTaskTitle('');
    setNewDependencies('');
    setNewEstimatedHours(8);
    setNewDueDate(new Date().toISOString().split('T')[0]);
    setError(null);
  };

  const handleRemoveTask = (id: number) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const handleSchedule = async () => {
    setLoading(true);
    setError(null);
    setScheduledOrder([]);

    // 1. Convert our React state `Task[]` to the `ApiTaskInput[]`
    const apiTasks: ApiTaskInput[] = tasks.map(task => ({
      title: task.title,
      estimatedHours: task.estimatedHours,
      dueDate: task.dueDate,
      dependencies: task.dependencies,
    }));

    const payload: ScheduleRequest = {
      tasks: apiTasks,
    };

    try {
      // 2. Call the API
      // This fetch URL matches the API route
      const response = await fetch(`${API_BASE_URL}/api/v1/projects/1/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // 3. Handle the response
      if (!response.ok) {
        // Try to parse the error message from the API (for 400 Bad Request)
        const errorData: ScheduleErrorResponse = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result: ScheduleResponse = await response.json();
      setScheduledOrder(result.recommendedOrder);

    } catch (err: any) {
      // Handle fetch errors (e.g., network down) or thrown errors
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Smart Scheduler</h1>
        <p className="app-subtitle">Test UI for the Task Scheduling API</p>
      </header>

      <div className="main-grid">
        
        {/* Left Column: Task Input */}
        <div className="card">
          <h2 className="card-title">1. Add Tasks</h2>
          
          <form onSubmit={handleAddTask} className="form">
            <div className="form-group">
              <label htmlFor="taskTitle" className="form-label">
                Task Title
              </label>
              <input
                id="taskTitle"
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g., Design API"
                className="form-input"
              />
            </div>

            {/* Grid for Hours and Date */}
            <div className="form-input-grid">
              <div className="form-group">
                <label htmlFor="estimatedHours" className="form-label">
                  Est. Hours
                </label>
                <input
                  id="estimatedHours"
                  type="number"
                  value={newEstimatedHours}
                  onChange={(e) => setNewEstimatedHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="form-input-number"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="dueDate" className="form-label">
                  Due Date
                </label>
                <input
                  id="dueDate"
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="form-input-date"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="dependencies" className="form-label">
                Dependencies
              </label>
              <input
                id="dependencies"
                type="text"
                value={newDependencies}
                onChange={(e) => setNewDependencies(e.target.value)}
                placeholder="e.g., Task A, Task B"
                className="form-input"
              />
              <p className="form-help-text">
                Separate multiple dependencies with a comma.
              </p>
            </div>

            <button
              type="submit"
              className="button button-primary"
            >
              Add Task
            </button>
          </form>
        </div>

        {/* Right Column: Payload & Results */}
        <div className="stack">
          
          {/* Current Tasks List */}
          <div className="card">
            <h2 className="card-title">2. Current Tasks</h2>
            {tasks.length === 0 ? (
              <p className="task-list-empty">No tasks added yet.</p>
            ) : (
              <ul className="task-list">
                {tasks.map(task => (
                  <li key={task.id} className="task-item">
                    <div className="task-item-details">
                      <span className="task-item-title">{task.title}</span>
                       <p className="task-item-meta">
                        {task.estimatedHours} hrs | Due: {task.dueDate}
                      </p>
                      {task.dependencies.length > 0 && (
                        <p className="task-item-deps">
                          Depends on: {task.dependencies.join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveTask(task.id)}
                      className="task-item-remove-button"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Scheduler Controls & Results */}
          <div className="card">
            <h2 className="card-title">3. Get Schedule</h2>
            <button
              onClick={handleSchedule}
              disabled={loading || tasks.length === 0}
              className="button button-success"
            >
              {loading ? 'Generating...' : 'Generate Recommended Schedule'}
            </button>

            <div style={{ marginTop: '1.5rem' }}>
              {/* Error Message */}
              {error && (
                <div className="alert-box alert-error">
                  <h4 className="alert-box-title">Error</h4>
                  <p>{error}</p>
                </div>
              )}
              
              {/* Success Message */}
              {scheduledOrder.length > 0 && (
                <div className="alert-box alert-success">
                  <h4 className="alert-box-title">Recommended Order:</h4>
                  <ol className="results-list">
                    {scheduledOrder.map((title, index) => (
                      <li key={index} className="results-list-item">
                        {title}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}