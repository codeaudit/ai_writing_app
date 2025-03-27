'use client';

import { trpc } from '@/utils/trpc';

export function TrpcTest() {
  // Example of using a query
  const { data: models, isLoading: isLoadingModels } = trpc.llm.getModels.useQuery();

  // Example of using a mutation
  const generateText = trpc.llm.generateText.useMutation();
  
  const handleGenerateText = async () => {
    await generateText.mutateAsync({
      prompt: 'Hello, tRPC!',
    });
  };

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="text-xl font-bold mb-4">tRPC Test</h2>
      
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Available Models:</h3>
        {isLoadingModels ? (
          <p>Loading models...</p>
        ) : (
          <ul className="list-disc pl-5">
            {models?.map((model) => (
              <li key={model.id}>
                {model.name} ({model.provider})
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Generate Text:</h3>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleGenerateText}
          disabled={generateText.isPending}
        >
          {generateText.isPending ? 'Generating...' : 'Generate Text'}
        </button>
        
        {generateText.isSuccess && (
          <div className="mt-2 p-2 bg-gray-100 rounded">
            <p className="font-medium">Response:</p>
            <p>{generateText.data.text}</p>
          </div>
        )}
      </div>
    </div>
  );
} 