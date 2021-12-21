const vscode = require('vscode');

// Uses parse.js from the node-module json-bigint
// included here in the code because the browser version does not allow require (only one file to pack)
// code modified for validation only in Visual Studio Code

// json_parse.js START =============================================================================
/*
    json_parse.js
    2012-06-20

    Public Domain.

    NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
*/

var json_parse = function () {
  "use strict";
  var _options = {
      "strict": true,       // generate syntax errors for "duplicate key"
      "storeAsString": true // values should be stored as BigNumber or a string
  };
  var at,     // The index of the current character
      ch,     // The current character
      atLine = 1, // The current line
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
              at:      atLine
          };
      },

      next = function (c) { // If a c parameter is provided, verify that it matches the current character.
          if (c && c !== ch) {
              error("Expected '" + c + "' instead of '" + ch + "'");
          }
          // Get the next character. When there are no more characters, return the empty string.
          ch = text.charAt(at);
          if (ch === '\n') { atLine += 1; }
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
          while (ch && ch <= ' ') {
              next();
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
  return function (source, lineOffset) {
      var result;
      text = source;
      at = 0;
      ch = ' ';
      atLine = lineOffset;
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

function validateJSONAtLine(text, lineOffset) {
  let lineMsg = 'Goto line: ';
  try {
    jsonParse(text, lineOffset);
  }
  catch (e) {
    vscode.window.showErrorMessage(`JSON ${e.name} at line ${e.at}: ${e.message}`, { title: `${lineMsg}${e.at}` } )
    .then(e => {
      if (!e) { return; }
      if (e.title.startsWith(lineMsg)) {
        let editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        let line = Number(e.title.substring(lineMsg.length));
        editor.selections = [ new vscode.Selection(line-1,0,line-1,0) ];
      }
    });
  }
}

/** @param {vscode.TextEditor} editor */
function validateJSON(editor, edit, args) {
  if (editor.selection.isEmpty) {
    validateJSONAtLine(editor.document.getText(), 1);
  }
  else {
    for (const selection of editor.selections) {
      if (selection.isEmpty) { continue; }
      validateJSONAtLine(editor.document.getText(selection), selection.start.line + 1);
    }
  }
}

function activate(context) {
  context.subscriptions.push(vscode.commands.registerTextEditorCommand('jsonvalidate.validate', validateJSON));
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
}
