'use client';

import { useState, useEffect } from 'react';
import MergeGroup from './MergeGroup';

export default function DeduplicatePage() {
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [scanned, setScanned] = useState(false);

    const scan = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/people/deduplicate/scan');
            const json = await res.json();
            if (json.success) {
                setGroups(json.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setScanned(true);
        }
    };

    useEffect(() => {
        scan();
    }, []);

    const removeGroup = (index: number) => {
        const newGroups = [...groups];
        newGroups.splice(index, 1);
        setGroups(newGroups);
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold">Donor Deduplication</h1>
                <button
                    onClick={scan}
                    disabled={loading}
                    className="bg-zinc-800 text-white px-4 py-2 rounded hover:bg-zinc-700 disabled:opacity-50"
                >
                    {loading ? 'Scanning...' : 'Rescan'}
                </button>
            </div>

            {loading && <div className="text-center py-12">Scanning database for duplicates...</div>}

            {!loading && scanned && groups.length === 0 && (
                <div className="text-center py-12 text-zinc-500">
                    No duplicates found! 🎉
                </div>
            )}

            <div className="space-y-8">
                {groups.map((group, i) => (
                    <MergeGroup
                        key={i}
                        group={group}
                        onMergeComplete={() => removeGroup(i)}
                    />
                ))}
            </div>
        </div>
    );
}
