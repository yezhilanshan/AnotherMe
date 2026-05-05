/**
 * Knowledge State client - fetches BKT mastery data for visualization.
 */

export interface KnowledgeStateEntry {
  knowledgePointId: string;
  pMastery: number;
  pLearn: number;
  pGuess: number;
  pSlip: number;
  attempts: number;
  correctAttempts: number;
  lastUpdatedAt: string | null;
  teachingAction?: string | null;
  teachingReason?: string | null;
}

export async function fetchKnowledgeStates(
  userId: string,
  options?: { minMastery?: number; limit?: number },
): Promise<KnowledgeStateEntry[]> {
  if (typeof window === 'undefined') return [];

  const params = new URLSearchParams();
  if (options?.minMastery !== undefined) {
    params.set('minMastery', String(options.minMastery));
  }
  if (options?.limit !== undefined) {
    params.set('limit', String(options.limit));
  }
  params.set('includeDecision', 'true');

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(
    `/api/students/${encodeURIComponent(userId)}/knowledge-state${query}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch knowledge states: ${response.status}`);
  }

  const data = (await response.json()) as {
    states: Array<{
      knowledge_point_id: string;
      p_mastery: number;
      p_learn: number;
      p_guess: number;
      p_slip: number;
      attempts: number;
      correct_attempts: number;
      last_updated_at?: string | null;
    }>;
    decisions?: Array<{
      target_knowledge_point_id: string;
      mastery: number;
      action: string;
      reason: string;
    }>;
  };

  const decisionMap = new Map(
    (data.decisions || []).map((d) => [d.target_knowledge_point_id, d]),
  );

  return data.states.map((s) => {
    const decision = decisionMap.get(s.knowledge_point_id);
    return {
      knowledgePointId: s.knowledge_point_id,
      pMastery: s.p_mastery,
      pLearn: s.p_learn,
      pGuess: s.p_guess,
      pSlip: s.p_slip,
      attempts: s.attempts,
      correctAttempts: s.correct_attempts,
      lastUpdatedAt: s.last_updated_at || null,
      teachingAction: decision?.action || null,
      teachingReason: decision?.reason || null,
    };
  });
}
