"use client";

export default function UsersPage() {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>User Management</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>View and manage team access.</p>
                </div>
                <button className="btn-primary" disabled>+ Invite User</button>
            </div>

            <div className="glass-panel" style={{ padding: '0' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                Loading users... (Feature in development)
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
