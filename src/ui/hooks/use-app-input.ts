import { useInput } from "ink";
import { isTerminalMouseReport } from "./use-mouse-wheel.js";

interface UseAppInputOptions {
  ready: boolean;
  busy: boolean;
  input: string;
  setInput: (next: string | ((current: string) => string)) => void;
  exit: () => void;
  submit: (value: string) => void;
  closePanels: () => void;
  hasExpandableOutput: boolean;
  toggleExpandedOutput: () => void;
  expandedOutputOpen: boolean;
}

/**
 * Centralizes prompt editing and keyboard shortcuts so the app component stays
 * focused on orchestration and rendering.
 */
export const useAppInput = ({
  ready,
  busy,
  input,
  setInput,
  exit,
  submit,
  closePanels,
  hasExpandableOutput,
  toggleExpandedOutput,
  expandedOutputOpen,
}: UseAppInputOptions) => {
  useInput((character, key) => {
    if (isTerminalMouseReport(character)) {
      return;
    }

    const loweredCharacter = character?.toLowerCase();

    if (key.ctrl && loweredCharacter === "c") {
      exit();
      return;
    }

    if (key.ctrl && loweredCharacter === "o") {
      if (ready && hasExpandableOutput) {
        toggleExpandedOutput();
      }
      return;
    }

    if (key.escape) {
      closePanels();
      return;
    }

    if (expandedOutputOpen) {
      return;
    }

    if (busy || !ready) {
      return;
    }

    if (key.return) {
      submit(input);
      return;
    }

    if (key.backspace || key.delete) {
      setInput((current) => current.slice(0, -1));
      return;
    }

    if (!key.ctrl && !key.meta && character) {
      setInput((current) => current + character);
    }
  });
};
