/**
 * Agent Profiles Generation API
 *
 * Generates fixed classroom role agents for a course stage.
 * Roles are always: mentor, TA, top student, struggling student, student agent.
 */

import { NextRequest } from 'next/server';
import { nanoid } from 'nanoid';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { AGENT_COLOR_PALETTE } from '@/lib/constants/agent-defaults';
import {
  REQUIRED_CLASSROOM_AGENT_PRESETS,
  STUDENT_AGENT_ID,
} from '@/lib/orchestration/registry/classroom-presets';

const log = createLogger('Agent Profiles API');

export const maxDuration = 120;

interface RequestBody {
  stageInfo: { name: string; description?: string };
  sceneOutlines?: { title: string; description?: string }[];
  language: string;
  availableAvatars: string[];
  avatarDescriptions?: Array<{ path: string; desc: string }>;
  availableVoices?: Array<{ providerId: string; voiceId: string; voiceName: string }>;
}

function pickFirstUnused<T>(
  source: readonly T[],
  used: Set<T>,
  fallback: T,
  matcher?: (item: T) => boolean,
): T {
  if (matcher) {
    const preferred = source.find((item) => !used.has(item) && matcher(item));
    if (preferred !== undefined) {
      used.add(preferred);
      return preferred;
    }
  }

  const firstUnused = source.find((item) => !used.has(item));
  if (firstUnused !== undefined) {
    used.add(firstUnused);
    return firstUnused;
  }
  return fallback;
}

export async function POST(req: NextRequest) {
  let stageName: string | undefined;
  try {
    const body = (await req.json()) as RequestBody;
    const {
      stageInfo,
      language,
      availableAvatars,
      availableVoices,
    } = body;
    stageName = stageInfo?.name;

    // ── Validate required fields ──
    if (!stageInfo?.name) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'stageInfo.name is required');
    }
    if (!language) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'language is required');
    }
    if (!availableAvatars || availableAvatars.length === 0) {
      return apiError(
        'MISSING_REQUIRED_FIELD',
        400,
        'availableAvatars is required and must not be empty',
      );
    }

    const usedAvatars = new Set<string>();
    const usedColors = new Set<string>();
    const usedVoices = new Set<string>();
    const topicTail = stageInfo.description
      ? `\n\n当前课堂主题：${stageInfo.name}。主题说明：${stageInfo.description}`
      : `\n\n当前课堂主题：${stageInfo.name}`;

    const agents = REQUIRED_CLASSROOM_AGENT_PRESETS.map((preset, index) => {
      const avatar = pickFirstUnused(
        availableAvatars,
        usedAvatars,
        availableAvatars[index % availableAvatars.length],
        (candidate) => candidate === preset.avatar,
      );

      const color = pickFirstUnused(
        AGENT_COLOR_PALETTE,
        usedColors,
        AGENT_COLOR_PALETTE[index % AGENT_COLOR_PALETTE.length],
        (candidate) => candidate === preset.color,
      );

      let voiceConfig: { providerId: string; voiceId: string } | undefined;
      if (availableVoices && availableVoices.length > 0) {
        const voice = availableVoices.find((item) => {
          const key = `${item.providerId}::${item.voiceId}`;
          if (usedVoices.has(key)) return false;
          usedVoices.add(key);
          return true;
        });
        if (voice) {
          voiceConfig = { providerId: voice.providerId, voiceId: voice.voiceId };
        }
      }

      const serviceTail =
        preset.id === STUDENT_AGENT_ID
          ? ''
          : `\n\n请始终围绕学生代理（ID: ${STUDENT_AGENT_ID}）当前薄弱点提供支持。`;

      return {
        id: `gen-${preset.id}-${nanoid(6)}`,
        name: preset.name,
        role: preset.role,
        persona: `${preset.persona}${topicTail}${serviceTail}`,
        avatar,
        color,
        priority: preset.priority,
        ...(voiceConfig ? { voiceConfig } : {}),
      };
    });

    log.info(
      `Generated fixed classroom roster (${agents.length}) for "${stageInfo.name}" [lang=${language}]`,
    );

    return apiSuccess({ agents });
  } catch (error) {
    log.error(`Agent profiles generation failed [stage="${stageName ?? 'unknown'}"]:`, error);
    return apiError('INTERNAL_ERROR', 500, error instanceof Error ? error.message : String(error));
  }
}
