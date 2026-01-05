/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Config,
  ToolCallRequestInfo,
  ResumedSessionData,
  CompletedToolCall,
  UserFeedbackPayload,
} from '@google/gemini-cli-core';
import { isSlashCommand } from './ui/utils/commandUtils.js';
import type { LoadedSettings } from './config/settings.js';
import {
  executeToolCall,
  GeminiEventType,
  FatalInputError,
  promptIdContext,
  OutputFormat,
  JsonFormatter,
  StreamJsonFormatter,
  JsonStreamEventType,
  uiTelemetryService,
  debugLogger,
  coreEvents,
  CoreEvent,
  createWorkingStdio,
  recordToolCallInteractions,
  ToolErrorType,
  ShellExecutionService,
} from '@google/gemini-cli-core';

import type { Content, Part } from '@google/genai';
import readline from 'node:readline';

import { convertSessionToHistoryFormats } from './ui/hooks/useSessionBrowser.js';
import { handleSlashCommand } from './nonInteractiveCliCommands.js';
import { ConsolePatcher } from './ui/utils/ConsolePatcher.js';
import { handleAtCommand } from './ui/hooks/atCommandProcessor.js';
import {
  handleError,
  handleToolError,
  handleCancellationError,
  handleMaxTurnsExceededError,
} from './utils/errors.js';
import { TextOutput } from './ui/utils/textOutput.js';
import { type DevLoopConfig } from './ui/types.js';
import * as fsSync from 'node:fs';

interface RunNonInteractiveParams {
  config: Config;
  settings: LoadedSettings;
  input: string;
  prompt_id: string;
  hasDeprecatedPromptArg?: boolean;
  resumedSessionData?: ResumedSessionData;
}

export async function runNonInteractive({
  config,
  settings,
  input,
  prompt_id,
  hasDeprecatedPromptArg,
  resumedSessionData,
}: RunNonInteractiveParams): Promise<void> {
  return promptIdContext.run(prompt_id, async () => {
    const consolePatcher = new ConsolePatcher({
      stderr: true,
      debugMode: config.getDebugMode(),
      onNewMessage: (msg) => {
        coreEvents.emitConsoleLog(msg.type, msg.content);
      },
    });
    const { stdout: workingStdout } = createWorkingStdio();
    const textOutput = new TextOutput(workingStdout);
    process.stdout.write(`DEBUG: raw input: [${input}]\n`);

    const handleUserFeedback = (payload: UserFeedbackPayload) => {
      const prefix = payload.severity.toUpperCase();
      process.stderr.write(`[${prefix}] ${payload.message}\n`);
      if (payload.error && config.getDebugMode()) {
        const errorToLog =
          payload.error instanceof Error
            ? payload.error.stack || payload.error.message
            : String(payload.error);
        process.stderr.write(`${errorToLog}\n`);
      }
    };

    const startTime = Date.now();
    const streamFormatter =
      config.getOutputFormat() === OutputFormat.STREAM_JSON
        ? new StreamJsonFormatter()
        : null;

    const abortController = new AbortController();

    // Track cancellation state
    let isAborting = false;
    let cancelMessageTimer: NodeJS.Timeout | null = null;

    // Setup stdin listener for Ctrl+C detection
    let stdinWasRaw = false;
    let rl: readline.Interface | null = null;

    const setupStdinCancellation = () => {
      // Only setup if stdin is a TTY (user can interact)
      if (!process.stdin.isTTY) {
        return;
      }

      // Save original raw mode state
      stdinWasRaw = process.stdin.isRaw || false;

      // Enable raw mode to capture individual keypresses
      process.stdin.setRawMode(true);
      process.stdin.resume();

      // Setup readline to emit keypress events
      rl = readline.createInterface({
        input: process.stdin,
        escapeCodeTimeout: 0,
      });
      readline.emitKeypressEvents(process.stdin, rl);

      // Listen for Ctrl+C
      const keypressHandler = (
        str: string,
        key: { name?: string; ctrl?: boolean },
      ) => {
        // Detect Ctrl+C: either ctrl+c key combo or raw character code 3
        if ((key && key.ctrl && key.name === 'c') || str === '\u0003') {
          // Only handle once
          if (isAborting) {
            return;
          }

          isAborting = true;

          // Only show message if cancellation takes longer than 200ms
          // This reduces verbosity for fast cancellations
          cancelMessageTimer = setTimeout(() => {
            process.stderr.write('\nCancelling...\n');
          }, 200);

          abortController.abort();
          // Note: Don't exit here - let the abort flow through the system
          // and trigger handleCancellationError() which will exit with proper code
        }
      };

      process.stdin.on('keypress', keypressHandler);
    };

    const cleanupStdinCancellation = () => {
      // Clear any pending cancel message timer
      if (cancelMessageTimer) {
        clearTimeout(cancelMessageTimer);
        cancelMessageTimer = null;
      }

      // Cleanup readline and stdin listeners
      if (rl) {
        rl.close();
        rl = null;
      }

      // Remove keypress listener
      process.stdin.removeAllListeners('keypress');

      // Restore stdin to original state
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(stdinWasRaw);
        process.stdin.pause();
      }
    };

    let errorToHandle: unknown | undefined;
    try {
      consolePatcher.patch();

      // Setup stdin cancellation listener
      setupStdinCancellation();

      coreEvents.on(CoreEvent.UserFeedback, handleUserFeedback);
      coreEvents.drainBacklogs();

      // Handle EPIPE errors when the output is piped to a command that closes early.
      process.stdout.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EPIPE') {
          // Exit gracefully if the pipe is closed.
          process.exit(0);
        }
      });

      const geminiClient = config.getCitruxClient();

      // Initialize chat.  Resume if resume data is passed.
      if (resumedSessionData) {
        await geminiClient.resumeChat(
          convertSessionToHistoryFormats(
            resumedSessionData.conversation.messages,
          ).clientHistory,
          resumedSessionData,
        );
      }

      // Emit init event for streaming JSON
      if (streamFormatter) {
        streamFormatter.emitEvent({
          type: JsonStreamEventType.INIT,
          timestamp: new Date().toISOString(),
          session_id: config.getSessionId(),
          model: config.getModel(),
        });
      }

      let query: Part[] | undefined;
      let devLoopConfig: DevLoopConfig | null = null;
      let lastVerificationOutput: string | null = null;

      if (isSlashCommand(input)) {
        const slashCommandResult = await handleSlashCommand(
          input,
          abortController,
          config,
          settings,
        );
        if (slashCommandResult) {
          process.stdout.write(
            `DEBUG: slashCommandResult type: ${typeof slashCommandResult === 'object' && 'type' in slashCommandResult ? slashCommandResult.type : 'raw'}\n`,
          );
          if (
            typeof slashCommandResult === 'object' &&
            'type' in slashCommandResult &&
            slashCommandResult.type === 'dev_loop'
          ) {
            devLoopConfig = (
              slashCommandResult as { type: 'dev_loop'; config: DevLoopConfig }
            ).config;
            process.stdout.write(
              `DEBUG: devLoopConfig Active: ${devLoopConfig.isActive}\n`,
            );
            query = [
              {
                text: `${devLoopConfig.task}\n\n[Dev Loop Mode] After you complete this task, I will automatically run verification: \`${devLoopConfig.verifyCommand}\`. If it fails, I will feed the error back to you for further fixes.`,
              },
            ];
          } else {
            query = slashCommandResult as Part[];
          }
        }
      }

      if (!query) {
        const { processedQuery, error } = await handleAtCommand({
          query: input,
          config,
          addItem: (_item, _timestamp) => 0,
          onDebugMessage: () => {},
          messageId: Date.now(),
          signal: abortController.signal,
        });

        if (error || !processedQuery) {
          // An error occurred during @include processing (e.g., file not found).
          // The error message is already logged by handleAtCommand.
          throw new FatalInputError(
            error || 'Exiting due to an error processing the @ command.',
          );
        }
        query = processedQuery as Part[];
      }

      // Emit user message event for streaming JSON
      if (streamFormatter) {
        streamFormatter.emitEvent({
          type: JsonStreamEventType.MESSAGE,
          timestamp: new Date().toISOString(),
          role: 'user',
          content: input,
        });
      }

      let currentMessages: Content[] = [{ role: 'user', parts: query }];

      let turnCount = 0;
      const deprecateText =
        'The --prompt (-p) flag has been deprecated and will be removed in a future version. Please use a positional argument for your prompt. See citrux --help for more information.\n';
      if (hasDeprecatedPromptArg) {
        if (streamFormatter) {
          streamFormatter.emitEvent({
            type: JsonStreamEventType.MESSAGE,
            timestamp: new Date().toISOString(),
            role: 'assistant',
            content: deprecateText,
            delta: true,
          });
        } else {
          process.stderr.write(deprecateText);
        }
      }
      while (true) {
        turnCount++;
        if (
          config.getMaxSessionTurns() >= 0 &&
          turnCount > config.getMaxSessionTurns()
        ) {
          handleMaxTurnsExceededError(config);
        }
        const toolCallRequests: ToolCallRequestInfo[] = [];

        const responseStream = geminiClient.sendMessageStream(
          currentMessages[0]?.parts || [],
          abortController.signal,
          prompt_id,
        );

        let responseText = '';
        for await (const event of responseStream) {
          if (abortController.signal.aborted) {
            handleCancellationError(config);
          }

          if (event.type === GeminiEventType.Content) {
            if (streamFormatter) {
              streamFormatter.emitEvent({
                type: JsonStreamEventType.MESSAGE,
                timestamp: new Date().toISOString(),
                role: 'assistant',
                content: event.value,
                delta: true,
              });
            } else if (config.getOutputFormat() === OutputFormat.JSON) {
              responseText += event.value;
            } else {
              if (event.value) {
                textOutput.write(event.value);
              }
            }
          } else if (event.type === GeminiEventType.ToolCallRequest) {
            if (streamFormatter) {
              streamFormatter.emitEvent({
                type: JsonStreamEventType.TOOL_USE,
                timestamp: new Date().toISOString(),
                tool_name: event.value.name,
                tool_id: event.value.callId,
                parameters: event.value.args,
              });
            }
            toolCallRequests.push(event.value);
          } else if (event.type === GeminiEventType.LoopDetected) {
            if (streamFormatter) {
              streamFormatter.emitEvent({
                type: JsonStreamEventType.ERROR,
                timestamp: new Date().toISOString(),
                severity: 'warning',
                message: 'Loop detected, stopping execution',
              });
            }
          } else if (event.type === GeminiEventType.MaxSessionTurns) {
            if (streamFormatter) {
              streamFormatter.emitEvent({
                type: JsonStreamEventType.ERROR,
                timestamp: new Date().toISOString(),
                severity: 'error',
                message: 'Maximum session turns exceeded',
              });
            }
          } else if (event.type === GeminiEventType.Error) {
            throw event.value.error;
          }
        }

        if (toolCallRequests.length > 0) {
          textOutput.ensureTrailingNewline();
          const toolResponseParts: Part[] = [];
          const completedToolCalls: CompletedToolCall[] = [];

          for (const requestInfo of toolCallRequests) {
            const completedToolCall = await executeToolCall(
              config,
              requestInfo,
              abortController.signal,
            );
            const toolResponse = completedToolCall.response;

            completedToolCalls.push(completedToolCall);

            if (streamFormatter) {
              streamFormatter.emitEvent({
                type: JsonStreamEventType.TOOL_RESULT,
                timestamp: new Date().toISOString(),
                tool_id: requestInfo.callId,
                status: toolResponse.error ? 'error' : 'success',
                output:
                  typeof toolResponse.resultDisplay === 'string'
                    ? toolResponse.resultDisplay
                    : undefined,
                error: toolResponse.error
                  ? {
                      type: toolResponse.errorType || 'TOOL_EXECUTION_ERROR',
                      message: toolResponse.error.message,
                    }
                  : undefined,
              });
            }

            if (toolResponse.error) {
              handleToolError(
                requestInfo.name,
                toolResponse.error,
                config,
                toolResponse.errorType || 'TOOL_EXECUTION_ERROR',
                typeof toolResponse.resultDisplay === 'string'
                  ? toolResponse.resultDisplay
                  : undefined,
              );
            }

            if (toolResponse.responseParts) {
              toolResponseParts.push(...toolResponse.responseParts);
            }
          }

          // Record tool calls with full metadata before sending responses to Gemini
          try {
            const currentModel =
              geminiClient.getCurrentSequenceModel() ?? config.getModel();
            geminiClient
              .getChat()
              .recordCompletedToolCalls(currentModel, completedToolCalls);

            await recordToolCallInteractions(config, completedToolCalls);
          } catch (error) {
            debugLogger.error(
              `Error recording completed tool call information: ${error}`,
            );
          }

          // Check if any tool requested to stop execution immediately
          const stopExecutionTool = completedToolCalls.find(
            (tc) => tc.response.errorType === ToolErrorType.STOP_EXECUTION,
          );

          if (stopExecutionTool && stopExecutionTool.response.error) {
            const stopMessage = `Agent execution stopped: ${stopExecutionTool.response.error.message}`;

            if (config.getOutputFormat() === OutputFormat.TEXT) {
              process.stderr.write(`${stopMessage}\n`);
            }

            // Emit final result event for streaming JSON
            if (streamFormatter) {
              const metrics = uiTelemetryService.getMetrics();
              const durationMs = Date.now() - startTime;
              streamFormatter.emitEvent({
                type: JsonStreamEventType.RESULT,
                timestamp: new Date().toISOString(),
                status: 'success',
                stats: streamFormatter.convertToStreamStats(
                  metrics,
                  durationMs,
                ),
              });
            } else if (config.getOutputFormat() === OutputFormat.JSON) {
              const formatter = new JsonFormatter();
              const stats = uiTelemetryService.getMetrics();
              textOutput.write(
                formatter.format(config.getSessionId(), responseText, stats),
              );
            } else {
              textOutput.ensureTrailingNewline(); // Ensure a final newline
            }
            return;
          }

          currentMessages = [{ role: 'user', parts: toolResponseParts }];
        } else {
          // NO MORE TOOLS -> CHECK FOR DEV LOOP
          if (devLoopConfig?.isActive) {
            const iteration = devLoopConfig.iterationCount + 1;
            const msg = `\n[Iteration ${iteration}/${devLoopConfig.maxIterations}] Verifying: ${devLoopConfig.verifyCommand}...\n`;
            if (config.getOutputFormat() === OutputFormat.TEXT) {
              process.stdout.write(msg);
            }

            try {
              const targetDir = config.getTargetDir();
              const shellExecutionConfig = config.getShellExecutionConfig();

              const { result: verificationResultPromise } =
                await ShellExecutionService.execute(
                  devLoopConfig.verifyCommand,
                  targetDir,
                  () => {},
                  abortController.signal,
                  false,
                  shellExecutionConfig,
                );

              const verificationResult = await verificationResultPromise;
              const isSuccess = verificationResult.exitCode === 0;
              const output =
                (verificationResult.output || '').trim() || '(No output)';

              const appendLogToPlanFile = (logMessage: string) => {
                if (devLoopConfig?.planFilePath) {
                  try {
                    const logEntry = `\n- [Iteration ${iteration}]: ${logMessage}\n`;
                    fsSync.appendFileSync(devLoopConfig.planFilePath, logEntry);
                  } catch (err) {
                    debugLogger.warn(
                      `Failed to update plan file: ${String(err)}`,
                    );
                  }
                }
              };

              if (isSuccess) {
                const successMsg = `✅ Verification passed!\n\nOutput:\n${output}\n`;
                if (config.getOutputFormat() === OutputFormat.TEXT) {
                  process.stdout.write(successMsg);
                }
                appendLogToPlanFile('✅ SUCCESS - Verification passed.');
                devLoopConfig = null;
              } else {
                if (output === lastVerificationOutput) {
                  const stagMsg = `🛑 Stagnation detected: Verification error output hasn't changed. Stopping loop.\n`;
                  if (config.getOutputFormat() === OutputFormat.TEXT) {
                    process.stdout.write(stagMsg);
                  }
                  appendLogToPlanFile(
                    '🛑 STOPPED - Stagnation detected (error output unchanged).',
                  );
                  devLoopConfig = null;
                } else {
                  lastVerificationOutput = output;
                  const failMsg = `❌ Verification failed (Exit code: ${verificationResult.exitCode}).\n\nOutput:\n${output}\n`;
                  if (config.getOutputFormat() === OutputFormat.TEXT) {
                    process.stdout.write(failMsg);
                  }

                  if (iteration >= devLoopConfig.maxIterations) {
                    const maxMsg = `🛑 Reached maximum iterations (${devLoopConfig.maxIterations}). Stopping loop.\n`;
                    if (config.getOutputFormat() === OutputFormat.TEXT) {
                      process.stdout.write(maxMsg);
                    }
                    appendLogToPlanFile(
                      `🛑 STOPPED - Reached max iterations (${devLoopConfig.maxIterations}).`,
                    );
                    devLoopConfig = null;
                  } else {
                    appendLogToPlanFile(
                      `❌ FAILED - Exit code ${verificationResult.exitCode}. Retrying...`,
                    );
                    devLoopConfig = {
                      ...devLoopConfig,
                      iterationCount: iteration,
                    };

                    const feedback = `The verification command \`${devLoopConfig.verifyCommand}\` failed with exit code ${verificationResult.exitCode}. Output:\n\n\`\`\`\n${output}\n\`\`\`\n\nPlease fix the remaining issues and try again.`;

                    // FEED BACK TO GEMINI
                    currentMessages = [
                      { role: 'user', parts: [{ text: feedback }] },
                    ];
                    continue; // RE-RUN THE OUTER WHILE LOOP
                  }
                }
              }
            } catch (e) {
              const errMsg = `Error during verification: ${String(e)}\n`;
              process.stderr.write(errMsg);
              devLoopConfig = null;
            }
          }

          // IF WE REACH HERE, THE TASK IS DONE OR LOOP STOPPED
          // Emit final result event for streaming JSON
          if (streamFormatter) {
            const metrics = uiTelemetryService.getMetrics();
            const durationMs = Date.now() - startTime;
            streamFormatter.emitEvent({
              type: JsonStreamEventType.RESULT,
              timestamp: new Date().toISOString(),
              status: 'success',
              stats: streamFormatter.convertToStreamStats(metrics, durationMs),
            });
          } else if (config.getOutputFormat() === OutputFormat.JSON) {
            const formatter = new JsonFormatter();
            const stats = uiTelemetryService.getMetrics();
            textOutput.write(
              formatter.format(config.getSessionId(), responseText, stats),
            );
          } else {
            textOutput.ensureTrailingNewline(); // Ensure a final newline
          }
          return;
        }
      }
    } catch (error) {
      errorToHandle = error;
    } finally {
      // Cleanup stdin cancellation before other cleanup
      cleanupStdinCancellation();

      consolePatcher.cleanup();
      coreEvents.off(CoreEvent.UserFeedback, handleUserFeedback);
    }

    if (errorToHandle) {
      handleError(errorToHandle, config);
    }
  });
}
