/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import * as os from 'node:os';
import * as path from 'node:path';

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    mkdirSync: vi.fn(),
  };
});

import { Storage } from './storage.js';
import { CITRUX_DIR } from '../utils/paths.js';

describe('Storage – getGlobalSettingsPath', () => {
  it('returns path to ~/.citrux/settings.json', () => {
    const expected = path.join(os.homedir(), CITRUX_DIR, 'settings.json');
    expect(Storage.getGlobalSettingsPath()).toBe(expected);
  });
});

describe('Storage – additional helpers', () => {
  const projectRoot = '/tmp/project';
  const storage = new Storage(projectRoot);

  it('getWorkspaceSettingsPath returns project/.citrux/settings.json', () => {
    const expected = path.join(projectRoot, CITRUX_DIR, 'settings.json');
    expect(storage.getWorkspaceSettingsPath()).toBe(expected);
  });

  it('getUserCommandsDir returns ~/.citrux/commands', () => {
    const expected = path.join(os.homedir(), CITRUX_DIR, 'commands');
    expect(Storage.getUserCommandsDir()).toBe(expected);
  });

  it('getProjectCommandsDir returns project/.citrux/commands', () => {
    const expected = path.join(projectRoot, CITRUX_DIR, 'commands');
    expect(storage.getProjectCommandsDir()).toBe(expected);
  });

  it('getUserSkillsDir returns ~/.citrux/skills', () => {
    const expected = path.join(os.homedir(), CITRUX_DIR, 'skills');
    expect(Storage.getUserSkillsDir()).toBe(expected);
  });

  it('getProjectSkillsDir returns project/.citrux/skills', () => {
    const expected = path.join(projectRoot, CITRUX_DIR, 'skills');
    expect(storage.getProjectSkillsDir()).toBe(expected);
  });

  it('getUserAgentsDir returns ~/.citrux/agents', () => {
    const expected = path.join(os.homedir(), CITRUX_DIR, 'agents');
    expect(Storage.getUserAgentsDir()).toBe(expected);
  });

  it('getProjectAgentsDir returns project/.citrux/agents', () => {
    const expected = path.join(projectRoot, CITRUX_DIR, 'agents');
    expect(storage.getProjectAgentsDir()).toBe(expected);
  });

  it('getMcpOAuthTokensPath returns ~/.citrux/mcp-oauth-tokens.json', () => {
    const expected = path.join(
      os.homedir(),
      CITRUX_DIR,
      'mcp-oauth-tokens.json',
    );
    expect(Storage.getMcpOAuthTokensPath()).toBe(expected);
  });

  it('getGlobalBinDir returns ~/.citrux/tmp/bin', () => {
    const expected = path.join(os.homedir(), CITRUX_DIR, 'tmp', 'bin');
    expect(Storage.getGlobalBinDir()).toBe(expected);
  });
});
