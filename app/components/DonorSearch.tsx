'use client';

import { useState, useEffect } from 'react';

interface Donor {
    DonorID: number;
    FirstName: string;
    LastName: string;
    Email: string;
    City: string;
    State: string;
}

interface Props {
    label: string;
    onSelect: (donor: Donor | null) => void;
    excludeIds?: number[];
}

export default function DonorSearch({ label, onSelect, excludeIds = [] }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Donor[]>([]);
    const [selected, setSelected] = useState<Donor | null>(null);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            if (selected) return; // Don't search if we just selected something

            setSearching(true);
            try {
                const res = await fetch(`/api/people?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                if (data.data) {
                    setResults(data.data.filter((d: Donor) => !excludeIds.includes(d.DonorID)));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, excludeIds, selected]);

    const handleSelect = (donor: Donor) => {
        setSelected(donor);
        setQuery(`${donor.FirstName} ${donor.LastName}`);
        setResults([]);
        onSelect(donor);
    };

    const handleClear = () => {
        setSelected(null);
        setQuery('');
        setResults([]);
        onSelect(null);
    };

    return (
        <div className="relative mb-4">
            <label className="block text-sm font-medium mb-1">{label}</label>
            <div className="flex gap-2 relative">
                <input
                    type="text"
                    className="w-full p-2 border rounded dark:bg-zinc-800 dark:border-zinc-700"
                    placeholder="Search by name or email..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (selected) {
                            setSelected(null); // Just clear selection, let query change
                            onSelect(null);
                        }
                    }}
                />
                {selected && (
                    <button
                        onClick={handleClear}
                        className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-700"
                        title="Clear selection"
                    >
                        ✕
                    </button>
                )}
            </div>

            {results.length > 0 && !selected && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded shadow-lg max-h-60 overflow-auto">
                    {results.map(donor => (
                        <div
                            key={donor.DonorID}
                            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer border-b dark:border-zinc-700/50 last:border-0"
                            onClick={() => handleSelect(donor)}
                        >
                            <div className="font-medium">{donor.FirstName} {donor.LastName}</div>
                            <div className="text-xs text-zinc-500">
                                {donor.Email} • {donor.City}, {donor.State} (ID: {donor.DonorID})
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {searching && <div className="absolute right-8 top-2.5 text-xs text-zinc-500">Searching...</div>}
        </div>
    );
}
