# dont-forget-calc README
A simple extension to warn you when calc is missing in CSS computations.
We all know the frustration of dealing with unexpected layouts due to missing computated values in CSS. Don't Forget Calc helps you avoid that.

## Usage
Run the command oalette [CTRL/CMD + SHIFT+P ] and type `calc check` 
  - Enable it to actively check all css files for missing calc()
  - Disable it to not use the extension

## Features
 - Gives warning when the calc() function is missing.
 - Detect missing calc
 - Currently doesn't flag standalone var() or other functions like minmax and clamp.

## Extension Settings
This extension contributes the following settings:
- `dontForgetCalc.toggleWarnings`: Enable or disable calc warnings.

### Future Additions
 ##### Smart checks for CSS calculations calc():We're working on even more powerful features to keep your CSS calculations in tip-top shape:
  - Catch Missing Units: No more unitless custom variables messing things up!
  - Detect var without '--'
  - Check custom-value [+-] operations to make sure the custom variable is not unitless.
    e.g 
    --baseUnit:4
    calc(10px +var(--baseUnit))  should be calc(10px + 1px * var(--baseUnit));
  - Add tailwind,SASS and other css frameworks and compilers
