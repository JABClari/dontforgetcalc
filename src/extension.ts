import * as vscode from 'vscode';
import postcss from 'postcss';
import safeParser from 'postcss-safe-parser';

let isEnabled = false; // Start with disabled state

const missingCalcDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: '#ffff004f'
});

export function activate(context: vscode.ExtensionContext) {
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('dontForgetCalc');
    context.subscriptions.push(diagnosticCollection);

    const updateDecorationsAndDiagnostics = (editor: vscode.TextEditor | undefined) => {
        if (editor && isEnabled) {
            checkForMissingCalc(editor.document, diagnosticCollection);
            triggerUpdateDecorations(editor);
        }
    };

    vscode.window.onDidChangeActiveTextEditor(editor => {
        updateDecorationsAndDiagnostics(editor);
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document) {
            updateDecorationsAndDiagnostics(editor);
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidOpenTextDocument(document => {
        const editor = vscode.window.activeTextEditor;
        if (editor && document === editor.document) {
            updateDecorationsAndDiagnostics(editor);
        }
    }, null, context.subscriptions);

    const toggleWarnings = (enable: boolean) => {
        isEnabled = enable;
        vscode.window.showInformationMessage(`Calc warnings ${isEnabled ? 'enabled' : 'disabled'}`);
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            if (isEnabled) {
                updateDecorationsAndDiagnostics(editor);
            } else {
                diagnosticCollection.clear();
                editor.setDecorations(missingCalcDecorationType, []);
            }
        }
    };

    const showInitialDialog = () => {
        vscode.window.showInformationMessage(
            'Do you want to check for missing calcs?',
            { modal: true },
            'Enable',
            'Disable'
        ).then(selection => {
            if (selection === 'Enable') {
                toggleWarnings(true);
            } else {
                toggleWarnings(false);
            }
        });
    };

    context.subscriptions.push(vscode.commands.registerCommand('dontForgetCalc.toggleWarnings', () => {
        toggleWarnings(!isEnabled);
    }));

    // Show the initial dialog on activation
    showInitialDialog();

    // Initialize decorations and diagnostics for the currently active editor
    if (vscode.window.activeTextEditor) {
        updateDecorationsAndDiagnostics(vscode.window.activeTextEditor);
    }
}

class CalcChecker implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] {
        const codeActions: vscode.CodeAction[] = [];
        const text = document.getText(range);

        const replaceRegex = /(:\s*)(\d+\s*[%\w]+)\s*([+\-*\/])\s*(\d+\s*[%\w]+)(\s*;)/g;

        let match;
        while ((match = replaceRegex.exec(text)) !== null) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const matchRange = new vscode.Range(startPos, endPos);

            const fix = new vscode.CodeAction(`Consider using calc() for "${match[0]}"`, vscode.CodeActionKind.QuickFix);
            fix.edit = new vscode.WorkspaceEdit();
            fix.edit.replace(document.uri, matchRange, `${match[1]}calc(${match[2]} ${match[3]} ${match[4]})${match[5]}`);
            fix.isPreferred = true;
            codeActions.push(fix);
        }

        return codeActions;
    }
}

async function triggerUpdateDecorations(editor: vscode.TextEditor) {
    if (!isEnabled || editor.document.languageId !== 'css') {
        editor.setDecorations(missingCalcDecorationType, []);
        return;
    }

    const text = editor.document.getText();
    const ranges: vscode.Range[] = [];

    const root = postcss().process(text, { parser: safeParser, from: undefined }).root;
    root.walkDecls(decl => {
        const value = decl.value;
        if (decl.source && decl.source.start && decl.source.end && /[\+\-\*\/]/.test(value) && !/calc\(/.test(value) && !isStandaloneVar(value)) {
            const startPos = editor.document.positionAt(decl.source.start.offset);
            const endPos = editor.document.positionAt(decl.source.end.offset);
            const range = new vscode.Range(startPos, endPos);
            ranges.push(range);
        }
    });

    editor.setDecorations(missingCalcDecorationType, ranges);
}

async function checkForMissingCalc(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection) {
    if (document.languageId !== 'css' || !isEnabled) {
        return;
    }

    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();

    const root = postcss().process(text, { parser: safeParser, from: undefined }).root;
    root.walkDecls(decl => {
        const value = decl.value;

        if (decl.source && decl.source.start && decl.source.end && /[\+\-\*\/]/.test(value) && !/calc\(/.test(value) && !isStandaloneVar(value)) {
            const startPos = document.positionAt(decl.source.start.offset);
            const endPos = document.positionAt(decl.source.end.offset);
            const range = new vscode.Range(startPos, endPos);

            const diagnostic = new vscode.Diagnostic(range, `Consider using calc() for "${value}"`, vscode.DiagnosticSeverity.Warning);
            diagnostics.push(diagnostic);
        }
    });

    diagnosticCollection.set(document.uri, diagnostics);
}

function isStandaloneVar(value: string): boolean {
    return /^var\(--[^)]+\)$/.test(value.trim());
}

export function deactivate() {}
