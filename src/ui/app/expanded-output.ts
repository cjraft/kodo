import type { Message, ToolCallRecord } from "../../core/session/types.js";
import {
  findLatestExpandableConversationTarget,
  type ExpandableConversationTarget,
} from "../transcript/model.js";

export interface ExpandedOutputState {
  latestExpandableOutput: ExpandableConversationTarget | null;
  hasExpandableOutput: boolean;
  expandedOutputOpen: boolean;
  expandHintVisible: boolean;
}

export interface ResolveExpandedOutputStateOptions {
  messages: Message[];
  toolCalls: ToolCallRecord[];
  width: number;
  expandedOutputOpen: boolean;
}

/**
 * Resolves the current "expanded output" affordance for the app shell:
 * whether a long assistant/tool message exists, whether the dedicated full
 * view page is open, and whether the inline hint should still be shown.
 */
export const resolveExpandedOutputState = ({
  messages,
  toolCalls,
  width,
  expandedOutputOpen,
}: ResolveExpandedOutputStateOptions): ExpandedOutputState => {
  const latestExpandableOutput = findLatestExpandableConversationTarget(messages, toolCalls, width);
  const hasExpandableOutput = latestExpandableOutput !== null;
  const safeExpandedOutputOpen = expandedOutputOpen && hasExpandableOutput;

  return {
    latestExpandableOutput,
    hasExpandableOutput,
    expandedOutputOpen: safeExpandedOutputOpen,
    expandHintVisible: hasExpandableOutput && !safeExpandedOutputOpen,
  };
};
