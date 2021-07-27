import { basename } from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

/**
 * Activate extension
 *
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext)
{
	registerComment(context, 'file-management.copyFileName', copyFileName);
	registerComment(context, 'file-management.renameFile', renameFile);
	registerComment(context, 'file-management.moveFile', moveFile);
	registerComment(context, 'file-management.deleteFile', deleteFile);
}

/**
 * Register command
 *
 * @param {vscode.ExtensionContext} context
 * @param {string} commandId Command ID
 * @param {() => void} func Function to call
 */
function registerComment(context: vscode.ExtensionContext, commandId: string, func: () => void)
{
	let disposable = vscode.commands.registerCommand(commandId, func);
	context.subscriptions.push(disposable);
}

/**
 * Copy file name
 */
async function copyFileName(): Promise<void>
{
	if (!vscode.window.activeTextEditor)
		vscode.window.showErrorMessage("No active editor to save.");
	else
	{
		const fileName = basename(vscode.window.activeTextEditor.document.uri.path);
		vscode.env.clipboard.writeText(fileName);
	}
}

/**
 * Rename file
 */
async function renameFile(): Promise<void>
{
	if (!vscode.window.activeTextEditor)
		vscode.window.showInformationMessage("No active editor to save.");
	else
	{
		let origUri = vscode.window.activeTextEditor.document.uri;
		let origName = basename(origUri.path);
		vscode.window.showInputBox({
			title: "New Filename",
			value: origName
		}).then((newName: string | undefined) => {
			if (newName === undefined)
				vscode.window.showInformationMessage("File rename cancelled.");
			else if (origName === newName)
				vscode.window.showErrorMessage("New and old file names are the same.");
			else
			{
				// Build new path and edit
				let newPath = origUri.path.substring(0, origUri.path.length - origName.length) + newName;
				let newUri = origUri.with({path: newPath});
				let edit = new vscode.WorkspaceEdit();
				edit.renameFile(origUri, newUri, {
					overwrite: true
				});
				// Build rename function
				let doRename = () => {
					vscode.workspace.applyEdit(edit).then((outcome: boolean) => {
						if (!outcome)
							vscode.window.showErrorMessage("Failed to rename file to " + newName + ".");
					});
				};

				// Confirm overwrite if needed
				if (fs.existsSync(newPath))
				{
					vscode.window.showInformationMessage(
						"File " + newName + " exists. Overwrite?",
						{
							modal: true
						},
						...["Yes", "No"]
					).then((answer) => {
						if (answer === "Yes")
							doRename();
						else
							vscode.window.showInformationMessage("File rename cancelled.");
					});
				}
				else
					doRename();
			}
		});
	}
}

/**
 * Move file
 */
async function moveFile(): Promise<void>
{
	if (!vscode.window.activeTextEditor)
		vscode.window.showInformationMessage("No active editor to save.");
	else
	{
		let origUri = vscode.window.activeTextEditor.document.uri;
		vscode.window.showSaveDialog({
			saveLabel: "Move",
			title: "Move File",
			defaultUri: origUri
		}).then((uri: vscode.Uri | undefined) => {
			if (uri === undefined)
				vscode.window.showInformationMessage("File move cancelled.");
			else if (uri.toString() === origUri.toString())
				vscode.window.showErrorMessage("New and old file names are the same.");
			else
			{
				let edit = new vscode.WorkspaceEdit();
				edit.renameFile(origUri, uri, {
					overwrite: true
				});
				vscode.workspace.applyEdit(edit).then((outcome: boolean) => {
					if (!outcome)
						vscode.window.showErrorMessage("Failed to rename file to " + uri.path + ".");
				});
			}
		});
	}
}

/**
 * Delete file
 */
async function deleteFile(): Promise<void>
{
	if (!vscode.window.activeTextEditor)
		vscode.window.showInformationMessage("No active editor to delete.");
	else
	{
		let uri = vscode.window.activeTextEditor.document.uri;
		vscode.window.showInformationMessage(
			"Are you sure you want to delete " + basename(uri.path) + "?",
			{
				modal: true
			},
			...["Yes", "No"]
		).then((answer) => {
			if (answer === "Yes")
			{
				let edit = new vscode.WorkspaceEdit();
				edit.deleteFile(uri);
				vscode.workspace.applyEdit(edit).then((outcome: boolean) => {
					if (!outcome)
						vscode.window.showErrorMessage("Failed to delete file.");
				});
			}
		});
	}
}

export function deactivate() {}
