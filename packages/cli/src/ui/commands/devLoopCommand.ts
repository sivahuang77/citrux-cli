/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, type SlashCommand } from './types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Command to manage autonomous development loops.
 * Usage:
 *   /dev-loop init - Start an interview to create a plan file.
 *   /dev-loop run <plan-file.md> - Run the loop based on a plan file.
 */
export const devLoopCommand: SlashCommand = {
  name: 'dev-loop',
  description:
    '<beta> Structured autonomous development loop. Use /dev-loop init to start.',
  kind: CommandKind.BUILT_IN,
  autoExecute: false,
  subCommands: [
    {
      name: 'init',
      description:
        '<beta> Initialize a new plan via interview. Usage: /dev-loop init',
      kind: CommandKind.BUILT_IN,
      autoExecute: true,
      action: () => {
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, '-')
          .slice(0, 19);
        const filename = `dev-loop-${timestamp}.md`;

        return {
          type: 'submit_prompt',
          content: `I want to start a new autonomous development loop. 
Please interview me to collect the following information:
1. **Plan Description**: What specific task or feature should be implemented?
2. **Plan Goal / Verification**: What is the shell command to verify the work? (e.g., "npm test")
3. **Max Retries**: How many times should we try to fix errors automatically? (Default is 5)

Once confirmed, please use your tool to create a file named \`${filename}\` in the current directory with this structure:

# Dev Loop Plan: [Title]
- **Timestamp**: ${new Date().toLocaleString()}
- **Status**: Pending
- **Max Retries**: [Number]

## Description
[Detailed description]

## Completion Criteria (Verification Command)
\`\`\`bash
[Verification Command]
\`\`\`

## Execution Log
- [Initial]: Plan created.

After creating the file, tell me exactly: "Plan file created at: \`${filename}\`. You can now start the loop by typing: \`/dev-loop run ${filename}\`"`,
        };
      },
    },
    {
      name: 'run',
      description:
        '<beta> Run the loop based on a plan file. Usage: /dev-loop run <plan-file.md>',
      kind: CommandKind.BUILT_IN,
      autoExecute: false,
      action: (context, args) => {
        const filePathArg = args.trim();

        if (!filePathArg) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /dev-loop run <plan-file.md>',
          };
        }

        const absolutePath = path.resolve(process.cwd(), filePathArg);

        if (!fs.existsSync(absolutePath)) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Plan file not found: ${filePathArg}`,
          };
        }

        try {
          const content = fs.readFileSync(absolutePath, 'utf8');

          // Parse description
          const descriptionMatch = content.match(
            /## Description\n([\s\S]+?)\n##/,
          );
          const task = descriptionMatch ? descriptionMatch[1].trim() : '';

          // Parse verification command
          const verifyMatch = content.match(
            /## Completion Criteria \(Verification Command\)\n```bash\n([\s\S]+?)\n```/,
          );
          const verifyCommand = verifyMatch ? verifyMatch[1].trim() : '';

          // Parse max retries
          const maxItersMatch = content.match(/- \*\*Max Retries\*\*: (\d+)/);
          const maxIterations = maxItersMatch
            ? parseInt(maxItersMatch[1], 10)
            : 5;

          if (!task || !verifyCommand) {
            return {
              type: 'message',
              messageType: 'error',
              content:
                'Invalid plan file format. Ensure it has "Description" and "Completion Criteria" sections.',
            };
          }

          return {
            type: 'dev_loop',
            config: {
              task,
              verifyCommand,
              maxIterations,
              iterationCount: 0,
              isActive: true,
              planFilePath: absolutePath,
            },
          };
        } catch (e) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error reading plan file: ${String(e)}`,
          };
        }
      },
    },
  ],
  action: (context, args) => {
    const trimmed = args.trim();
    if (!trimmed) {
      return {
        type: 'message',
        messageType: 'error',
        content:
          'Please provide a path to a plan file. Usage: /dev-loop run <path>. To create a new plan, use /dev-loop init',
      };
    }

    // If user provided a path directly to /dev-loop, be helpful and point to run
    return {
      type: 'message',
      messageType: 'error',
      content: `To run a plan, please use the correct command format: /dev-loop run ${trimmed}`,
    };
  },
};
