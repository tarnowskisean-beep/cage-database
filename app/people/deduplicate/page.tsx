'use client';

import { useState, useEffect } from 'react';
import MergeGroup from './MergeGroup';
import DonorSearch from '@/app/components/DonorSearch';

export default function DeduplicatePage() {
    const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [scanned, setScanned] = useState(false);

    // Manual Merge State
    const [primaryDonor, setPrimaryDonor] = useState<any>(null);
    const [secondaryDonor, setSecondaryDonor] = useState<any>(null);
    const [mergingManual, setMergingManual] = useState(false);

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

    const handleManualMerge = async () => {
        if (!primaryDonor || !secondaryDonor) return;
        if (primaryDonor.DonorID === secondaryDonor.DonorID) {
            alert('Cannot merge the same donor!');
            return;
        }
        if (!confirm(`Are you sure you want to merge ${secondaryDonor.FirstName} INTO ${primaryDonor.FirstName}? This cannot be undone.`)) return;

        setMergingManual(true);
        try {
            const res = await fetch('/api/people/deduplicate/merge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    primaryDonorId: primaryDonor.DonorID,
                    secondaryDonorIds: [secondaryDonor.DonorID]
                })
            });

            if (!res.ok) throw new Error('Merge failed');

            alert('Merge successful!');
            setPrimaryDonor(null);
            setSecondaryDonor(null);
            // Re-scan to clean up any potential "auto" groups that contained these
            scan();
        } catch (err) {
            alert('Error merging: ' + err);
        } finally {
            setMergingManual(false);
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-4">Donor Deduplication</h1>
                    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg inline-flex">
                        <button
                            onClick={() => setActiveTab('auto')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'auto' ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            Auto-Scan
                        </button>
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'manual' ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            Manual Merge
                        </button>
                    </div>
                </div>
                {activeTab === 'auto' && (
                    <button
                        onClick={scan}
                        disabled={loading}
                        className="bg-zinc-800 text-white px-4 py-2 rounded hover:bg-zinc-700 disabled:opacity-50"
                    >
                        {loading ? 'Scanning...' : 'Rescan'}
                    </button>
                )}
            </div>

            {activeTab === 'auto' ? (
                <>
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
                </>
            ) : (
                <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Manual Merge Tool</h2>
                    <p className="text-sm text-zinc-500 mb-6">Select a primary profile to keep, and a secondary profile to merge into it. The secondary profile will be deleted.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                            <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">1. Primary Donor (KEEP)</h3>
                            <DonorSearch
                                label="Search for Primary Donor"
                                onSelect={setPrimaryDonor}
                            />
                            {primaryDonor && (
                                <div className="mt-2 text-sm">
                                    <div className="font-bold">{primaryDonor.FirstName} {primaryDonor.LastName}</div>
                                    <div>ID: {primaryDonor.DonorID}</div>
                                    <div>{primaryDonor.Email}</div>
                                    <div>{primaryDonor.City}, {primaryDonor.State}</div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
                            <h3 className="font-bold text-red-900 dark:text-red-300 mb-2">2. Secondary Donor (DELETE)</h3>
                            <DonorSearch
                                label="Search for Duplicate"
                                onSelect={setSecondaryDonor}
                                excludeIds={primaryDonor ? [primaryDonor.DonorID] : []}
                            />
                            {secondaryDonor && (
                                <div className="mt-2 text-sm">
                                    <div className="font-bold">{secondaryDonor.FirstName} {secondaryDonor.LastName}</div>
                                    <div>ID: {secondaryDonor.DonorID}</div>
                                    <div>{secondaryDonor.Email}</div>
                                    <div>{secondaryDonor.City}, {secondaryDonor.State}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t dark:border-zinc-800">
                        <button
                            onClick={handleManualMerge}
                            disabled={!primaryDonor || !secondaryDonor || mergingManual}
                            className="bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {mergingManual ? 'Merging...' : 'Confirm Merge'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
