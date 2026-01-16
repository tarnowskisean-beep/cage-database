'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Donor {
    DonorID: number;
    FirstName: string;
    LastName: string;
    Email: string;
    Address: string;
    City: string;
    State: string;
    Zip: string;
    CreatedAt: string;
}

interface DuplicateGroup {
    field: string;
    value: string;
    count: number;
    donors: Donor[];
}

export default function MergeGroup({ group, onMergeComplete }: { group: DuplicateGroup, onMergeComplete: () => void }) {
    const [primaryId, setPrimaryId] = useState<number>(group.donors[0]?.DonorID);
    const [isMerging, setIsMerging] = useState(false);
    const router = useRouter();

    const handleMerge = async () => {
        if (!primaryId || !confirm('Are you sure you want to merge these profiles? This cannot be undone.')) return;

        setIsMerging(true);
        try {
            const secondaryIds = group.donors.map(d => d.DonorID).filter(id => id !== primaryId);
            const res = await fetch('/api/people/deduplicate/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    primaryDonorId: primaryId,
                    secondaryDonorIds: secondaryIds
                })
            });

            if (!res.ok) throw new Error('Merge failed');

            alert('Merge successful!');
            onMergeComplete();
        } catch (err) {
            alert('Error merging: ' + err);
        } finally {
            setIsMerging(false);
        }
    };

    return (
        <div className="border rounded-lg p-4 mb-4 bg-white dark:bg-zinc-900 shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                    Duplicate {group.field}: <span className="text-blue-600">{group.value}</span>
                </h3>
                <button
                    onClick={handleMerge}
                    disabled={isMerging}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                    {isMerging ? 'Merging...' : 'Merge Selected'}
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="border-b dark:border-zinc-700">
                            <th className="p-2 text-left">Primary</th>
                            <th className="p-2 text-left">ID</th>
                            <th className="p-2 text-left">Name</th>
                            <th className="p-2 text-left">Email</th>
                            <th className="p-2 text-left">Address</th>
                            <th className="p-2 text-left">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {group.donors.map(d => (
                            <tr key={d.DonorID} className={`border-b dark:border-zinc-800 ${primaryId === d.DonorID ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                <td className="p-2">
                                    <input
                                        type="radio"
                                        name={`primary-${group.value}`}
                                        checked={primaryId === d.DonorID}
                                        onChange={() => setPrimaryId(d.DonorID)}
                                        className="w-4 h-4"
                                    />
                                </td>
                                <td className="p-2">{d.DonorID}</td>
                                <td className="p-2">{d.FirstName} {d.LastName}</td>
                                <td className="p-2">{d.Email}</td>
                                <td className="p-2">{d.Address}, {d.City} {d.State} {d.Zip}</td>
                                <td className="p-2">{new Date(d.CreatedAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
