Validate part(s) of a file that should be valid JSON text. For JSON text that is allowed to have comments (`//`) there is a different validate command.

When you have in your source code a string that is a JSON object after parsing. With this extension you can validate if the text is able to parse to a JSON object.

1. Select part of the file (can be multiple parts with Multi Cursor).
1. Select from the Command Palette or the editor context menu: **Validate JSON** or **Validate JSON with Comments**
1. Each selection is parsed and if an error is found you get a warning message with the possibility to go to the line with the error.

Only the **first error** in each selection is shown. Repeat the check until you don't get any error.

If nothing is selected the whole file is validated.

The errors shown in the PROBLEMS panel will not be removed when you fix the problem, the validator does work at the background (it does not know the syntax of your file). You have to validate the region again.

# Configuration

* `jsonvalidate.placeCursorAfterPreviousChar` : When the next character expected is a `,` or `:` use the location after the previous non whitespace character. Comments are considered whitespace. (default: `true`)
* `jsonvalidate.errorsInProblemPane` : Report an error in the PROBLEMS pane (red squiggles). (default: `true`)
* `jsonvalidate.errorsByMessages` : Report an error with a Warning message. (default: `true`)

## Release Notes

### 1.3.0
* `jsonvalidate.errorsInProblemPane`
* `jsonvalidate.errorsByMessages`

### 1.2.0
* Place cursor after previous character for , and : - Can be changed by setting.

### 1.1.0
* validate JSON with Comments
* show character position in error message and move cursor there

### 1.0.0 Initial release
