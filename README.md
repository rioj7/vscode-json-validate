Validate part(s) of a file that should be valid JSON text. For JSON text that is allowed to have comments (`//`) there is a different validate command.

When you have in your source code a string that is a JSON object after parsing. With this extension you can validate if the text is able to parse to a JSON object.

1. Select part of the file (can be multiple parts with Multi Cursor).
1. Select from the Command Palette or the editor context menu: **Validate JSON** or **Validate JSON with Comments**
1. Each selection is parsed and if an error is found you get a warning message with the possibility to go to the line with the error.

If nothing is selected the whole file is validated.

## Release Notes

### 1.1.0
* validate JSON with Comments

### 1.0.0 Initial release
