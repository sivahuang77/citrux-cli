/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import semver from 'semver';
import { getPackageJson, debugLogger } from '@google/gemini-cli-core';
import type { LoadedSettings } from '../../config/settings.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fetch } from 'undici';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FETCH_TIMEOUT_MS = 5000;

// GitHub URL for Citrux CLI package.json
const GITHUB_PACKAGE_JSON_URL = 'https://raw.githubusercontent.com/sivahuang77/citrux-cli/main/package.json';

// Replicating the bits of UpdateInfo we need from update-notifier
export interface UpdateInfo {
  latest: string;
  current: string;
  name: string;
  type?: semver.ReleaseType;
}

export interface UpdateObject {
  message: string;
  update: UpdateInfo;
}

export async function checkForUpdates(
  settings: LoadedSettings,
): Promise<UpdateObject | null> {
  try {
    if (settings.merged.general?.disableUpdateNag) {
      return null;
    }
    // Skip update check when running from source (development mode)
    if (process.env['DEV'] === 'true') {
      return null;
    }
    const packageJson = await getPackageJson(__dirname);
    if (!packageJson || !packageJson.name || !packageJson.version) {
      return null;
    }

    const { name, version: currentVersion } = packageJson;

    // Fetch latest version from GitHub
    const response = await fetch(GITHUB_PACKAGE_JSON_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });

    if (!response.ok) {
      return null;
    }

    const remotePackageJson = (await response.json()) as any;
    const latestUpdate = remotePackageJson.version;

    if (latestUpdate && semver.gt(latestUpdate, currentVersion)) {
      const message = `Citrux CLI update available! ${currentVersion} → ${latestUpdate}`;
      const type = semver.diff(latestUpdate, currentVersion) || undefined;
      return {
        message,
        update: {
          latest: latestUpdate,
          current: currentVersion,
          name,
          type,
        },
      };
    }

    return null;
  } catch (e) {
    debugLogger.warn('Failed to check for updates: ' + e);
    return null;
  }
}
