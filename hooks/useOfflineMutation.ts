import { useCallback, useRef, useState } from 'react';
import { DocumentNode } from '@apollo/client';
import { useMutation } from '@apollo/client';
import { useAppStore } from '~/store/app.store';
import { enqueue, applyOptimistic } from '~/services/mutationQueue';

interface UseOfflineMutationOptions<TVariables> {
  onCompleted?: (data: any) => void;
  onError?: (err: Error) => void;
  optimisticUpdate?: (variables: TVariables) => Promise<void>;
}

export function useOfflineMutation<TVariables extends Record<string, any>>(
  mutationName: string,
  mutation: DocumentNode,
  options: UseOfflineMutationOptions<TVariables> = {}
): [(variables: TVariables) => Promise<void>, { loading: boolean }] {
  const isOnline = useAppStore((s) => s.isOnline);
  const [loading, setLoading] = useState(false);

  // Stable refs so useCallback doesn't depend on options object identity
  const onCompletedRef = useRef(options.onCompleted);
  const onErrorRef = useRef(options.onError);
  const optimisticUpdateRef = useRef(options.optimisticUpdate);
  onCompletedRef.current = options.onCompleted;
  onErrorRef.current = options.onError;
  optimisticUpdateRef.current = options.optimisticUpdate;

  const [mutate] = useMutation(mutation, {
    onCompleted: (data) => onCompletedRef.current?.(data),
    onError: (err) => onErrorRef.current?.(err),
  });

  const execute = useCallback(
    async (variables: TVariables) => {
      setLoading(true);
      try {
        if (!isOnline) {
          if (optimisticUpdateRef.current) {
            await optimisticUpdateRef.current(variables);
          } else {
            await applyOptimistic(mutationName, variables);
          }
          await enqueue(mutationName, variables);
          return;
        }
        await mutate({ variables });
      } finally {
        setLoading(false);
      }
    },
    // isOnline and mutationName are stable; mutate is stable per Apollo's guarantee
    [isOnline, mutate, mutationName]
  );

  return [execute, { loading }];
}
