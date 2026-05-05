/**
 * useDiagnosticProbe - React hook for generating diagnostic probes.
 *
 * Uses the diagnostic Zustand store for shared probe state,
 * so the same probe is visible across chat sidebar and standalone page.
 */

import { useCallback } from 'react';
import { useDiagnosticStore, type DiagnosticState } from '@/lib/store/diagnostic';
import { fetchDiagnosticProbe } from '@/lib/diagnostic-probe/client';

export interface UseDiagnosticProbeOptions {
  userId: string;
}

export interface UseDiagnosticProbeReturn {
  probe: DiagnosticState['currentProbe'];
  loading: boolean;
  error: string | null;
  generateProbe: (params?: { knowledgePointId?: string; difficulty?: string; probeType?: string }) => Promise<void>;
  clearProbe: () => void;
}

export function useDiagnosticProbe(options: UseDiagnosticProbeOptions): UseDiagnosticProbeReturn {
  const probe = useDiagnosticStore((s) => s.currentProbe);
  const loading = useDiagnosticStore((s) => s.probeLoading);
  const error = useDiagnosticStore((s) => s.probeError);
  const setProbe = useDiagnosticStore((s) => s.setProbe);
  const setProbeLoading = useDiagnosticStore((s) => s.setProbeLoading);
  const setProbeError = useDiagnosticStore((s) => s.setProbeError);
  const storeClearProbe = useDiagnosticStore((s) => s.clearProbe);

  const generateProbe = useCallback(
    async (params?: { knowledgePointId?: string; difficulty?: string; probeType?: string }) => {
      setProbeLoading(true);
      setProbeError(null);
      try {
        const result = await fetchDiagnosticProbe({
          userId: options.userId,
          ...params,
        });
        if (result) {
          setProbe(result);
        } else {
          setProbeError('未能生成诊断题，请稍后重试');
        }
      } catch (err) {
        setProbeError(err instanceof Error ? err.message : '生成诊断题失败');
      } finally {
        setProbeLoading(false);
      }
    },
    [options.userId, setProbe, setProbeLoading, setProbeError],
  );

  return { probe, loading, error, generateProbe, clearProbe: storeClearProbe };
}
