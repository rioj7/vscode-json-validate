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
* `jsonvalidate.errorsInProblemsPanel` : Report an error in the PROBLEMS panel (red squiggles). (default: `true`)
* `jsonvalidate.errorsByMessages` : Report an error with a Warning message. (default: `true`)
* `jsonvalidate.blocks` : Define [blocks](#blocks) of the file to validate automatically.

# Blocks

If the part of the file that contains the JSON text has a known begin and end you can have that block validated automatically. The PROBLEMS panel will be updated. If you have the messages enabled you might get a lot of them.

The definition of a block is done in the configuration variable `jsonvalidate.blocks`. It is an object with:

* the key for the block can have any name, it can be used to override a definition.
* the properties for each block are
    * `flags`: a string with the regex flags "i" and/or "m" (default: "")
    * `beforeStart`: regular expression to search for the block start
    * `afterEnd`: regular expression to search for after the block start
    * `filterLanguageID`: (Optional) search for blocks in this file if LanguageID matches this regular expression (case insensitive) (default: undefined)
    * `filterFilePath`: (Optional) search for blocks in this file if the file path matches this regular expression (case insensitive) (default: undefined)
    * `allowComments`: (Optional) are comments allowed in this block (default: `false`)

If a `filter` property is not defined it will pass all files.

If a block is found, a different block is searched for in the rest of the file.

## Example

If you end the name of a variable with `JSON` you can define a block to validate.

```
  "jsonvalidate.blocks": {
    "Python String": {
      "beforeStart": "\\w+JSON\\s*=\\s*(\"\"\"|''')",
      "afterEnd": "(\"\"\"|''')",
      "filterFilePath": "\\.py$"
    },
    "JavaScript String": {
      "beforeStart": "\\w+JSON\\s*=\\s*`",
      "afterEnd": "`",
      "filterLanguageID": "javascript"
    }
  }
```

In JavaScript we use the backtick (template strings).

## Build in definition

The extension has a build in block definition (that can be overridden).

The [Liquid template](https://shopify.github.io/liquid/) definition can contain [schema](https://shopify.dev/themes/architecture/sections/section-schema) information between specific tags.

```
    "Liquid schema": {
      "beforeStart": "\\{%\\s*schema\\s*%\\}",
      "afterEnd": "\\{%\\s*endschema\\s*%\\}",
      "filterLanguageID": "liquid"
    }
```

You change this definition by using a name with the same key: `"Liquid schema"`

## Release Notes

### 1.4.0
* `jsonvalidate.blocks` validate automatically parts of the file
* `jsonvalidate.errorsInProblemPane` rename to `jsonvalidate.errorsInProblemsPanel`

### 1.3.0
* `jsonvalidate.errorsInProblemPane`
* `jsonvalidate.errorsByMessages`

### 1.2.0
* Place cursor after previous character for , and : - Can be changed by setting.

### 1.1.0
* validate JSON with Comments
* show character position in error message and move cursor there

### 1.0.0 Initial release
