/**
 * @license
 * Copyright 2025 Citrux
 * SPDX-License-Identifier: Apache-2.0
 */

import * as vscode from 'vscode';
import { DiffContentProvider, DiffManager } from './diff-manager.js';
import { OpenFilesManager } from './open-files-manager.js';
import { IDEServer } from './ide-server.js';

const INFO_MESSAGE_SHOWN_KEY = 'citruxCliInfoMessageShown';
export const DIFF_SCHEME = 'citrux-diff';

const logger = {
  log: (message: string) => {
    if (
      vscode.workspace
        .getConfiguration('citrux-cli.debug')
        .get('logging.enabled')
    ) {
      extensionLogger?.appendLine(message);
    }
  },
};

let extensionLogger: vscode.OutputChannel | undefined;
let ideServer: IDEServer | undefined;

export async function activate(context: vscode.ExtensionContext) {
  extensionLogger = vscode.window.createOutputChannel(
    'Citrux CLI IDE Companion',
  );
  logger.log('Citrux CLI IDE Companion activated.');

  const diffContentProvider = new DiffContentProvider();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      DIFF_SCHEME,
      diffContentProvider,
    ),
  );

  const diffManager = new DiffManager(logger.log, diffContentProvider);
  context.subscriptions.push(diffManager);

  const openFilesManager = new OpenFilesManager(context);
  ideServer = new IDEServer(logger.log, diffManager);

  await ideServer.start(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('citrux.diff.accept', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.uri.scheme === DIFF_SCHEME) {
        void diffManager.acceptDiff(editor.document.uri);
      }
    }),
    vscode.commands.registerCommand('citrux.diff.cancel', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.uri.scheme === DIFF_SCHEME) {
        void diffManager.cancelDiff(editor.document.uri);
      }
    }),
  );

  const version = context.extension.packageJSON.version;
  const lastShownVersion = context.globalState.get<string>(
    INFO_MESSAGE_SHOWN_KEY,
  );

  if (version !== lastShownVersion) {
    vscode.window
      .showInformationMessage(
        'Citrux CLI Companion extension successfully installed.',
        'Launch Citrux CLI',
      )
      .then((selection) => {
        if (selection === 'Launch Citrux CLI') {
          vscode.commands.executeCommand('citrux-cli.runCitruxCLI');
        }
      });
    context.globalState.update(INFO_MESSAGE_SHOWN_KEY, version);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('citrux-cli.runCitruxCLI', async () => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage(
          'No folder open. Please open a folder to run Citrux CLI.',
        );
        return;
      }

      let selectedFolder = folders[0];
      if (folders.length > 1) {
        const result = await vscode.window.showWorkspaceFolderPick({
          placeHolder: 'Select a folder to run Citrux CLI in',
        });
        if (result) {
          selectedFolder = result;
        }
      }

      const citruxCmd = 'citrux';
      const terminal = vscode.window.createTerminal({
        name: `Citrux CLI (${selectedFolder.name})`,
        cwd: selectedFolder.uri.fsPath,
      });
      terminal.show();
      terminal.sendText(citruxCmd);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('citrux-cli.showNotices', async () => {
      const noticePath = vscode.Uri.joinPath(
        context.extensionUri,
        'NOTICES.txt',
      );
      await vscode.window.showTextDocument(noticePath);
    }),
  );
}

export async function deactivate(): Promise<void> {
  logger.log('Extension deactivated');
  try {
    if (ideServer) {
      await ideServer.stop();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.log(`Failed to stop IDE server during deactivation: ${message}`);
  } finally {
    if (extensionLogger) {
      extensionLogger.dispose();
    }
  }
}