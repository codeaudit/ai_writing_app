import * as monaco from 'monaco-editor';

export function registerMDXLanguage(monacoInstance: typeof monaco) {
  // Skip if MDX language is already registered
  if (monacoInstance.languages.getLanguages().some(lang => lang.id === 'mdx')) {
    return;
  }

  // Register MDX as a language
  monacoInstance.languages.register({ id: 'mdx' });
  
  // Basic language configuration (indentation, brackets, etc.)
  monacoInstance.languages.setLanguageConfiguration('mdx', {
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
      ['<', '>'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '<', close: '>' },
      { open: '`', close: '`' },
      { open: '_', close: '_' },
      { open: '*', close: '*' },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '<', close: '>' },
      { open: '`', close: '`' },
      { open: '_', close: '_' },
      { open: '*', close: '*' },
    ],
    folding: {
      markers: {
        start: new RegExp('^\\s*<!--\\s*#?region\\b.*-->'),
        end: new RegExp('^\\s*<!--\\s*#?endregion\\b.*-->'),
      }
    }
  });
  
  // Register JSX completion provider
  monacoInstance.languages.registerCompletionItemProvider('mdx', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };
      
      // Get text before the cursor on the same line
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      
      // JSX tag suggestions
      if (textUntilPosition.endsWith('<')) {
        return {
          suggestions: [
            {
              label: 'div',
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: 'div>${1}</div>',
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Basic div element',
              range: range
            },
            {
              label: 'span',
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: 'span>${1}</span>',
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Inline span element',
              range: range
            },
            {
              label: 'Component',
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: 'Component>${1}</Component>',
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Custom component',
              range: range
            },
          ]
        };
      }
      
      return { suggestions: [] };
    }
  });
} 