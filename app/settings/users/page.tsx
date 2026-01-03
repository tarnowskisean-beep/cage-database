'use client';

import { useState, useEffect } from 'react';

interface User {
    UserID: number;
    Username: string;
    Email: string;
    Role: string;
    Initials: string;
    CreatedAt: string;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    // New User State
    const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'ClientUser' });
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) setUsers(await res.json());
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setFormData({ username: '', email: '', password: '', role: 'ClientUser' });
                setShowAddForm(false);
                fetchUsers();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to create user');
            }
        } catch (e) { setError('Submisson failed'); }
    };

    const handleRoleUpdate = async (userId: number, newRole: string) => {
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) fetchUsers();
        } catch (e) { alert('Failed to update role'); }
    };

    const handleDelete = async (userId: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            if (res.ok) fetchUsers();
        } catch (e) { alert('Failed to delete'); }
    }

    return (
        <div style={{ padding: '1rem', maxWidth: '1000px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem' }}>Users</h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                >
                    {showAddForm ? 'Cancel' : 'Add User'}
                </button>
            </div>

            {showAddForm && (
                <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Create New User</h3>
                    {error && <div style={{ color: 'var(--color-error)', marginBottom: '1rem', fontSize: '0.8rem' }}>{error}</div>}
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', maxWidth: '400px' }}>
                        <input className="input-field" placeholder="Username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                        <input className="input-field" type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                        <input className="input-field" type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                        <select className="input-field" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                            <option value="Admin">Admin</option>
                            <option value="Clerk">Clerk</option>
                            <option value="ClientUser">ClientUser</option>
                        </select>
                        <button type="submit" className="btn-primary">Create User</button>
                    </form>
                </div>
            )}

            <div className="glass-panel">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.UserID}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-primary)',
                                            color: 'var(--color-primary-text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.75rem', fontWeight: 'bold'
                                        }}>
                                            {user.Initials}
                                        </div>
                                        {user.Username}
                                    </div>
                                </td>
                                <td>{user.Email}</td>
                                <td>
                                    <select
                                        value={user.Role}
                                        onChange={(e) => handleRoleUpdate(user.UserID, e.target.value)}
                                        style={{
                                            background: 'transparent', color: 'var(--color-text-main)', border: '1px solid var(--color-border)',
                                            padding: '0.25rem', borderRadius: '4px'
                                        }}
                                    >
                                        <option value="Admin">Admin</option>
                                        <option value="Clerk">Clerk</option>
                                        <option value="ClientUser">ClientUser</option>
                                    </select>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    {new Date(user.CreatedAt).toLocaleDateString()}
                                </td>
                                <td>
                                    <button onClick={() => handleDelete(user.UserID)} style={{ color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
