import { createId } from "../../lib/id.js";
import type { ContextBuilder } from "../context/builder.js";
import type { LlmClient, ModelRequest, ModelResponseEvent, ModelStopReason } from "../llm/types.js";
import type { AssistantToolCall, Message, ToolCallRecord } from "../session/types.js";
import { ToolRegistry } from "../tools/registry.js";
import type { ToolResult } from "../tools/types.js";
import { AgentEventBus } from "./event-bus.js";
import { AgentSessionState } from "../session/state.js";
import type { AgentLoopConfig } from "./types.js";

interface AgentExecutorOptions {
  llm: LlmClient;
  tools: ToolRegistry;
  loop: AgentLoopConfig;
  events: AgentEventBus;
  sessionState: AgentSessionState;
  contextBuilder: ContextBuilder;
}

interface CollectedModelResponse {
  reasoning: string;
  reasoningSignature?: string;
  text: string;
  toolCalls: AssistantToolCall[];
  stopReason: ModelStopReason;
}

/**
 * Executes one user turn end-to-end, including context assembly, streaming the
 * model response, invoking tools, and persisting the resulting transcript.
 */
export class AgentExecutor {
  constructor(private readonly options: AgentExecutorOptions) {}

  /**
   * Runs the agent loop for a single user input. The loop stops when the model
   * finishes without tools, or when the configured tool iteration budget is exhausted.
   */
  async run(input: string, sessionId?: string) {
    const snapshot = this.options.sessionState.snapshot(sessionId);
    const runId = createId();
    const userMessage: Message = {
      id: createId(),
      role: "user",
      text: input,
      createdAt: new Date().toISOString(),
    };

    await this.options.sessionState.appendMessage(userMessage, snapshot.meta.id);
    this.options.events.emit({
      type: "run-start",
      sessionId: snapshot.meta.id,
      runId,
    });

    try {
      for (let iteration = 0; iteration < this.options.loop.maxToolIterations; iteration += 1) {
        this.options.events.emit({
          type: "status",
          sessionId: snapshot.meta.id,
          runId,
          text: "Thinking...",
        });

        const currentSnapshot = this.options.sessionState.snapshot(snapshot.meta.id);
        const response = await this.collectModelResponse(
          snapshot.meta.id,
          runId,
          this.buildModelRequest(currentSnapshot.messages, currentSnapshot.meta.cwd),
        );

        await this.persistAssistantResponse(snapshot.meta.id, response);

        if (response.toolCalls.length === 0) {
          this.options.events.emit({
            type: "done",
            sessionId: snapshot.meta.id,
            runId,
          });
          return;
        }

        for (const toolCall of response.toolCalls) {
          await this.handleToolCall(snapshot.meta.id, runId, toolCall);
        }
      }

      await this.emitLoopLimitSummary(snapshot.meta.id, runId);
    } catch (error) {
      await this.handleRunError(snapshot.meta.id, runId, error);
    }
  }

  /**
   * Builds the provider-facing request from the persisted transcript. Context
   * trimming is delegated to the context layer before the model sees the prompt.
   */
  private buildModelRequest(messages: Message[], cwd: string): ModelRequest {
    return {
      messages: this.options.contextBuilder.build({ messages }),
      tools: this.options.tools.listDefinitions(),
      cwd,
    };
  }

  /**
   * Drains the streaming LLM response into a normalized aggregate structure
   * while forwarding incremental UI events.
   */
  private async collectModelResponse(
    sessionId: string,
    runId: string,
    request: ModelRequest,
  ): Promise<CollectedModelResponse> {
    const response: CollectedModelResponse = {
      reasoning: "",
      text: "",
      toolCalls: [],
      stopReason: "end_turn",
    };

    for await (const event of this.options.llm.stream(request)) {
      this.handleModelEvent(sessionId, runId, event, response);
    }

    return response;
  }

  /**
   * Maps low-level LLM stream events into agent events and accumulated state.
   */
  private handleModelEvent(
    sessionId: string,
    runId: string,
    event: ModelResponseEvent,
    response: CollectedModelResponse,
  ) {
    if (event.type === "text-delta") {
      response.text += event.text;
      this.options.events.emit({
        type: "text-delta",
        sessionId,
        runId,
        text: event.text,
      });
      return;
    }

    if (event.type === "reasoning-delta") {
      response.reasoning += event.text;
      return;
    }

    if (event.type === "reasoning-end") {
      response.reasoningSignature = event.signature;
      return;
    }

    if (event.type === "tool-call") {
      response.toolCalls.push(event.toolCall);
      return;
    }

    if (event.type === "done") {
      response.stopReason = event.stopReason;
      return;
    }

    throw new Error(event.message);
  }

  /**
   * Persists the assistant turn only when the model produced visible text or tool calls.
   */
  private async persistAssistantResponse(sessionId: string, response: CollectedModelResponse) {
    if (!response.text && response.toolCalls.length === 0) {
      return;
    }

    await this.options.sessionState.appendMessage(
      {
        id: createId(),
        role: "assistant",
        text: response.text,
        reasoning: response.reasoning || undefined,
        reasoningSignature: response.reasoningSignature,
        toolCalls: response.toolCalls,
        createdAt: new Date().toISOString(),
      },
      sessionId,
    );
  }

  /**
   * Executes one tool call, persists both the tool record and the tool result
   * message, then publishes the corresponding lifecycle events.
   */
  private async handleToolCall(sessionId: string, runId: string, toolCallInput: AssistantToolCall) {
    const snapshot = this.options.sessionState.snapshot(sessionId);
    const toolCall: ToolCallRecord = {
      id: toolCallInput.id,
      toolName: toolCallInput.toolName,
      input: toolCallInput.input,
      createdAt: new Date().toISOString(),
    };

    this.options.events.emit({
      type: "tool-start",
      sessionId,
      runId,
      toolName: toolCall.toolName,
      input: toolCall.input,
    });

    const toolResult = await this.executeToolCall(toolCall, snapshot.meta.cwd);

    toolCall.output = toolResult;
    toolCall.isError = !toolResult.success;

    await this.options.sessionState.appendToolCall(toolCall, sessionId);
    await this.options.sessionState.appendMessage(
      {
        id: createId(),
        role: "tool",
        text: toolResult.text,
        toolName: toolCall.toolName,
        toolCallId: toolCall.id,
        toolError: !toolResult.success,
        createdAt: new Date().toISOString(),
      },
      sessionId,
    );

    this.options.events.emit({
      type: "tool-end",
      sessionId,
      runId,
      toolName: toolCall.toolName,
      output: toolResult,
      isError: !toolResult.success,
    });
  }

  /**
   * Normalizes unexpected tool failures into a standard tool result so the
   * agent loop can continue without leaking raw exceptions across boundaries.
   */
  private async executeToolCall(toolCall: ToolCallRecord, cwd: string): Promise<ToolResult> {
    try {
      return await this.options.tools.execute(toolCall.toolName, toolCall.input, {
        cwd,
      });
    } catch (error) {
      return {
        success: false,
        text: error instanceof Error ? error.message : "Tool execution failed unexpectedly.",
      };
    }
  }

  /**
   * When the run exhausts its tool budget, forces one final no-tools response
   * so the user gets a readable summary instead of a silent stop.
   */
  private async emitLoopLimitSummary(sessionId: string, runId: string) {
    this.options.events.emit({
      type: "status",
      sessionId,
      runId,
      text: "Reached the tool limit, writing a final summary...",
    });

    const snapshot = this.options.sessionState.snapshot(sessionId);
    const finalPrompt: Message = {
      id: createId(),
      role: "user",
      text: "Stop using tools. Summarize the current state, what was completed, and what still needs user attention.",
      createdAt: new Date().toISOString(),
    };

    const response = await this.collectModelResponse(sessionId, runId, {
      messages: this.options.contextBuilder.build({
        messages: [...snapshot.messages, finalPrompt],
      }),
      tools: [],
      cwd: snapshot.meta.cwd,
    });

    if (!response.text) {
      response.text = "Stopped after reaching the maximum tool iterations for this turn.";
    }

    await this.options.sessionState.appendMessage(
      {
        id: createId(),
        role: "assistant",
        text: response.text,
        reasoning: response.reasoning || undefined,
        reasoningSignature: response.reasoningSignature,
        createdAt: new Date().toISOString(),
      },
      sessionId,
    );

    this.options.events.emit({ type: "done", sessionId, runId });
  }

  /**
   * Converts an unexpected run failure into a persisted assistant message and
   * a structured error event for the UI.
   */
  private async handleRunError(sessionId: string, runId: string, error: unknown) {
    const message = error instanceof Error ? error.message : "Agent run failed unexpectedly.";

    await this.options.sessionState.appendMessage(
      {
        id: createId(),
        role: "assistant",
        text: `Run failed: ${message}`,
        createdAt: new Date().toISOString(),
      },
      sessionId,
    );

    this.options.events.emit({
      type: "error",
      sessionId,
      runId,
      message,
    });
    this.options.events.emit({ type: "done", sessionId, runId });
  }
}
