"use client";

export default function ReconciliationPage() {
    return (
        <div>
            <header className="page-header">
                <div>
                    <h1>Reconciliation</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Match bank deposits with recorded batches.</p>
                </div>
                <div style={{ padding: '0.5rem 1rem', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                    Coming Soon
                </div>
            </header>

            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚖️</div>
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Feature Under Development</h3>
                <p>The reconciliation module is currently being built.</p>
            </div>
        </div>
    );
}
