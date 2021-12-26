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
var placeCursorAfterPreviousChar = true;

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
              atChar
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
          if (ch === '{') {
              next('{');
              white();
              if (ch === '}') {
                  next('}');
                  return object;   // empty object
              }
              while (ch) {
                  key = string();
                  white();
                  next(':');
                  if (_options.strict === true && Object.hasOwnProperty.call(object, key)) {
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

/** @param {string} text @param {vscode.Position} startPosition @param {boolean} allowComments */
function validateJSONAtLine(text, startPosition, allowComments) {
  let lineMsg = 'Goto line: ';
  try {
    jsonParse(text, startPosition.line, startPosition.character, allowComments);
  }
  catch (e) {
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

/** @param {vscode.TextEditor} editor */
function validateJSON(editor, edit, args, allowComments) {
  if (editor.selection.isEmpty) {
    validateJSONAtLine(editor.document.getText(), new vscode.Position(0,0), allowComments);
  }
  else {
    for (const selection of editor.selections) {
      if (selection.isEmpty) { continue; }
      validateJSONAtLine(editor.document.getText(selection), selection.start, allowComments);
    }
  }
}

function activate(context) {
  let extensionShortName = 'jsonvalidate';
  function updateConfiguration() {
    let config = vscode.workspace.getConfiguration(extensionShortName);
    placeCursorAfterPreviousChar = config.get('placeCursorAfterPreviousChar');
  }
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('jsonvalidate.validate', validateJSON));
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('jsonvalidate.validateWithComments', (editor, edit, args) => validateJSON(editor, edit, args, true)));
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration( async configevent => {
    if (configevent.affectsConfiguration(extensionShortName)) {
      updateConfiguration();
    }
  }));
  updateConfiguration();
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
}
