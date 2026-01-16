import BatchEntry from './BatchEntry';

export const maxDuration = 60;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <BatchEntry id={id} />;
}
