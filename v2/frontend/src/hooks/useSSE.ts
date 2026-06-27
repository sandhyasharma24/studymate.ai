import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

export const useSSE = () => {
  const [streaming, setStreaming] = useState(false);

  const streamMessage = async (
    sessionId: string,
    content: string,
    onChunk: (chunk: string) => void,
    onError: (err: any) => void,
    onComplete: () => void
  ) => {
    setStreaming(true);
    const token = useAuthStore.getState().token;

    try {
      const response = await fetch(`/api/v1/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        buffer += textChunk;

        // Process line-by-line for SSE format
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data:')) {
            const dataStr = cleanLine.substring(5).trim();
            // In our simple WebFlux backend, we might write raw strings directly
            onChunk(dataStr || '\n');
          } else if (cleanLine) {
            // Also handle raw non-SSE formatted chunk proxying if any
            onChunk(cleanLine);
          }
        }
      }

      // Flush remaining buffer
      if (buffer) {
        if (buffer.startsWith('data:')) {
          onChunk(buffer.substring(5).trim());
        } else {
          onChunk(buffer);
        }
      }

      onComplete();
    } catch (err: any) {
      onError(err);
    } finally {
      setStreaming(false);
    }
  };

  return { streamMessage, streaming };
};
