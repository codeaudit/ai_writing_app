 This UI showcases a feature integrated into a ChatGPT-like interface, designed to help users create more structured and reusable prompts using templates and variables.

**Core Components:**

1.  **Main Chat Input (`Message Chat`):** Standard text area for typing prompts.
2.  **Input Area Icons:**
    *   **`Blue Star Icon` (Key Feature Trigger):** This activates the prompt enhancement/library feature.
3.  **Prompt Enhancement Feature (Activated by Blue Star):** It operates in two main modes shown:
    *   **Template Insertion & Variable Editing Mode:** Activated when the input box is *empty* or contains a basic prompt. It inserts a template and allows variable customization.
    *   **Prompts Library Mode:** Activated when the user wants to *select* a pre-saved template from a library.
5.  **Prompt Template Text:** Text inserted into the main input box containing placeholders.
6.  **Variable Placeholders (`[Variable Name]`):** Specific parts of the template text (e.g., `[ Topic / Theme ]`, `[ Specific Goals ]`) highlighted or bracketed, indicating they are customizable variables.
7.  **Pop-up/Modal:** Appears when a variable placeholder is clicked.
    *   Displays the variable name (e.g., "Topic / Theme", "Specific Goals").
    *   Shows "Suggested Variables based on your profile" (or context).
    *   Lists specific values/options for the variable (e.g., "Key Nutrients", "Weight Loss").
    *   Includes an `+ Add New Value` button.
    *   Has icons for configuration (like docking) and closing (`X`).
8.  **"Promptimize" Sidebar:** A docked version of the pop-up, appearing on the right side of the screen. Contains the same variable editing or library content but stays persistent.
9.  **"Add New Value" Form (within Sidebar/Pop-up):** Appears when `+ Add New Value` is clicked.
    *   Input field for `Variable Value` (the text to insert).
    *   Text area for `Description` (metadata about the value).
    *   `Add New Value` confirmation button.

**Flow 1: Using a Template and Customizing Variables**

1.  **Start:** The user is on the initial ChatGPT screen with an empty input box.
2.  **Basic Prompt Input (Optional but shown):** User starts typing a basic prompt like "Write a blog post about healthy eating".
3.  **Trigger Prompt Enhancement:** User clicks the **Blue Star Icon**.
4.  **Template Insertion:** The system *clears* the current input (if any) and *inserts* a pre-defined, more structured prompt template into the main input box. This template contains variable placeholders like `[ Topic / Theme ]`, `[ Specific Goals ]`, `[ Extras / Downloadables ]`.
    *   *Implementation Detail:* The system needs a mechanism to select *which* template to insert. This could be based on the initial input (if any), context, or a default template. In this case, it seems a default or contextually relevant template for "blog post" was chosen.
5.  **Initiate Variable Customization (First Variable):** User clicks directly on the `[ Topic / Theme ]` placeholder within the main input box text.
6.  **Show Variable Suggestions:** The **"Promptimize" Pop-up/Modal** appears, anchored near the clicked placeholder. It displays suggestions specifically for "Topic / Theme" (e.g., "Key Nutrients", "Portion Control", "Fasting").
7.  **Select Suggestion:** User clicks on a suggestion (e.g., "Key Nutrients").
8.  **Update Prompt & Close Pop-up:** The pop-up closes, and the text `[ Topic / Theme ]` in the main input box is replaced with the selected value (`Key Nutrients`).
9.  **Initiate Variable Customization (Second Variable):** User clicks on the next placeholder, `[ Specific Goals ]`.
10. **Show Variable Suggestions (again):** The "Promptimize" Pop-up/Modal reappears, now showing suggestions relevant to "Specific Goals" (e.g., "Weight Loss", "Muscle Gain", "Rest").
11. **Change Layout:** User clicks the **Docking Icon** within the pop-up and selects "Right Side".
12. **Dock Sidebar:** The pop-up closes and reappears as the persistent **"Promptimize" Sidebar** on the right, still focused on editing "Specific Goals".
13. **Initiate Adding Custom Value:** User clicks the `+ Add New Value` button within the sidebar.
14. **Show Add Form:** The sidebar content changes to display the **"Add New Value" Form** (fields for "Variable Value" and "Description"). The context ("Add Specific Goals") is maintained.
15. **Enter Custom Value Details:** User types a new value name ("Ketosis") into the `Variable Value` field and adds a description in the `Description` text area.
16. **Save Custom Value:** User clicks the `Add New Value` button at the bottom of the form.
    *   *Implementation Detail:* This action should save the new value ("Ketosis") associated with the variable type ("Specific Goals") potentially linked to the user's profile or a workspace. The UI should ideally update the list of suggestions for "Specific Goals" to include "Ketosis", perhaps visually confirming the addition before the user selects it or moves on. (The video cuts before showing the immediate result of the save).

**Flow 2: Accessing the Prompts Library **

1.  **Start (New Context):** The user is in a ChatGPT conversation (showing previous content like Market Analysis). The input box is empty.
2.  **Trigger Prompt Feature:** User clicks the **Blue Star Icon**.
3.  **Show Prompts Library:** Instead of inserting a template directly, the **"Promptimize" Sidebar** appears (it might remember the docked state from the previous flow or default to it). This time, it displays the **"Prompts Library"** view.
    *   This view shows categorized lists of saved prompt templates (e.g., "Marketing Ad Prompts", "SEO Prompts", "Content Prompts").
    *   Specific templates like "Product Ad", "Seasonal Promotion", "Keyword Research" are listed with brief descriptions.
4.  **Browse Library:** The user's cursor hovers over different templates ("Product Ad", "Seasonal Promotion"), implying they can select one.
    *   *Implementation Detail:* Clicking a template from the library should likely insert that template's text into the main input box, potentially including its own variable placeholders, ready for customization as shown in Flow 1.

**Key Functionality for Implementation:**

1.  **State Management:** Track the state of the main input, whether the Promptimize pop-up/sidebar is open, what variable (if any) is being edited, and the content displayed within Promptimize (suggestions vs. add form vs. library).
2.  **Template Engine:**
    *   Store prompt templates (text content).
    *   Define a syntax for variable placeholders (e.g., `[Variable Name]`).
    *   Parse templates to identify placeholders.
    *   Replace placeholders with selected values.
3.  **Variable Management:**
    *   Store definitions of variable types (e.g., "Topic / Theme", "Specific Goals").
    *   Store pre-defined suggestion values for each variable type.
    *   Store user-defined custom values, associated with variable types and potentially the user's profile.
    *   Provide suggestions contextually (based on the variable clicked). The "based on your profile" suggests personalization.
4.  **UI Rendering:**
    *   Render the main chat interface.
    *   Render the prompt text within the input box, potentially highlighting or making placeholders clickable.
    *   Render the Promptimize feature as either a modal pop-up (anchored near the clicked element) or a docked sidebar.
    *   Implement the layout switching mechanism.
    *   Render the different views within Promptimize: variable suggestions, add value form, prompt library.
5.  **Interaction Logic:**
    *   Handle clicks on the Blue Star icon (determine whether to insert a template or show the library).
    *   Handle clicks on placeholders within the input text to open the Promptimize pop-up with the correct variable context.
    *   Handle clicks on suggestions to update the main input text and close/update the pop-up.
    *   Handle clicks on `+ Add New Value` to switch the Promptimize view to the form.
    *   Handle form submission to save the custom value (backend interaction likely needed) and potentially update the UI.
    *   Handle clicks on templates in the library view to insert them into the main input.
6.  **Data Persistence:** Store templates, variable definitions, suggestions, and user-created values (likely in a database tied to user accounts, especially for "Premium" features and personalization).

---- custom variables ---

Okay, let's break down the UI functionality and workflow for the "Custom Variables" feature. This appears to be a system integrated into an AI chat or prompt interface to make prompts more reusable and personalized.

**Core Concept:**

The system allows users to define placeholders (variables) within their prompts. When interacting with these variables, a dedicated UI pops up, enabling the user to either select from a list of predefined/saved values or add a new custom value for that specific variable. Selecting or adding a value replaces the placeholder in the prompt text with the chosen content. This facilitates prompt templating and personalization using the user's own data or frequently used options.

**UI Elements:**

1.  **Main Text Input Area:** Where the user types their prompt.
2.  **Variable Placeholders:** Text within the prompt enclosed in square brackets (e.g., `[Specific Goals]`, `[Topic / Theme]`, `[Extras / Downloadables]`). These are visually distinct (often highlighted or underlined) and interactive.
3.  **Variable Pop-up/Modal ("Promptimize"):** A small window that appears when a variable placeholder is clicked.
    *   **Title:** Displays the name of the variable being edited (e.g., "Specific Goals", "Topic / Theme").
    *   **Value List:** Shows suggested or previously saved values for this variable. These seem to be based on context or the user's profile ("Suggested Variables based on your profile").
    *   **Selection Indicator:** A checkmark appears next to a selected value.
    *   **"Add New Value" Button:** Initiates the workflow to add a custom value.
    *   **Window Controls:**
        *   Pin Icon: Likely to keep the pop-up open or docked.
        *   Layout/Docking Icons (Optional, seen briefly): Suggest options to dock the pop-up (Default, Left Side, Right Side).
        *   Translation Icon(?) (`T A`): Might offer translation features related to the variable.
        *   Close Icon ('X'): To dismiss the pop-up.
4.  **"Add New Value" Form (within the pop-up):** Appears after clicking "Add New Value".
    *   **Title:** Indicates the action, e.g., "Add Specific Goals".
    *   **"Variable Value" Input Field:** Where the user types the actual text/data for the new value (e.g., "Keto"). Labelled "Enter name".
    *   **"Description" Text Area:** An optional, larger field to add notes or context about the custom value. (Might be used for user reference or potentially even passed to the AI). Includes a character counter (0/1000).
    *   **Information Icon ('i'):** Likely provides help or hints about the description field.
    *   **"Add New Value" Confirmation Button:** Saves the newly entered value.

**Workflow Breakdown:**

**Scenario 1: Selecting a Predefined/Existing Value**

1.  **Identify Variable:** User sees a bracketed variable (e.g., `[Topic / Theme]`) in their prompt within the main text input area.
2.  **Trigger Pop-up:** User clicks directly on the bracketed variable text.
3.  **View Options:** The "Promptimize" pop-up appears, displaying the variable name (`Topic / Theme`) and a list of relevant, suggested, or previously saved values ("Key Nutrients", "Portion Control", "Fasting").
4.  **Select Value:** User clicks on one of the listed values (e.g., "Key Nutrients").
5.  **System Response (Substitution):**
    *   A visual indicator (checkmark) appears next to the selected value in the pop-up.
    *   Crucially, the original placeholder `[Topic / Theme]` in the main text input area is instantly replaced by the selected value "Key Nutrients".
6.  **Close Pop-up:** User can manually close the pop-up using the 'X' icon, or it might close automatically after selection (though the video shows manual closure). The prompt is now updated.

**Scenario 2: Adding a New Custom Value**

1.  **Identify Variable:** User sees a bracketed variable (e.g., `[Specific Goals]`) in their prompt.
2.  **Trigger Pop-up:** User clicks on the bracketed variable text.
3.  **View Options:** The "Promptimize" pop-up appears, showing existing values ("Weight Loss", "Muscle Gain", "Rest").
4.  **Initiate Add:** User decides none of the existing options fit and clicks the "+ Add New Value" button.
5.  **Display Add Form:** The content of the pop-up changes to the "Add Specific Goals" form.
6.  **Enter Value:** User clicks into the "Enter name" field and types their custom value (e.g., "Keto").
7.  **Enter Description (Optional):** User might add details in the "Description" field.
8.  **Confirm Add:** User clicks the "Add New Value" button at the bottom of the form.
9.  **System Response (Save & Substitute - *Implied*):**
    *   The system saves this new value ("Keto") and associates it with the `[Specific Goals]` variable, likely storing it in the user's profile ("Your Data").
    *   *Assumption:* After adding, the system likely automatically selects the new value and substitutes it into the main prompt, replacing `[Specific Goals]` with "Keto". (Alternatively, the user might be returned to the value list with "Keto" now present and selected).
    *   The pop-up might close automatically, or the user might close it manually.

**Key Functionalities & Design Considerations for Implementation:**

1.  **Variable Parsing/Detection:** The frontend needs to detect text patterns matching `[Variable Name]` in the input field, potentially highlighting them and making them clickable.
2.  **Contextual Pop-up:** Clicking a variable should trigger a UI element (pop-up/modal/sidebar) that is contextually linked to the *specific* variable clicked.
3.  **Data Storage & Retrieval:** A backend mechanism is needed to store and retrieve variable definitions and their associated custom values *per user*. This is the "Your Data" aspect. Values might be suggested based on frequency, recent use, or explicit user profiling.
4.  **Value Management:** The UI must allow listing existing values, selecting one, and initiating the addition of new ones. Deleting or editing saved values would also be necessary features (though not explicitly shown).
5.  **Substitution Logic:** Upon selection or successful addition, the frontend must replace the `[Variable Name]` placeholder in the text input with the chosen value's text.
6.  **UI State Management:** The state of the pop-up (showing list vs. add form) and the selected value needs careful management.
7.  **Persistence:** Added values should persist across sessions for the user.
8.  **Scope:** Consider if variables are global (available in any prompt) or perhaps scoped to specific prompt templates or projects.
9.  **Naming Conventions:** Decide on rules for variable names (spaces allowed? special characters?).

This feature effectively turns a static prompt into a dynamic template, making it easy to reuse complex prompts with different key parameters without extensive copy-pasting and manual editing. The "Your Data" aspect emphasizes personalization and efficiency by leveraging the user's own saved inputs.

---- template creation ---


**Core Concepts:**

1.  **AI-Powered Prompt Enhancement:** The system offers a way to take a user's basic query and automatically transform it into a more detailed, structured, and potentially more effective prompt for the AI.
2.  **Prompt Library/Saving:** Users can save prompts (either their own or the enhanced ones) for later reuse, organizing them with names and categories.

**UI Elements:**

1.  **Main Chat Interface:**
        *   **Enhance/Save Prompt Icon (Right - Blue Sparkle/Wand):** This is the primary trigger for the features shown. Its function seems context-dependent (click vs. hover).

2.  **Enhance/Save Prompt Tooltip/Sub-menu:** Appears when hovering over the blue Sparkle icon (especially after text is present).
    *   `Bookmark` Icon: Specifically used to trigger the "Save Prompt" workflow.

3.  **"Promptimize" Sidebar/Modal (Save Prompt Mode):** Appears when the Bookmark icon is clicked.
    *   **Title:** "Promptimize" (consistent branding, different function).
    *   **Form Title:** "Add New Prompt".
    *   **"Create New Category" Input Field:** Allows the user to type a category name for organizing saved prompts.
    *   **"Prompt Name" Input Field:** Allows the user to name the specific prompt being saved.
    *   **"Prompt" Text Area:** A multi-line text area pre-populated with the *current content* of the main input bar. This text is editable within the sidebar.
    *   **"Save Prompt" Button:** Confirms saving the prompt with the entered category and name.
    *   **Confirmation Message:** Text feedback displayed below the button after successful saving (e.g., "Prompt saved successfully!").
    *   **Close Icon ('X'):** To dismiss the sidebar.


**Workflow 1: Prompt Enhancement**

1.  **Initial Query:** User types a relatively simple query into the main input bar (e.g., "I want to understand Bryan Johnson's supplements."). Autocomplete suggestions may appear but are ignored or become irrelevant as the query gets specific.
2.  **Trigger Enhancement:** User clicks the blue Sparkle/Wand icon located within the input bar.
3.  **System Processing (AI Enhancement):** The system takes the user's input text ("I want to understand Bryan Johnson's supplements."). An AI process (likely behind the scenes) analyzes this intent and generates a much more detailed and structured prompt designed to elicit a comprehensive response from the main chat AI. This generated prompt includes specific instructions, points to cover, and desired output format.
    *Example Generated Prompt shown:* "Analyze Bryan Johnson's supplement regimen... Instructions: Begin by researching... Next, explore the scientific evidence... Additionally, investigate... Finally, summarize..."*
4.  **Replace Input:** The original text in the main input bar is *completely replaced* by this newly generated, enhanced prompt.
5.  **User Action:** The user now has this sophisticated prompt ready in the input bar. They can:
    *   Send it immediately by clicking the Send (up arrow) button.
    *   Edit it further.
    *   Decide to save it (leading to Workflow 2).

**Workflow 2: Saving a Prompt**

1.  **Prompt Ready:** The user has a prompt in the main input bar that they wish to save. This could be a prompt they typed manually, or more likely in this context, an enhanced prompt generated via Workflow 1.
2.  **Reveal Save Option:** User hovers the mouse cursor over the blue Sparkle/Wand icon. This reveals the secondary action icons, including the Bookmark icon.
3.  **Trigger Save UI:** User clicks the Bookmark icon.
4.  **Display Save Sidebar:** The "Promptimize" sidebar appears, configured for "Add New Prompt". The main text area within the sidebar is automatically pre-filled with the prompt from the main input bar.
5.  **Categorize and Name:**
    *   User clicks into the "Create New Category" field and types a relevant category (e.g., "Enhancements").
    *   User clicks into the "Prompt Name" field and types a descriptive name (e.g., "analysis").
6.  **Confirm Save:** User clicks the "Save Prompt" button.
7.  **System Processing (Save Action):** The system saves the prompt text, associated category, and name to the user's profile/account storage.
8.  **Feedback:** A confirmation message ("Prompt saved successfully!") appears briefly within the sidebar.
9.  **Close Sidebar:** User clicks the 'X' icon to close the "Promptimize" sidebar.
10. **Return to Chat:** The user is back at the main chat interface. The enhanced prompt remains in the input bar, ready to be sent or cleared.

**Key Functionalities & Design Considerations for Implementation:**

3.  **AI-for-Prompt-Engineering:** The core "enhancement" feature requires a dedicated AI model or a specific meta-prompting technique. This AI needs to understand the user's goal from a simple query and expand it into a detailed, instruction-based prompt.
4.  **Seamless Text Replacement:** The enhancement workflow smoothly replaces the user's text with the generated prompt in the same input field.
5.  **Prompt Library Backend:** Requires a database schema to store prompts, user IDs, prompt names, categories, and the prompt text itself. APIs for CRUD (Create, Read, Update, Delete) operations on saved prompts are essential.
6.  **Sidebar/Modal for Saving:** A non-intrusive UI (like a sidebar) is used for the saving process, pre-filling the prompt content to reduce user effort.
7.  **Categorization:** Allowing users to categorize prompts aids organization as the library grows.
9.  **Clear Feedback:** Visual confirmation after saving is important for user experience.

This UI combines direct chat interaction with powerful meta-features (prompt enhancement and saving), aiming to help users create better prompts and manage them efficiently.
