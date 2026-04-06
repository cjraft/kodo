import { useState } from "react";
import { appCommandDefinitions, matchAppCommand, type AppCommandContext } from "../app/commands.js";

/**
 * Runs slash commands through the shared command registry and exposes
 * lightweight user-facing feedback for local command errors.
 */
export const useAppCommands = (context: AppCommandContext) => {
  const [commandMessage, setCommandMessage] = useState<string | null>(null);

  const handleCommand = async (input: string) => {
    const trimmed = input.trim();

    if (!trimmed.startsWith("/")) {
      setCommandMessage(null);
      return false;
    }

    const match = matchAppCommand(trimmed);

    if (!match) {
      const [rawName = trimmed] = trimmed.split(/\s+/, 1);
      setCommandMessage(`Unknown command: ${rawName}. Use /help.`);
      return true;
    }

    try {
      setCommandMessage(null);
      await match.command.execute(match.args, context);
    } catch (error) {
      setCommandMessage(error instanceof Error ? error.message : String(error));
    }

    return true;
  };

  return {
    commands: appCommandDefinitions,
    commandMessage,
    clearCommandMessage: () => setCommandMessage(null),
    handleCommand,
  };
};
