/**
 * @license
 * Copyright 2025 Citrux
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useCallback, useContext, useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_MODEL_AUTO,
  ModelSlashCommandEvent,
  logModelSlashCommand,
  getDisplayString,
} from '@google/gemini-cli-core';
import { useKeypress } from '../hooks/useKeypress.js';
import { theme } from '../semantic-colors.js';
import { DescriptiveRadioButtonSelect } from './shared/DescriptiveRadioButtonSelect.js';
import { ConfigContext } from '../contexts/ConfigContext.js';
import { useSettings } from '../contexts/SettingsContext.js';
import { SettingScope } from '../../config/settings.js';
import { TextInput } from './shared/TextInput.js';
import { useTextBuffer } from './shared/text-buffer.js';

interface ModelDialogProps {
  onClose: () => void;
}

type DialogView = 'main' | 'manual' | 'provider' | 'config_key' | 'config_url';

export function ModelDialog({ onClose }: ModelDialogProps): React.JSX.Element {
  const config = useContext(ConfigContext);
  const settings = useSettings();
  const [view, setView] = useState<DialogView>('main');
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');

  const currentProvider = (settings.merged as any).llm?.provider || 'gemini';

  const buffer = useTextBuffer({
    initialText: '',
    viewport: { width: 50, height: 1 },
    singleLine: true,
    isValidPath: () => true,
  });

  useKeypress(
    (key) => {
      if (key.name === 'escape') {
        if (view === 'manual' || view === 'provider') {
          setView('main');
        } else if (view === 'config_key' || view === 'config_url') {
          setView('provider');
        } else {
          onClose();
        }
      }
      if (key.name === 'return' && (view === 'config_key' || view === 'config_url')) {
        const value = buffer.text;
        const path = view === 'config_key' 
          ? `llm.providers.${selectedProvider}.apiKey` 
          : `llm.providers.${selectedProvider}.baseUrl`;
        
        settings.setValue(SettingScope.User, path, value);
        
        if (view === 'config_key' && selectedProvider !== 'gemini') {
          setView('config_url');
          buffer.setText((settings.merged as any).llm?.providers?.[selectedProvider]?.baseUrl || '');
        } else {
          settings.setValue(SettingScope.User, 'llm.provider', selectedProvider);
          if (config) {
            (config as any).refreshProvider?.();
          }
          setView('main');
        }
      }
    },
    { isActive: true },
  );

  const mainOptions = useMemo(() => {
    const list = [
      {
        value: 'ChangeProvider',
        title: `Provider: ${currentProvider}`,
        description: 'Switch between Google, OpenAI, DeepSeek, etc.',
        key: 'ChangeProvider',
      },
      {
        value: DEFAULT_GEMINI_MODEL_AUTO,
        title: getDisplayString(DEFAULT_GEMINI_MODEL_AUTO),
        description: 'Let Citrux decide the best model for the task.',
        key: DEFAULT_GEMINI_MODEL_AUTO,
      },
      {
        value: 'Manual',
        title: 'More Models...',
        description: 'Manually select a specific model',
        key: 'Manual',
      },
    ];
    return list;
  }, [currentProvider]);

  const providerOptions = [
    { value: 'gemini', title: 'Google Gemini', description: 'Default Google AI models', key: 'gemini' },
    { value: 'openai', title: 'OpenAI', description: 'GPT-4o, GPT-4-turbo, etc.', key: 'openai' },
    { value: 'deepseek', title: 'DeepSeek', description: 'DeepSeek V3 / R1 (OpenAI Compatible)', key: 'deepseek' },
    { value: 'custom', title: 'Custom', description: 'Local LLM or other OpenAI-compatible API', key: 'custom' },
  ];

  const manualOptions = useMemo(() => {
    const list = [
      { value: DEFAULT_GEMINI_MODEL, title: DEFAULT_GEMINI_MODEL, key: DEFAULT_GEMINI_MODEL },
      { value: DEFAULT_GEMINI_FLASH_MODEL, title: DEFAULT_GEMINI_FLASH_MODEL, key: DEFAULT_GEMINI_FLASH_MODEL },
      { value: 'gpt-4o', title: 'gpt-4o', key: 'gpt-4o' },
      { value: 'deepseek-chat', title: 'deepseek-chat', key: 'deepseek-chat' },
    ];
    return list;
  }, []);

  const handleSelect = useCallback(
    (value: string) => {
      if (value === 'Manual') {
        setView('manual');
        return;
      }
      if (value === 'ChangeProvider') {
        setView('provider');
        return;
      }

      if (view === 'provider') {
        setSelectedProvider(value);
        if (value === 'gemini') {
          settings.setValue(SettingScope.User, 'llm.provider', 'gemini');
          if (config) {
            (config as any).refreshProvider?.();
          }
          setView('main');
        } else {
          setView('config_key');
          const existingKey = (settings.merged as any).llm?.providers?.[value]?.apiKey || '';
          buffer.setText(existingKey);
        }
        return;
      }

      if (config) {
        config.setModel(value);
        const event = new ModelSlashCommandEvent(value);
        logModelSlashCommand(config, event);
      }
      onClose();
    },
    [config, onClose, view, settings, buffer],
  );

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.default}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Citrux Model & Provider Settings</Text>

      {view === 'config_key' || view === 'config_url' ? (
        <Box flexDirection="column" marginTop={1}>
          <Text>Configuring <Text color="orange" bold>{selectedProvider.toUpperCase()}</Text></Text>
          <Box marginTop={1}>
            <Text>{view === 'config_key' ? 'Enter API Key:' : 'Enter Base URL:'}</Text>
          </Box>
          <Box borderStyle="single" borderColor={theme.border.focused} paddingX={1} marginTop={1}>
            <TextInput buffer={buffer} focus={true} />
          </Box>
          <Box marginTop={1}>
            <Text color={theme.text.secondary}>(Press Enter to save, Esc to cancel)</Text>
          </Box>
        </Box>
      ) : (
        <>
          <Box marginTop={1}>
            <DescriptiveRadioButtonSelect
              items={view === 'main' ? mainOptions : view === 'manual' ? manualOptions : providerOptions}
              onSelect={handleSelect}
              initialIndex={0}
              showNumbers={true}
            />
          </Box>
          <Box marginTop={1}>
            <Text color={theme.text.secondary}>(Press Esc to go back/close)</Text>
          </Box>
        </>
      )}
    </Box>
  );
}