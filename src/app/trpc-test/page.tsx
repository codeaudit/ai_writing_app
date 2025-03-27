import { TrpcTest } from '@/components/trpc-test';

export default function TrpcTestPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">tRPC Test Page</h1>
      <p className="mb-6 text-gray-600">
        This page demonstrates the integration of tRPC in the application.
        Below you can see examples of queries and mutations being executed
        through the type-safe API.
      </p>
      
      <TrpcTest />
      
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="font-semibold text-blue-800 mb-2">Implementation Notes</h2>
        <ul className="list-disc pl-5 text-blue-700">
          <li>The test component uses tRPC hooks to fetch data</li>
          <li>All API calls are fully type-safe</li>
          <li>The backend uses router procedures to handle requests</li>
          <li>Error handling and loading states are managed automatically</li>
        </ul>
      </div>
    </div>
  );
} 