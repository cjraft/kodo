import { useEffect, useState } from "react";

export type AppPanel = "none" | "help" | "expanded";

export interface UseAppPanelsOptions {
  canOpenExpandedOutput: boolean;
}

/**
 * Owns only app-level panel switching. Child panel scroll state stays inside
 * the child view modules themselves.
 */
export const useAppPanels = ({ canOpenExpandedOutput }: UseAppPanelsOptions) => {
  const [activePanel, setActivePanel] = useState<AppPanel>("none");

  useEffect(() => {
    if (activePanel === "expanded" && !canOpenExpandedOutput) {
      setActivePanel("none");
    }
  }, [activePanel, canOpenExpandedOutput]);

  return {
    helpPanelOpen: activePanel === "help",
    expandedOutputOpen: activePanel === "expanded" && canOpenExpandedOutput,
    closePanels: () => {
      setActivePanel("none");
    },
    toggleHelpPanel: () => {
      setActivePanel((current) => (current === "help" ? "none" : "help"));
    },
    toggleExpandedOutput: () => {
      if (!canOpenExpandedOutput) {
        return;
      }

      setActivePanel((current) => (current === "expanded" ? "none" : "expanded"));
    },
  };
};
