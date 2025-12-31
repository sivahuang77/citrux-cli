/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fsPromises from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadServerHierarchicalMemory } from './memoryDiscovery.js';
import { FileDiscoveryService } from '../services/fileDiscoveryService.js';
import { SimpleExtensionLoader } from './extensionLoader.js';

vi.mock('os', async (importOriginal) => {
  const actualOs = await importOriginal<typeof os>();
  return {
    ...actualOs,
    homedir: vi.fn(),
  };
});

describe('Context Management Functionality', () => {
  let testRootDir: string;
  let projectRoot: string;
  let homedir: string;

  async function createEmptyDir(fullPath: string) {
    await fsPromises.mkdir(fullPath, { recursive: true });
    return fullPath;
  }

  async function createTestFile(fullPath: string, fileContents: string) {
    await fsPromises.mkdir(path.dirname(fullPath), { recursive: true });
    await fsPromises.writeFile(fullPath, fileContents);
    return path.resolve(testRootDir, fullPath);
  }

  beforeEach(async () => {
    testRootDir = await fsPromises.mkdtemp(
      path.join(os.tmpdir(), 'citrux-context-test-'),
    );
    projectRoot = await createEmptyDir(path.join(testRootDir, 'project'));
    homedir = await createEmptyDir(path.join(testRootDir, 'userhome'));
    vi.mocked(os.homedir).mockReturnValue(homedir);
  });

  afterEach(async () => {
    await fsPromises.rm(testRootDir, { recursive: true, force: true });
  });

  it('should filter out disabled context files', async () => {
    const file1 = await createTestFile(
      path.join(projectRoot, 'CITRUX.md'),
      'Content from file 1',
    );
    const file2 = await createTestFile(
      path.join(projectRoot, 'subdir', 'CITRUX.md'),
      'Content from file 2',
    );

    // Initial state: both should be loaded
    const resultAll = await loadServerHierarchicalMemory(
      projectRoot,
      [],
      false,
      new FileDiscoveryService(projectRoot),
      new SimpleExtensionLoader([]),
      true,
      'tree',
      undefined,
      200,
      [], // No disabled files
    );

    expect(resultAll.fileCount).toBe(2);
    expect(resultAll.filePaths).toContain(file1);
    expect(resultAll.filePaths).toContain(file2);

    // State 2: Disable file2
    const resultFiltered = await loadServerHierarchicalMemory(
      projectRoot,
      [],
      false,
      new FileDiscoveryService(projectRoot),
      new SimpleExtensionLoader([]),
      true,
      'tree',
      undefined,
      200,
      [file2], // Disable file2
    );

    expect(resultFiltered.fileCount).toBe(1);
    expect(resultFiltered.filePaths).toContain(file1);
    expect(resultFiltered.filePaths).not.toContain(file2);
    expect(resultFiltered.memoryContent).toContain('Content from file 1');
    expect(resultFiltered.memoryContent).not.toContain('Content from file 2');
  });
});
