/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { Config } from './config.js';

describe('Config Context Management', () => {
  it('should initialize and manage disabledContextFiles', () => {
    const disabledFiles = ['/path/to/CITRUX.md'];
    const config = new Config({
      sessionId: 'test',
      targetDir: '.',
      cwd: '.',
      debugMode: false,
      model: 'test-model',
      disabledContextFiles: disabledFiles,
    });

    expect(config.getDisabledContextFiles()).toEqual(disabledFiles);

    const newDisabled = ['/another/path.md'];
    config.setDisabledContextFiles(newDisabled);
    expect(config.getDisabledContextFiles()).toEqual(newDisabled);
  });
});
