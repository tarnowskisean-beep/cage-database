
'use client';

import { useState, useEffect } from 'react';

export default function TasksSection({ donorId }: { donorId: string }) {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [adding, setAdding] = useState(false);

    const fetchTasks = async () => {
        try {
            const res = await fetch(`/api/people/${donorId}/tasks`);
            const data = await res.json();
            setTasks(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [donorId]);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskDesc.trim()) return;
        setAdding(true);
        try {
            await fetch(`/api/people/${donorId}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Description: newTaskDesc,
                    DueDate: newTaskDate || null
                })
            });
            setNewTaskDesc('');
            setNewTaskDate('');
            fetchTasks();
        } catch (e) {
            alert('Failed to add task');
        } finally {
            setAdding(false);
        }
    };

    const toggleTask = async (taskId: number, currentStatus: boolean) => {
        try {
            // Optimistic update
            setTasks(prev => prev.map(t => t.TaskID === taskId ? { ...t, IsCompleted: !currentStatus } : t));

            await fetch(`/api/people/${donorId}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ IsCompleted: !currentStatus })
            });
            fetchTasks(); // Refresh to get sorted order
        } catch (e) {
            fetchTasks(); // Revert
            alert('Failed to update task');
        }
    };

    const deleteTask = async (taskId: number) => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        try {
            await fetch(`/api/people/${donorId}/tasks/${taskId}`, { method: 'DELETE' });
            fetchTasks();
        } catch (e) {
            alert('Failed to delete task');
        }
    };

    return (
        <div className="glass-panel p-6">
            <h3 className="text-lg font-display text-white mb-4">Tasks & Reminders</h3>

            <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-2 mb-6">
                <input
                    type="text"
                    placeholder="New task..."
                    className="input-field flex-1"
                    value={newTaskDesc}
                    onChange={e => setNewTaskDesc(e.target.value)}
                    required
                />
                <input
                    type="date"
                    className="input-field w-full md:w-auto"
                    value={newTaskDate}
                    onChange={e => setNewTaskDate(e.target.value)}
                />
                <button type="submit" disabled={adding} className="btn-primary whitespace-nowrap">
                    {adding ? 'Adding...' : '+ Add Task'}
                </button>
            </form>

            <div className="space-y-2">
                {tasks.map(task => (
                    <div key={task.TaskID} className={`flex items-start gap-3 p-3 rounded border transition-all ${task.IsCompleted ? 'bg-zinc-900/50 border-zinc-800 opacity-60' : 'bg-white/5 border-white/10'}`}>
                        <input
                            type="checkbox"
                            checked={task.IsCompleted}
                            onChange={() => toggleTask(task.TaskID, task.IsCompleted)}
                            className="mt-1 w-4 h-4 rounded border-gray-500 text-emerald-500 focus:ring-emerald-500 bg-transparent"
                        />
                        <div className="flex-1">
                            <p className={`text-sm ${task.IsCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>{task.Description}</p>
                            <div className="flex gap-4 mt-1 text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                {task.DueDate && (
                                    <span className={new Date(task.DueDate) < new Date() && !task.IsCompleted ? 'text-red-400' : ''}>
                                        Due {new Date(task.DueDate).toLocaleDateString()}
                                    </span>
                                )}
                                {task.AssignedToName && <span>Assigned: {task.AssignedToName}</span>}
                            </div>
                        </div>
                        <button onClick={() => deleteTask(task.TaskID)} className="text-gray-500 hover:text-red-400">
                            ✕
                        </button>
                    </div>
                ))}
                {!loading && tasks.length === 0 && (
                    <p className="text-gray-500 italic text-sm">No tasks assigned.</p>
                )}
            </div>
        </div>
    );
}
