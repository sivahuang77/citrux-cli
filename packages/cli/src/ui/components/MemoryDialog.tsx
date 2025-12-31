/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useCallback, useContext, useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useKeypress } from '../hooks/useKeypress.js';
import { theme } from '../semantic-colors.js';
import { ConfigContext } from '../contexts/ConfigContext.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { SettingScope } from '../../config/settings.js';
import {
  shortenPath,
  tildeifyPath,
  refreshServerHierarchicalMemory,
} from '@google/gemini-cli-core';

interface MemoryDialogProps {
  onClose: () => void;
}

export function MemoryDialog({
  onClose,
}: MemoryDialogProps): React.JSX.Element {
  const config = useContext(ConfigContext);
  const settings = useSettings();

  // We need all possible context files, including disabled ones.
  // The current config only knows about non-disabled ones.
  // So we re-scan to get the full list for management.
  const [allFiles, setAllPaths] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [disabledPaths, setDisabledPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (config) {
      // Get currently known active paths
      const currentActive = config.getCitruxMdFilePaths();
      // Get currently disabled paths from settings
      const contextSettings = settings.merged.context as
        | { disabledFiles?: string[] }
        | undefined;
      const disabledArray = contextSettings?.disabledFiles || [];
      const currentDisabled = new Set<string>(disabledArray);
      setDisabledPaths(currentDisabled);

      // The "all" list is union of active and disabled
      const union = Array.from(
        new Set<string>([...currentActive, ...disabledArray]),
      ).sort();
      setAllPaths(union);
    }
  }, [config, settings.merged.context]);

  const togglePath = useCallback(
    (path: string) => {
      const newDisabled = new Set<string>(disabledPaths);
      if (newDisabled.has(path)) {
        newDisabled.delete(path);
      } else {
        newDisabled.add(path);
      }
      setDisabledPaths(newDisabled);
    },
    [disabledPaths],
  );

  const handleSave = useCallback(async () => {
    const disabledList = Array.from(disabledPaths);
    settings.setValue(SettingScope.User, 'context.disabledFiles', disabledList);

    if (config) {
      config.setDisabledContextFiles(disabledList);
      // Trigger a refresh to apply changes
      await refreshServerHierarchicalMemory(config);
      await config.updateSystemInstructionIfInitialized();
    }
    onClose();
  }, [disabledPaths, settings, config, onClose]);

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        onClose();
      } else if (key.name === 'up') {
        setSelectedIndex((i) => (i > 0 ? i - 1 : allFiles.length - 1));
      } else if (key.name === 'down') {
        setSelectedIndex((i) => (i < allFiles.length - 1 ? i + 1 : 0));
      } else if (key.sequence === ' ') {
        if (allFiles[selectedIndex]) {
          togglePath(allFiles[selectedIndex]);
        }
      } else if (key.name === 'return') {
        void handleSave();
      }
    },
    { isActive: true },
  );

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.default}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Context File Management (CITRUX.md)</Text>
      <Box marginBottom={1}>
        <Text color={theme.text.secondary}>
          Use [Space] to toggle, [Enter] to save, [Esc] to cancel.
        </Text>
      </Box>

      {allFiles.length === 0 ? (
        <Text italic>No context files detected.</Text>
      ) : (
        <Box flexDirection="column">
          {allFiles.map((path, index) => {
            const isSelected = index === selectedIndex;
            const isDisabled = disabledPaths.has(path);
            const displayPath = shortenPath(tildeifyPath(path), 60);

            return (
              <Box key={path}>
                <Text color={isSelected ? theme.text.accent : undefined}>
                  {isSelected ? '> ' : '  '}
                  {isDisabled ? '[ ] ' : '[x] '}
                  <Text color={isDisabled ? theme.text.secondary : undefined}>
                    {displayPath}
                  </Text>
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
