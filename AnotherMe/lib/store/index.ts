// Core stores
import { useCanvasStore } from './canvas';
import { useSnapshotStore } from './snapshot';
import { useKeyboardStore } from './keyboard';
import { useStageStore } from './stage';
import { useSettingsStore } from './settings';
import { useDiagnosticStore } from './diagnostic';
import { useDiagnosticBlockStore } from './diagnostic-blocks';

export {
  // New architecture
  useCanvasStore,
  useStageStore,
  useSnapshotStore,
  useKeyboardStore,
  useSettingsStore,
  useDiagnosticStore,
  useDiagnosticBlockStore,
};

// Scene Context API (for extensible scene types)
export { SceneProvider, useSceneData, useSceneSelector } from '@/lib/contexts/scene-context';
