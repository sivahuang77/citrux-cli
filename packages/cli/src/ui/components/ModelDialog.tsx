/**
 * @license
 * Copyright 2025 Google LLC
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
import { SettingScope, type ProviderConfig } from '../../config/settings.js';
import { TextInput } from './shared/TextInput.js';
import { useTextBuffer } from './shared/text-buffer.js';

interface ModelDialogProps {
  onClose: () => void;
}

type DialogView =
  | 'main'
  | 'manual'
  | 'provider'
  | 'config_name'
  | 'config_key'
  | 'config_url'
  | 'config_model';

export function ModelDialog({ onClose }: ModelDialogProps): React.JSX.Element {
  const config = useContext(ConfigContext);
  const settings = useSettings();
  const [view, setView] = useState<DialogView>('main');
  const [wizardData, setWizardData] = useState<{
    name?: string;
    url?: string;
    key?: string;
  }>({});

  const mergedSettings = settings.merged as {
    llm?: { provider?: string; providers?: Record<string, ProviderConfig> };
  };
  const currentProvider = mergedSettings.llm?.provider || 'gemini';

  const customProviders = useMemo(
    () => mergedSettings.llm?.providers || {},
    [mergedSettings.llm?.providers],
  );

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
        } else if (view === 'config_name') {
          setView('provider');
        } else if (view === 'config_url') {
          setView('config_name');
        } else if (view === 'config_key') {
          setView('config_url');
        } else if (view === 'config_model') {
          setView('config_key');
        } else {
          onClose();
        }
      }
      if (
        key.name === 'return' &&
        (view === 'config_name' ||
          view === 'config_key' ||
          view === 'config_url' ||
          view === 'config_model')
      ) {
        const value = buffer.text;

        if (view === 'config_name') {
          setWizardData({ ...wizardData, name: value });
          setView('config_url');
          buffer.setText('');
        } else if (view === 'config_url') {
          setWizardData({ ...wizardData, url: value });
          setView('config_key');
          buffer.setText('');
        } else if (view === 'config_key') {
          setWizardData({ ...wizardData, key: value });
          setView('config_model');
          buffer.setText('');
        } else if (view === 'config_model') {
          const finalName = wizardData.name || 'custom';
          settings.setValue(
            SettingScope.User,
            `llm.providers.${finalName}.baseUrl`,
            wizardData.url,
          );
          settings.setValue(
            SettingScope.User,
            `llm.providers.${finalName}.apiKey`,
            wizardData.key,
          );
          settings.setValue(
            SettingScope.User,
            `llm.providers.${finalName}.model`,
            value,
          );
          settings.setValue(
            SettingScope.User,
            `llm.providers.${finalName}.label`,
            finalName,
          );

          settings.setValue(SettingScope.User, 'llm.provider', finalName);
          if (config) {
            void config.refreshProvider();
          }
          setView('main');
        }
      }
    },
    { isActive: true },
  );

  const mainOptions = useMemo(
    () => [
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
    ],
    [currentProvider],
  );

  const providerOptions = useMemo(() => {
    const options = [
      {
        value: 'opencode',
        title: 'OpenCode Zen',
        description: 'Free Tier AI Gateway',
        key: 'opencode',
      },
      {
        value: 'gemini',
        title: 'Google Gemini',
        description: 'Built-in Google AI',
        key: 'gemini',
      },
      {
        value: 'openai',
        title: 'OpenAI',
        description: 'Built-in OpenAI preset',
        key: 'openai',
      },
      {
        value: 'deepseek',
        title: 'DeepSeek',
        description: 'Built-in DeepSeek preset',
        key: 'deepseek',
      },
    ];

    Object.entries(customProviders).forEach(([key, p]) => {
      if (key !== 'openai' && key !== 'deepseek' && key !== 'opencode') {
        options.push({
          value: key,
          title: p.label || key,
          description: `Custom: ${p.baseUrl}`,
          key,
        });
      }
    });

    options.push({
      value: 'AddNew',
      title: '+ Add New Provider',
      description: 'Configure a new OpenAI-compatible API',
      key: 'AddNew',
    });
    return options;
  }, [customProviders]);

  const manualOptions = useMemo(() => {
    const list = [
      {
        value: DEFAULT_GEMINI_MODEL,
        title: DEFAULT_GEMINI_MODEL,
        key: DEFAULT_GEMINI_MODEL,
      },
      {
        value: DEFAULT_GEMINI_FLASH_MODEL,
        title: DEFAULT_GEMINI_FLASH_MODEL,
        key: DEFAULT_GEMINI_FLASH_MODEL,
      },
    ];

    const activeProv = mergedSettings.llm?.providers?.[currentProvider];
    if (activeProv?.model) {
      list.push({
        value: activeProv.model,
        title: activeProv.model,
        key: activeProv.model,
      });
    }

    return list;
  }, [currentProvider, mergedSettings.llm?.providers]);

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
      if (value === 'AddNew') {
        setWizardData({});
        setView('config_name');
        buffer.setText('');
        return;
      }

      if (view === 'provider') {
        const prov = customProviders[value];
        if (value !== 'gemini' && (!prov || !prov.apiKey)) {
          setWizardData({
            name: value,
            url:
              prov?.baseUrl ||
              (value === 'opencode' ? 'https://opencode.ai/zen/v1' : ''),
            key: prov?.apiKey || '',
          });
          setView('config_key');
          buffer.setText(prov?.apiKey || '');
          return;
        }
        settings.setValue(SettingScope.User, 'llm.provider', value);
        if (config) {
          void config.refreshProvider();
        }
        setView('main');
        return;
      }

      if (config) {
        config.setModel(value);
        const event = new ModelSlashCommandEvent(value);
        logModelSlashCommand(config, event);
      }
      onClose();
    },
    [config, onClose, view, settings, buffer, customProviders],
  );

  const getWizardTitle = () => {
    switch (view) {
      case 'config_name':
        return '1. Provider ID (e.g. ollama)';
      case 'config_url':
        return '2. Base URL (e.g. http://localhost:11434/v1)';
      case 'config_key':
        return '3. API Key (Optional)';
      case 'config_model':
        return '4. Default Model (e.g. llama3)';
      default:
        return '';
    }
  };

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.default}
      flexDirection="column"
      padding={1}
      width="100%"
    >
      <Text bold>Citrux Model & Provider Settings</Text>

      {view.startsWith('config_') ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color="orange" bold>
            Add New LLM Provider
          </Text>
          <Box marginTop={1}>
            <Text>{getWizardTitle()}:</Text>
          </Box>
          <Box
            borderStyle="single"
            borderColor={theme.border.focused}
            paddingX={1}
            marginTop={1}
          >
            <TextInput buffer={buffer} focus={true} />
          </Box>
          <Box marginTop={1}>
            <Text color={theme.text.secondary}>
              (Press Enter to continue, Esc to go back)
            </Text>
          </Box>
        </Box>
      ) : (
        <>
          <Box marginTop={1}>
            <DescriptiveRadioButtonSelect
              items={
                view === 'main'
                  ? mainOptions
                  : view === 'manual'
                    ? manualOptions
                    : providerOptions
              }
              onSelect={handleSelect}
              initialIndex={0}
              showNumbers={true}
            />
          </Box>
          <Box marginTop={1}>
            <Text color={theme.text.secondary}>
              (Press Esc to go back/close)
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
}
