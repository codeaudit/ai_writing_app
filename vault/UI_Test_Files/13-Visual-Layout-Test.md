---
id: doc-ui-test-visual-layout
createdAt: '2025-03-15T19:20:00.000Z'
updatedAt: '2025-03-15T19:20:00.000Z'
versions:
  - id: ver-ui-test-visual-layout-initial
    createdAt: '2025-03-15T19:20:00.000Z'
    message: Initial version
annotations:
  - id: anno-layout-1
    documentId: doc-ui-test-visual-layout
    startOffset: 800
    endOffset: 900
    content: "This tests how annotations appear on complex visual layouts."
    color: purple
    createdAt: '2025-03-15T19:20:10.000Z'
    updatedAt: '2025-03-15T19:20:10.000Z'
    tags: ["layout", "visual"]
tags:
  - layout
  - visual
  - design
  - formatting
---

# Visual Layout and Formatting Test

This document tests how the UI handles various visual layouts, alignments, and complex formatting structures.

## Text Alignment

### Left Alignment (Default)
This text is left-aligned, which is the default for most markdown renderers.
It should align with the left margin of the document.
Multiple lines should all start at the same left position.

### Center Alignment (if supported)
<div align="center">
This text should be center-aligned if the renderer supports HTML alignment tags.
Each line should be centered relative to the document width.
This tests how the UI handles centered text blocks.
</div>

### Right Alignment (if supported)
<div align="right">
This text should be right-aligned if the renderer supports HTML alignment tags.
Each line should align with the right margin of the document.
This tests how the UI handles right-aligned text blocks.
</div>

### Justified Text (if supported)
<div style="text-align: justify;">
This paragraph should have justified text if the renderer supports this styling. Justified text aligns to both the left and right margins, creating a clean edge on both sides. This is commonly used in books, newspapers, and magazines to create a more formal look. This paragraph is intentionally long to demonstrate the effect of justification across multiple lines of text. The spacing between words is adjusted to ensure that each line reaches both margins except for the last line of the paragraph.
</div>

## Indentation and Margins

### Blockquotes with Varying Depths
> First level of indentation
>> Second level of indentation
>>> Third level of indentation
>>>> Fourth level of indentation
>>>>> Fifth level of indentation

### Mixed Indentation
> Blockquote with a list inside:
> - Item 1
> - Item 2
>   - Nested item 2.1
>   - Nested item 2.2
> - Item 3
> 
> And a code block inside:
> ```
> function test() {
>   console.log("Code inside blockquote");
> }
> ```

## Columns and Multi-Column Layout (if supported)

<div style="column-count: 2; column-gap: 40px;">
This text should be displayed in a two-column layout if the renderer supports CSS columns. This tests how the UI handles multi-column text flows. The text should flow from the top of the first column to the bottom, then continue at the top of the second column.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget aliquam nisl nisl eget nisl. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget aliquam nisl nisl eget nisl.

Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo.
</div>

<div style="column-count: 3; column-gap: 20px; margin-top: 20px;">
This text should be displayed in a three-column layout. This tests how the UI handles more complex multi-column arrangements. Each column should be narrower than in the two-column layout above.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
</div>

## Grid Layouts (if supported)

<div style="display: grid; grid-template-columns: 1fr 1fr; grid-gap: 20px;">
  <div style="background-color: #f0f0f0; padding: 10px;">
    <h3>Grid Cell 1</h3>
    <p>This is the content for grid cell 1. It should appear in the first column of a two-column grid.</p>
  </div>
  <div style="background-color: #f0f0f0; padding: 10px;">
    <h3>Grid Cell 2</h3>
    <p>This is the content for grid cell 2. It should appear in the second column of a two-column grid.</p>
  </div>
  <div style="background-color: #f0f0f0; padding: 10px;">
    <h3>Grid Cell 3</h3>
    <p>This is the content for grid cell 3. It should appear in the first column of the second row.</p>
  </div>
  <div style="background-color: #f0f0f0; padding: 10px;">
    <h3>Grid Cell 4</h3>
    <p>This is the content for grid cell 4. It should appear in the second column of the second row.</p>
  </div>
</div>

## Flexbox Layout (if supported)

<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <div style="flex: 1; min-width: 200px; background-color: #e0e0e0; padding: 10px;">
    <h3>Flex Item 1</h3>
    <p>This is a flexible box item that should resize based on available space.</p>
  </div>
  <div style="flex: 1; min-width: 200px; background-color: #e0e0e0; padding: 10px;">
    <h3>Flex Item 2</h3>
    <p>This is another flexible box item that should resize based on available space.</p>
  </div>
  <div style="flex: 1; min-width: 200px; background-color: #e0e0e0; padding: 10px;">
    <h3>Flex Item 3</h3>
    <p>This is a third flexible box item that should resize based on available space.</p>
  </div>
</div>

## Text Wrapping Around Images (if supported)

<div>
  <img src="https://via.placeholder.com/150" style="float: left; margin-right: 10px;" alt="Placeholder image">
  <p>This text should wrap around the image on the left if the renderer supports CSS floating. This tests how the UI handles text flow around floating elements. The text should continue to wrap around the image until it extends past the bottom of the image, at which point it should return to using the full width of the container. This paragraph is intentionally long to demonstrate the wrapping behavior.</p>
</div>

<div style="clear: both; margin-top: 20px;">
  <img src="https://via.placeholder.com/150" style="float: right; margin-left: 10px;" alt="Placeholder image">
  <p>This text should wrap around the image on the right if the renderer supports CSS floating. This tests how the UI handles text flow around floating elements positioned on the right side. The text should continue to wrap around the image until it extends past the bottom of the image, at which point it should return to using the full width of the container. This paragraph is intentionally long to demonstrate the wrapping behavior.</p>
</div>

## Complex Nested Structures

### Nested Tables

<table>
  <tr>
    <th>Header 1</th>
    <th>Header 2</th>
    <th>Header 3</th>
  </tr>
  <tr>
    <td>
      <table>
        <tr>
          <td>Nested Table Cell 1</td>
          <td>Nested Table Cell 2</td>
        </tr>
        <tr>
          <td>Nested Table Cell 3</td>
          <td>Nested Table Cell 4</td>
        </tr>
      </table>
    </td>
    <td>Regular Cell</td>
    <td>
      <ul>
        <li>List item in table</li>
        <li>Another list item</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td>Cell with code</td>
    <td>
      ```
      function inTable() {
        return true;
      }
      ```
    </td>
    <td>
      > Blockquote in table cell
      > Second line
    </td>
  </tr>
</table>

### Complex List Structures

- Level 1 item
  - Level 2 item
    - Level 3 item
      - Level 4 item
        - Level 5 item
          - Level 6 item
            - Level 7 item
              - Level 8 item
  - Level 2 item with table
    | Col 1 | Col 2 |
    |-------|-------|
    | Data 1 | Data 2 |
  - Level 2 item with code
    ```javascript
    function nestedInList() {
      console.log("This code is nested in a list");
    }
    ```
  - Level 2 item with blockquote
    > This blockquote is nested in a list
    > It has multiple lines
    >> And even a nested blockquote

## Horizontal Spacing and Alignment

### Fixed-Width Monospace Text Blocks

```
Column 1    Column 2    Column 3    Column 4    Column 5
--------    --------    --------    --------    --------
Value 1     Value 2     Value 3     Value 4     Value 5
Longer Val  Short       Medium Val  Very very   Last one
                                    long value
```

### ASCII Art

```
    +-------------+
    |             |
    |  Markdown   |
    |  Renderer   |
    |             |
    +------+------+
           |
           v
    +------+------+
    |             |
    |  Formatted  |
    |  Output     |
    |             |
    +-------------+
```

### Tabs and Spaces Alignment (Monospace)

```
Name        Age     Occupation
----        ---     ----------
John Doe    32      Developer
Jane Smith  28      Designer
Bob Johnson 45      Manager
```

## Text Decorations (if supported)

<span style="text-decoration: underline;">This text should be underlined</span>

<span style="text-decoration: line-through;">This text should have a strikethrough</span>

<span style="text-decoration: overline;">This text should have an overline</span>

<span style="text-decoration: underline overline;">This text should have both underline and overline</span>

## Text Effects (if supported)

<span style="font-size: 1.5em;">Larger text</span>

<span style="font-size: 0.8em;">Smaller text</span>

<span style="color: red;">Red text</span>

<span style="color: blue;">Blue text</span>

<span style="background-color: yellow;">Text with yellow highlight</span>

<span style="text-shadow: 2px 2px 2px #888;">Text with shadow effect</span>

## Responsive Layout Tests

### Wide Content

This is a very long line of text that should test how the UI handles content that exceeds the width of the viewport. It should either wrap to the next line, show a horizontal scrollbar, or handle the overflow in some other way depending on the implementation of the markdown renderer and the CSS styling applied to it.

### Wide Table

| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 | Column 9 | Column 10 | Column 11 | Column 12 |
|----------|----------|----------|----------|----------|----------|----------|----------|----------|-----------|-----------|-----------|
| Data 1   | Data 2   | Data 3   | Data 4   | Data 5   | Data 6   | Data 7   | Data 8   | Data 9   | Data 10   | Data 11   | Data 12   |

### Wide Image

![Wide image](https://via.placeholder.com/1500x300)

## Print Layout Testing

<div class="page-break-after">
This content should be followed by a page break when printing if the renderer supports CSS page break controls.
</div>

<div class="page-break-before">
This content should be preceded by a page break when printing if the renderer supports CSS page break controls.
</div>

<div class="no-page-break-inside">
This entire block should be kept together on the same page when printing if the renderer supports CSS page break controls. It should not be split across multiple pages.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget aliquam nisl nisl eget nisl.
</div>

## Layout Resources

- [[#Text Alignment|Text Alignment Examples]]
- [[#Indentation and Margins|Indentation Examples]]
- [[#Columns and Multi-Column Layout (if supported)|Column Layout Examples]]
- [[#Grid Layouts (if supported)|Grid Layout Examples]]
- [[#Complex Nested Structures|Complex Structure Examples]]

---

*This document is for testing purposes and contains various layout examples to test UI rendering capabilities.*
