/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestRig } from './test-helper.js';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('dev-loop', () => {
  let rig: TestRig;

  beforeEach(() => {
    rig = new TestRig();
  });

  afterEach(async () => await rig.cleanup());

  it('should run a dev-loop and succeed on first iteration', async () => {
    await rig.setup('should run a dev-loop and succeed on first iteration', {
      fakeResponsesPath: path.resolve(__dirname, 'dev-loop.success.responses'),
    });

    // 1. Create a dummy plan file
    const planFileName = 'test-plan-success.md';
    const planContent = `
# Dev Loop Plan: Test Success
- **Timestamp**: 2026-01-02
- **Status**: Pending
- **Max Retries**: 3

## Description
Please create a file named "success.txt" with content "done".

## Completion Criteria (Verification Command)
\`\`\`bash
ls success.txt
\`\`\`

## Execution Log
- [Initial]: Plan created.
`;
    rig.createFile(planFileName, planContent);

    // 2. Run the loop
    const result = await rig.run({ args: [`dev-loop`, `run`, planFileName] });

    if (!result.includes('Verifying: ls success.txt')) {
      console.log('--- TEST FAILED OUTPUT START ---');
      console.log(result);
      console.log('--- TEST FAILED OUTPUT END ---');
    }

    // 3. Verify output
    expect(result).toContain('Verifying: ls success.txt');
    expect(result).toContain('Verification passed');

    // 4. Verify the plan file was updated with logs
    const updatedPlan = rig.readFile(planFileName);
    expect(updatedPlan).toContain('✅ SUCCESS - Verification passed.');
  }, 60000);

  it('should stop after reaching maximum retries', async () => {
    await rig.setup('should stop after reaching maximum retries', {
      fakeResponsesPath: path.resolve(__dirname, 'dev-loop.max.responses'),
    });

    const planFileName = 'test-plan-max.md';
    const planContent = `
# Dev Loop Plan: Test Max Retries
- **Timestamp**: 2026-01-02
- **Status**: Pending
- **Max Retries**: 1

## Description
Always fail.

## Completion Criteria (Verification Command)
\`\`\`bash
false
\`\`\`

## Execution Log
- [Initial]: Plan created.
`;
    rig.createFile(planFileName, planContent);

    const result = await rig.run({ args: [`dev-loop`, `run`, planFileName] });

    expect(result).toContain('Reached maximum iterations (1)');

    const updatedPlan = rig.readFile(planFileName);
    expect(updatedPlan).toContain('🛑 STOPPED - Reached max iterations (1)');
  }, 60000);
});
