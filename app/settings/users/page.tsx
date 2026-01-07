/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

type User = {
    UserID: number;
    Username: string;
    Email: string;
    Role: 'Admin' | 'Clerk' | 'ClientUser';
    IsActive: boolean;
    ReceiveFlaggedAlerts: boolean;
    CreatedAt: string;
};

export default function UsersPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                setUsers(await res.json());
                setLoading(false);
            } else {
                if (res.status === 401 || res.status === 403) {
                    setUsers([]); // Clear users
                    alert('Access Denied: You do not have permission to view users. (Admin Role Required)');
                }
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDeactivate = async (id: number) => {
        if (!confirm('Are you sure you want to deactivate this user?')) return;
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchUsers();
            } else {
                alert('Failed to deactivate');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleReactivate = async (id: number) => {
        try {
            const res = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: true })
            });
            if (res.ok) fetchUsers();
        } catch (err) { console.error(err); }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>User Management</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>View and manage team access.</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => { setEditingUser(null); setShowModal(true); }}
                >
                    + Add New User
                </button>
            </div>

            <div className="glass-panel" style={{ padding: '0' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center' }}>Loading...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center' }}>No users found.</td></tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.UserID} style={{ opacity: user.IsActive ? 1 : 0.5 }}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{user.Username}</div>
                                    </td>
                                    <td>{user.Email}</td>
                                    <td>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem',
                                            background: user.Role === 'Admin' ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)',
                                            color: user.Role === 'Admin' ? 'var(--color-primary-text)' : 'inherit'
                                        }}>
                                            {user.Role}
                                        </span>
                                    </td>
                                    <td>
                                        {user.IsActive ? (
                                            <span style={{ color: '#4ade80' }}>Active</span>
                                        ) : (
                                            <span style={{ color: 'var(--color-text-muted)' }}>Inactive</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => { setEditingUser(user); setShowModal(true); }}
                                                style={{ border: '1px solid var(--color-border)', background: 'transparent', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                                            >
                                                Edit
                                            </button>

                                            {user.IsActive ? (
                                                <button
                                                    onClick={() => handleDeactivate(user.UserID)}
                                                    style={{ border: 'none', background: 'transparent', padding: '4px 8px', cursor: 'pointer', color: 'var(--color-error)' }}
                                                    disabled={String(user.UserID) === (session?.user as any)?.id}
                                                >
                                                    Deactivate
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleReactivate(user.UserID)}
                                                    style={{ border: 'none', background: 'transparent', padding: '4px 8px', cursor: 'pointer', color: '#4ade80' }}
                                                >
                                                    Reactivate
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <UserModal
                    user={editingUser}
                    onClose={() => setShowModal(false)}
                    onSave={() => { setShowModal(false); fetchUsers(); }}
                />
            )}
        </div>
    );
}

function UserModal({ user, onClose, onSave }: { user: User | null, onClose: () => void, onSave: () => void }) {
    const [formData, setFormData] = useState({
        username: user?.Username || '',
        email: user?.Email || '',
        role: user?.Role || 'Clerk',
        password: '', // Only for new users or password reset
        sendInvite: true, // Default to sending invite
        allowedClientIds: [] as number[],
        receiveFlaggedAlerts: user?.ReceiveFlaggedAlerts || false
    });
    const [clients, setClients] = useState<{ ClientID: number, ClientName: string, ClientCode: string }[]>([]);
    const [saving, setSaving] = useState(false);

    // Fetch Clients on mount
    useEffect(() => {
        fetch('/api/clients', { cache: 'no-store' }).then(res => res.json()).then(data => setClients(data));

        // If editing, fetch current user's allowed clients
        if (user && user.Role === 'ClientUser') {
            fetch(`/api/users/${user.UserID}/clients`).then(res => res.json()).then(ids => {
                setFormData(prev => ({ ...prev, allowedClientIds: ids }));
            }).catch(() => { });
        }
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = user ? `/api/users/${user.UserID}` : '/api/users';
            const method = user ? 'PUT' : 'POST';

            // Prepare payload
            const payload: any = {
                username: formData.username,
                email: formData.email,
                role: formData.role,
                allowedClientIds: formData.role === 'ClientUser' ? formData.allowedClientIds : [],
                receiveFlaggedAlerts: formData.receiveFlaggedAlerts
            };

            if (!user) {
                // New User logic
                payload.sendInvite = formData.sendInvite;
                if (!formData.sendInvite) {
                    payload.password = formData.password;
                }
            } else {
                // Edit User logic
                if (formData.password) payload.password = formData.password;
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (res.ok) {
                onSave();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const toggleClient = (id: number) => {
        setFormData(prev => {
            if (prev.allowedClientIds.includes(id)) {
                return { ...prev, allowedClientIds: prev.allowedClientIds.filter(cid => cid !== id) };
            } else {
                return { ...prev, allowedClientIds: [...prev.allowedClientIds, id] };
            }
        });
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', backgroundColor: 'var(--color-bg-surface)' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>{user ? 'Edit User' : 'Add New User'}</h3>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Username</label>
                        <input
                            className="input-field"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            disabled={!!user} // Cannot change username after creation
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                        <input
                            type="email"
                            className="input-field"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Role</label>
                        <select
                            className="input-field"
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                        >
                            <option value="Clerk">Clerk</option>
                            <option value="Admin">Admin</option>
                            <option value="ClientUser">Client User</option>
                        </select>
                    </div>

                    <div style={{ margin: '1rem 0' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={formData.receiveFlaggedAlerts}
                                onChange={e => setFormData({ ...formData, receiveFlaggedAlerts: e.target.checked })}
                            />
                            <span>Receive Alerts for Flagged Donations</span>
                        </label>
                    </div>

                    {/* Client Selection (Only for ClientUser) */}
                    {formData.role === 'ClientUser' && (
                        <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Allowed Clients</label>
                            <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {clients.map(client => (
                                    <label key={client.ClientID} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.allowedClientIds.includes(client.ClientID)}
                                            onChange={() => toggleClient(client.ClientID)}
                                        />
                                        <span>{client.ClientName} ({client.ClientCode})</span>
                                    </label>
                                ))}
                            </div>
                            <small style={{ color: 'var(--color-text-muted)' }}>Select which clients this user can access.</small>
                        </div>
                    )}

                    {!user && (
                        <div style={{ margin: '0.5rem 0' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.sendInvite}
                                    onChange={e => setFormData({ ...formData, sendInvite: e.target.checked })}
                                />
                                <span>Send Invitation Email (Recommended)</span>
                            </label>
                        </div>
                    )}

                    {(user || !formData.sendInvite) && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                                {user ? 'Reset Password (Leave empty to keep current)' : 'Initial Password'}
                            </label>
                            <input
                                type="password"
                                className="input-field"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                placeholder={user ? "Enter new password to reset" : "Set password"}
                                required={!user && !formData.sendInvite}
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                            {saving ? 'Saving...' : 'Save User'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ flex: 1, background: 'transparent', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
