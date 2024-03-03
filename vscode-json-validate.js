const vscode = require('vscode');

// Uses parse.js from the node-module json-bigint
// included here in the code because the browser version does not allow require (only one file to pack)
// code modified for validation only in Visual Studio Code
// add the ability to parse 'JSON with Comments' option

// json_parse.js START =============================================================================
/*
    json_parse.js
    2012-06-20

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
*/
var getProperty = (obj, prop, deflt) => { return obj.hasOwnProperty(prop) ? obj[prop] : deflt; };

var placeCursorAfterPreviousChar = true;
var errorsInProblemsPanel = true;
var errorsByMessages = true;

var json_parse = function () {
  "use strict";
  var _options = {
      "strict": true,       // generate syntax errors for "duplicate key"
      "storeAsString": true // values should be stored as BigNumber or a string
  };
  var at,     // The index of the next character
      ch,     // The current character
      atLine = 1, // The current line position
      atChar = 1, // The current character position in total text
      atLinePrevious,  // The previous non white space/comment character
      atCharPrevious,
      endLine,    // Character position of the end of the error range
      endChar,
      allowComments = false,
      insideComment = false,
      escapee = {
          '"':  '"',
          '\\': '\\',
          '/':  '/',
          b:    '\b',
          f:    '\f',
          n:    '\n',
          r:    '\r',
          t:    '\t'
      },
      text,

      error = function (m) { // Call error when something is wrong.
          throw {
              name:    'SyntaxError',
              message: m,
              atLine,
              atChar,
              endLine,
              endChar
          };
      },

      next = function (c) { // If a c parameter is provided, verify that it matches the current character.
          if (c && c !== ch) {
              if ((c === ',' || c === ':') && placeCursorAfterPreviousChar) {
                  atLine = atLinePrevious;
                  atChar = atCharPrevious+1;
              }
              error("Expected '" + c + "' instead of '" + ch + "'");
          }
          if (!insideComment && (ch > ' ')) {
              atLinePrevious = atLine;
              atCharPrevious = atChar;
          }
          // Get the next character. When there are no more characters, return the empty string.
          atChar += 1;  // \r will never be flagged as error
          ch = text.charAt(at);
          if (ch === '\n') { atLine += 1; atChar = -1; }
          at += 1;
          return ch;
      },

      number = function () {
          var string = '';

          if (ch === '-') {
              string = '-';
              next('-');
          }
          while (ch >= '0' && ch <= '9') {
              string += ch;
              next();
          }
          if (ch === '.') {
              string += '.';
              while (next() && ch >= '0' && ch <= '9') {
                  string += ch;
              }
          }
          if (ch === 'e' || ch === 'E') {
              string += ch;
              next();
              if (ch === '-' || ch === '+') {
                  string += ch;
                  next();
              }
              while (ch >= '0' && ch <= '9') {
                  string += ch;
                  next();
              }
          }
          return string; // _options.storeAsString
      },

      string = function () {
          var hex, i, string = '', uffff;
          // When parsing for string values, we must look for " and \ characters.
          if (ch === '"') {
              while (next()) {
                  if (ch === '"') {
                      next();
                      return string;
                  }
                  if (ch === '\\') {
                      next();
                      if (ch === 'u') {
                          uffff = 0;
                          for (i = 0; i < 4; i += 1) {
                              hex = parseInt(next(), 16);
                              if (!isFinite(hex)) {
                                  break;
                              }
                              uffff = uffff * 16 + hex;
                          }
                          string += String.fromCharCode(uffff);
                      } else if (typeof escapee[ch] === 'string') {
                          string += escapee[ch];
                      } else {
                          break;
                      }
                  } else {
                      string += ch;
                  }
              }
          }
          error("Bad string");
      },
      white = function () { // Skip whitespace.
          while (ch) {
              if (ch <= ' ') {
                  next();
                  continue;
              }
              if (!allowComments) { break; }
              if (!(ch === '/' && text.charAt(at) === '/')) { break; }
              insideComment = true;
              let curLine = atLine;
              while (ch && curLine === atLine) {
                  next();
              }
              insideComment = false;
          }
      },

      word = function () { // true, false, or null.
          switch (ch) {
          case 't':
              next('t');
              next('r');
              next('u');
              next('e');
              return true;
          case 'f':
              next('f');
              next('a');
              next('l');
              next('s');
              next('e');
              return false;
          case 'n':
              next('n');
              next('u');
              next('l');
              next('l');
              return null;
          }
          error("Unexpected '" + ch + "'");
      },

      value,  // Place holder for the value function.
      array = function () { // Parse an array value.
          var array = [];

          if (ch === '[') {
              next('[');
              white();
              if (ch === ']') {
                  next(']');
                  return array;   // empty array
              }
              while (ch) {
                  array.push(value());
                  white();
                  if (ch === ']') {
                      next(']');
                      return array;
                  }
                  next(',');
                  white();
              }
          }
          error("Bad array");
      },

      object = function () { // Parse an object value.
          var key, object = {};
          var keyString = { start: [0,0], end: [0,0]};
          if (ch === '{') {
              next('{');
              white();
              if (ch === '}') {
                  next('}');
                  return object;   // empty object
              }
              while (ch) {
                  keyString.start = [atLine, atChar];
                  key = string();
                  keyString.end = [atLine, atChar];
                  white();
                  next(':');
                  if (_options.strict === true && Object.hasOwnProperty.call(object, key)) {
                      [atLine, atChar] = keyString.start;
                      [endLine, endChar] = keyString.end;
                      error('Duplicate key "' + key + '"');
                  }
                  object[key] = value();
                  white();
                  if (ch === '}') {
                      next('}');
                      return object;
                  }
                  next(',');
                  white();
              }
          }
          error("Bad object");
      };

  value = function () {
      // Parse a JSON value. It could be an object, an array, a string, a number, or a word.
      white();
      switch (ch) {
      case '{':
          return object();
      case '[':
          return array();
      case '"':
          return string();
      case '-':
          return number();
      default:
          return ch >= '0' && ch <= '9' ? number() : word();
      }
  };
  return function (source, lineOffset, charOffset, _allowComments) {
      var result;
      text = source;
      at = 0;
      ch = ' ';
      atLine = lineOffset;
      atChar = charOffset-1; // we start with a ' ' in ch, first next reads first char
      endLine = undefined;
      endChar = undefined;
      allowComments = _allowComments;
      insideComment = false;
      result = value();
      white();
      if (ch) {
          error("Syntax error");
      }
      return result;
  };
}
// json_parse.js END ===============================================================================


let jsonParse = json_parse(); // no options and no reviver
/** @type {vscode.DiagnosticCollection} */
let diagnosticsCollection;
let diagnostics = [];
let blockDefs = [];
let extensionShortName = 'jsonvalidate';
const FORMAT_JSON = "json";
const FORMAT_JSON_COMMENTS = "jsonc";
const FORMAT_JSON_LINES = "jsonl";

/** @param {string} text @param {vscode.Position} startPosition @param {boolean} allowComments */
function validateJSONAtLine(text, startPosition, allowComments) {
  let lineMsg = 'Goto line: ';
  try {
    jsonParse(text, startPosition.line, startPosition.character, allowComments);
  }
  catch (e) {
    if (errorsInProblemsPanel) {
      let posStart = new vscode.Position(e.atLine, e.atChar);
      let posEnd = posStart;
      if (e.endLine !== undefined) {
        posEnd = new vscode.Position(e.endLine, e.endChar);
      }
      diagnostics.push({
        code: '',
        message: e.message,
        range: new vscode.Range(posStart, posEnd),
        severity: vscode.DiagnosticSeverity.Error,
        source: 'JSON Validate',
      });
    }
    if (!errorsByMessages) { return; }
    vscode.window.showErrorMessage(`JSON ${e.name} at line ${e.atLine+1}:${e.atChar+1} : ${e.message}`, { title: `${lineMsg}${e.atLine+1}:${e.atChar+1}` } )
    .then(e => {
      if (!e) { return; }
      if (e.title.startsWith(lineMsg)) {
        let editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        let [line,char] = e.title.substring(lineMsg.length).split(':').map(Number);
        editor.selections = [ new vscode.Selection(line-1,char-1,line-1,char-1) ];
      }
    });
  }
}

/** @param {vscode.TextDocument} document */
function updateDiagnosticsCollection(document) {
  diagnosticsCollection.set(document.uri, diagnostics.length === 0 ? undefined : diagnostics);
}

/** @param {readonly vscode.Selection[]} selections @param {vscode.TextDocument} document @param {string} format */
function validateSelections(selections, document, format) {
  const allowComments = format === FORMAT_JSON_COMMENTS;
  const whiteSpaceRegex = new RegExp(/^\s*$/);
  for (const selection of selections) {
    if (selection.isEmpty) { continue; }
    if (format !== FORMAT_JSON_LINES) {
      validateJSONAtLine(document.getText(selection), selection.start, allowComments);
    } else {
      for (let line = selection.start.line; line <= selection.end.line; ++line) {
        let startChar = (line === selection.start.line) ? selection.start.character : 0;
        let endChar = (line === selection.end.line) ? selection.end.character : document.lineAt(line).text.length;
        let lineSelection = new vscode.Selection(line, startChar, line, endChar);
        let lineText = document.getText(lineSelection);
        if (whiteSpaceRegex.test(lineText)) { continue; }
        validateJSONAtLine(lineText, lineSelection.start, allowComments);
      }
    }
  }
}

/** @param {vscode.TextEditor} editor */
function validateJSON(editor, edit, args, format) {
  if (!editor) { return; }
  if (format === undefined) { format = FORMAT_JSON; }
  diagnostics = [];
  if (editor.selections.length === 1 && editor.selection.isEmpty) {
    validateSelections([new vscode.Selection(new vscode.Position(0,0), editor.document.positionAt(editor.document.getText().length))], editor.document, format);
  }
  else {
    validateSelections(editor.selections, editor.document, format);
  }
  updateDiagnosticsCollection(editor.document);
}

/** @param {vscode.TextDocument} document */
function filterDocument(document, block) {
  const testDocProp = (propId, propGet) => {
    const prop = getProperty(block, propId);
    if (!prop) { return true; }
    return new RegExp(prop, 'i').test(propGet(document));
  };
  if (!testDocProp('filterLanguageID', d => d.languageId )) { return false; }
  if (!testDocProp('filterFilePath', d => d.uri.path)) { return false; }
  return true;
}

/** @param {vscode.TextEditor} editor */
function updateConfiguration(editor) {
  let config = vscode.workspace.getConfiguration(extensionShortName);
  placeCursorAfterPreviousChar = config.get('placeCursorAfterPreviousChar');
  errorsInProblemsPanel = config.get('errorsInProblemsPanel');
  errorsByMessages = config.get('errorsByMessages');
  vscode.commands.executeCommand('setContext', 'jsonvalidate:validate', config.get('showValidateJsonInContextMenu'));
  vscode.commands.executeCommand('setContext', 'jsonvalidate:validateWithComments', config.get('showValidateJsonWithCommentsInContextMenu'));
  vscode.commands.executeCommand('setContext', 'jsonvalidate:validateLines', config.get('showValidateJsonLinesInContextMenu'));
  blockDefs = [];
  if (!editor) { return; }
  let blocksConfig = {
    "Liquid schema": {
      "beforeStart": "\\{%\\s*schema\\s*%\\}",
      "afterEnd": "\\{%\\s*endschema\\s*%\\}",
      "filterLanguageID": "liquid"
    }
  };
  let blocks = config.get('blocks');
  for (const key in blocks) {
    if (!blocks.hasOwnProperty(key)) { continue; }
    blocksConfig[key] = blocks[key];
  }
  for (const key in blocksConfig) {
    if (!blocksConfig.hasOwnProperty(key)) { continue; }
    const block = blocksConfig[key];
    if (!filterDocument(editor.document, block)) { continue; }
    const beforeStart = getProperty(block, "beforeStart");
    const afterEnd = getProperty(block, "afterEnd");
    if (!(beforeStart && afterEnd)) { continue; }
    let flags = getProperty(block, "flags", "g");
    if (flags.indexOf("g") == -1) { flags += "g"; }
    let format = getProperty(block, "format");
    if (!format) {
      format = getProperty(block, "allowComments", false) ? FORMAT_JSON_COMMENTS : FORMAT_JSON;
    }
    blockDefs.push({
      beforeStart: new RegExp(beforeStart, flags),
      afterEnd: new RegExp(afterEnd, flags),
      format
    });
  }
}

/** @param {vscode.TextDocument} document */
function validateBlocks(document) {
  var docText = document.getText();
  diagnostics = [];
  for (const blockDef of blockDefs) {
    let selections = [];

    /** @type {RegExp} */
    let startRegex = blockDef.beforeStart;
    /** @type {RegExp} */
    let endRegex = blockDef.afterEnd;
    startRegex.lastIndex = 0;
    let resultStart, resultEnd;
    while ((resultStart=startRegex.exec(docText)) != null) {
      endRegex.lastIndex = startRegex.lastIndex;
      if ((resultEnd=endRegex.exec(docText)) == null) { break; }
      selections.push(new vscode.Selection(document.positionAt(startRegex.lastIndex), document.positionAt(resultEnd.index)));
      startRegex.lastIndex = endRegex.lastIndex;
    }
    validateSelections(selections, document, blockDef.format);
  }
  updateDiagnosticsCollection(document);
}

function activate(context) {
  diagnosticsCollection = vscode.languages.createDiagnosticCollection(extensionShortName);
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('jsonvalidate.validate', validateJSON));
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('jsonvalidate.validateWithComments', (editor, edit, args) => validateJSON(editor, edit, args, FORMAT_JSON_COMMENTS)));
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('jsonvalidate.validateLines', (editor, edit, args) => validateJSON(editor, edit, args, FORMAT_JSON_LINES)));
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration( configEvent => {
    if (configEvent.affectsConfiguration(extensionShortName)) {
      updateConfiguration(vscode.window.activeTextEditor);
    }
  }));
  const changeTextEditor = (editor) => {
    updateConfiguration(vscode.window.activeTextEditor);
    if (!editor) { return; }
    validateBlocks(editor.document);
  };
  changeTextEditor(vscode.window.activeTextEditor);
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument( textDocEvent => {
    if (textDocEvent.contentChanges.length === 0) { return; }
    validateBlocks(textDocEvent.document);
  }));
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument( document => {
    if (!document) { return; }
    diagnostics = [];
    updateDiagnosticsCollection(document);
  }));
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor ( editor => {
    changeTextEditor(editor);
  }));
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
}
