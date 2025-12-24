/**
 * Grid Selection Engine
 * 
 * Local-only 12-tile selection engine with deterministic sorting
 */

export {
  selectGridParticipants,
  getRemovedParticipants,
  getAddedParticipants,
} from "./selectGridParticipants";

export { useGridSelection, useGridSelectionPure } from "./useGridSelection";

export type {
  ParticipantLite,
  SortMode,
  SelectionInput,
  SelectionOutput,
} from "./types";

export type {
  UseGridSelectionOptions,
  UseGridSelectionReturn,
} from "./useGridSelection";

