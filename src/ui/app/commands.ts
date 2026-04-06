/**
 * Semantic actions that slash commands can trigger from the UI shell.
 */
export interface AppCommandContext {
  exit: () => void;
  toggleHelp: () => void;
  focusTranscript: () => void;
  resume: (query?: string) => Promise<void>;
}

/**
 * Stable command definition used by both parsing and help rendering.
 */
export interface AppCommandDefinition {
  name: string;
  usage: string;
  summary: string;
  aliases?: string[];
  execute: (args: string, context: AppCommandContext) => Promise<void> | void;
}

export const appCommandDefinitions: AppCommandDefinition[] = [
  {
    name: "help",
    usage: "/help",
    summary: "Toggle the command reference panel.",
    aliases: ["commands"],
    execute: (_args, context) => {
      context.toggleHelp();
    },
  },
  {
    name: "focus",
    usage: "/focus",
    summary: "Close open panels and return to the transcript.",
    execute: (_args, context) => {
      context.focusTranscript();
    },
  },
  {
    name: "resume",
    usage: "/resume [session-id-prefix]",
    summary: "Load the previous session or a specific session prefix.",
    execute: async (args, context) => {
      await context.resume(args.trim() || undefined);
    },
  },
  {
    name: "exit",
    usage: "/exit",
    summary: "Leave the application.",
    execute: (_args, context) => {
      context.exit();
    },
  },
];

export interface AppCommandMatch {
  command: AppCommandDefinition;
  args: string;
}

const normalizeCommandName = (value: string) => value.trim().toLowerCase();

/**
 * Parses a slash command against the registered command definitions.
 */
export const matchAppCommand = (
  input: string,
  commands = appCommandDefinitions,
): AppCommandMatch | null => {
  const trimmed = input.trim();

  if (!trimmed.startsWith("/")) {
    return null;
  }

  const [rawName = "", ...rawArgs] = trimmed.slice(1).split(/\s+/);
  const normalizedName = normalizeCommandName(rawName);

  if (!normalizedName) {
    return null;
  }

  const command = commands.find(
    (item) =>
      item.name === normalizedName || item.aliases?.some((alias) => alias === normalizedName),
  );

  if (!command) {
    return null;
  }

  return {
    command,
    args: rawArgs.join(" "),
  };
};
