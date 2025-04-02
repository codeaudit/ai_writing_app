import HistoryViewer from '@/components/history-viewer';

export default function HistoryPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Chat History</h1>
      <HistoryViewer />
    </div>
  );
} 