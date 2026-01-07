
'use client';

import { useState, useEffect } from 'react';

export default function FilesSection({ donorId }: { donorId: string }) {
    const [files, setFiles] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    const fetchFiles = async () => {
        try {
            const res = await fetch(`/api/people/${donorId}/files`);
            const data = await res.json();
            if (Array.isArray(data)) setFiles(data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [donorId]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        setUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/people/${donorId}/files`, {
                method: 'POST',
                body: formData
            });
            if (!res.ok) throw new Error('Upload failed');
            fetchFiles();
        } catch (e) {
            alert('Upload failed');
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    return (
        <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-display text-white">Files & Documents</h3>
                <label className="btn-secondary cursor-pointer">
                    {uploading ? 'Uploading...' : 'Upload File'}
                    <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {files.map(file => (
                    <a
                        key={file.FileID}
                        href={file.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-white/10 p-4 rounded transition-all flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-gray-400 group-hover:text-emerald-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{file.FileName}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                                {new Date(file.UploadedAt).toLocaleDateString()} • {(file.FileSize / 1024).toFixed(0)}KB
                            </p>
                        </div>
                    </a>
                ))}
                {files.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500 italic border-2 border-dashed border-white/5 rounded">
                        No files uploaded.
                    </div>
                )}
            </div>
        </div>
    );
}
