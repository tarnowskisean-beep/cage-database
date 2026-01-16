
import { useState, useCallback, useRef } from 'react';

interface UseDuplicateCheckProps {
    onDuplicateFound?: (matches: any[]) => void;
}

export function useDuplicateCheck(props?: UseDuplicateCheckProps) {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const checkDuplicates = useCallback((data: {
        firstName: string,
        lastName: string,
        email?: string,
        address?: string
    }) => {
        // Clear existing debounce
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Basic Guard
        if (!data.firstName && !data.lastName && !data.email) {
            setMatches([]);
            return;
        }

        setLoading(true);

        // Debounce 500ms
        timeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch('/api/lookup/duplicates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    const result = await res.json();
                    setMatches(result.matches || []);
                    if (props?.onDuplicateFound && result.matches?.length > 0) {
                        props.onDuplicateFound(result.matches);
                    }
                }
            } catch (e) {
                console.error("Duplicate check failed", e);
            } finally {
                setLoading(false);
            }
        }, 500);

    }, [props]);

    const clearMatches = useCallback(() => {
        setMatches([]);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    return {
        matches,
        loading,
        checkDuplicates,
        clearMatches
    };
}
