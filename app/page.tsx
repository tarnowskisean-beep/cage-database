import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Compass Caging
      </h1>
      <p style={{ fontSize: '1.2rem', color: 'hsl(var(--color-text-muted))', marginBottom: '3rem', maxWidth: '600px' }}>
        Secure, high-velocity donation processing system.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <Link href="/batches" style={{ textDecoration: 'none' }}>
          <div className="glass-panel" style={{ padding: '2rem', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📂</div>
            <h2 style={{ marginBottom: '0.5rem', color: 'white' }}>Batch Management</h2>
            <p style={{ color: 'hsl(var(--color-text-muted))' }}>Create, view, and process donation batches.</p>
            <div style={{ marginTop: '1.5rem', color: 'hsl(var(--color-primary))', fontWeight: 600 }}>Go to Batches &rarr;</div>
          </div>
        </Link>

        <div className="glass-panel" style={{ padding: '2rem', opcode: 0.5 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <h2 style={{ marginBottom: '0.5rem', color: 'white' }}>Reporting</h2>
          <p style={{ color: 'hsl(var(--color-text-muted))' }}>Reconciliation and export tools coming soon.</p>
        </div>
      </div>
    </div>
  );
}
