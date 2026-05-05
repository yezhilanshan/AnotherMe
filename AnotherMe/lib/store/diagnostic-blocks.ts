/**
 * Diagnostic Block Store - Tracks LearningBlock-level mastery for diagnostic probes.
 *
 * Each knowledge point gets a LearningBlock with attempt history,
 * allowing block-level mastery calculation via the learning-block utilities.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LearningBlock, AttemptRecord } from '@/lib/types/learning-block';
import { recordBlockAttempt, calculateBlockMastery } from '@/lib/types/learning-block';

export interface DiagnosticBlockEntry {
  block: LearningBlock;
  mastery: number;
}

interface DiagnosticBlockState {
  /** Map of knowledgePointId → LearningBlock */
  blocks: Record<string, LearningBlock>;

  /** Record a diagnostic probe attempt for a knowledge point */
  recordAttempt: (params: {
    knowledgePointId: string;
    success: boolean;
    score?: number;
    timeSpentMs?: number;
    hintsUsed?: string[];
    struggledPoints?: string[];
  }) => void;

  /** Get block entry for a knowledge point */
  getBlock: (knowledgePointId: string) => DiagnosticBlockEntry | null;

  /** Get all block entries sorted by mastery (lowest first) */
  getAllBlocks: () => DiagnosticBlockEntry[];

  /** Get mastery for a specific knowledge point (0 if not tracked) */
  getMastery: (knowledgePointId: string) => number;
}

function generateBlockId(knowledgePointId: string): string {
  return `diag-block-${knowledgePointId}`;
}

function createBlock(knowledgePointId: string): LearningBlock {
  return {
    id: generateBlockId(knowledgePointId),
    sceneId: 'diagnostic',
    stageId: 'diagnostic',
    order: 0,
    title: `诊断练习: ${knowledgePointId}`,
    metadata: {
      type: 'practice',
      status: 'active',
      difficulty: 'adaptive',
      learningObjectives: [],
      knowledgePoints: [knowledgePointId],
      misconceptionTags: [],
      sourceAnchors: [],
      attempts: [],
      generatedBy: 'diagnostic-probe',
      estimatedTimeMinutes: 5,
      prerequisiteBlockIds: [],
      relatedBlockIds: [],
      recommendedForReview: false,
    },
    content: {
      type: 'practice',
      problemSet: [],
      solutionHints: [],
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export const useDiagnosticBlockStore = create<DiagnosticBlockState>()(
  persist(
    (set, get) => ({
      blocks: {},

      recordAttempt: (params) => {
        const { knowledgePointId, success, score, timeSpentMs, hintsUsed, struggledPoints } = params;
        const { blocks } = get();

        const existingBlock = blocks[knowledgePointId] || createBlock(knowledgePointId);

        const attempt: Omit<AttemptRecord, 'id' | 'timestamp'> = {
          success,
          score,
          timeSpentMs,
          hintsUsed: hintsUsed ?? [],
          struggledPoints: struggledPoints ?? [],
        };

        const updatedBlock = recordBlockAttempt(existingBlock, attempt);

        set({
          blocks: {
            ...blocks,
            [knowledgePointId]: updatedBlock,
          },
        });
      },

      getBlock: (knowledgePointId) => {
        const { blocks } = get();
        const block = blocks[knowledgePointId];
        if (!block) return null;
        return { block, mastery: calculateBlockMastery(block) };
      },

      getAllBlocks: () => {
        const { blocks } = get();
        return Object.entries(blocks)
          .map(([kpId, block]) => ({
            block,
            mastery: calculateBlockMastery(block),
          }))
          .sort((a, b) => a.mastery - b.mastery);
      },

      getMastery: (knowledgePointId) => {
        const { blocks } = get();
        const block = blocks[knowledgePointId];
        if (!block) return 0;
        return calculateBlockMastery(block);
      },
    }),
    {
      name: 'diagnostic-blocks-storage',
      version: 1,
    },
  ),
);

/**
 * Build block mastery summary for inclusion in LearningContext.
 */
export function buildDiagnosticBlockSnapshot(): Record<string, number> {
  const { blocks } = useDiagnosticBlockStore.getState();
  const result: Record<string, number> = {};
  for (const [kpId, block] of Object.entries(blocks)) {
    result[kpId] = calculateBlockMastery(block);
  }
  return result;
}
