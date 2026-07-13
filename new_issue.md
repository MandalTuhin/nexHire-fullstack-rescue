Issue Title:
Disable Document Editing After Background Verification Documents Are Submitted

Description
Currently, users can upload and replace their background verification (BGV) documents before submitting the form. However, once the user clicks the "Submit BGV Documents" button, the uploaded documents should become read-only and should no longer be editable or replaceable.

Current Behavior
User uploads the required documents.

User clicks Submit BGV Documents.

The uploaded documents can still be edited/re-uploaded.

Expected Behavior
Users should be able to upload, remove, or replace documents only before submission.

After clicking Submit BGV Documents, all upload controls should be disabled.

The uploaded documents should remain visible for reference.

The Upload, Replace, Delete, or Edit options should no longer be available.

If a user attempts to modify documents after submission (through API or UI), an appropriate message should be displayed, such as:

"Background verification documents have already been submitted and cannot be modified."

Acceptance Criteria
 Upload/Edit/Delete options are enabled before submission.

 Clicking Submit BGV Documents locks all uploaded documents.

 Upload controls are disabled or hidden after submission.

 Backend API prevents document modification after submission.

 Previously uploaded documents remain viewable.

 Appropriate success/error messages are displayed.

Priority
High (Ensures the integrity of submitted BGV documents and prevents accidental or unauthorized modifications.)


// see ./context_pictures/Issue_updated1.jpeg for this issue: 


Issue Title
Implement Email Format Validation During User Registration

Description
The registration form currently accepts any input in the email field without validating whether it is a properly formatted email address. This allows users to register with invalid email addresses, which can lead to communication failures and poor data quality.

Current Behavior
Users can enter any text in the email field.

The registration is successful even if the email format is invalid (e.g., abc, user@, @gmail.com).

Expected Behavior
The email field should validate the input before allowing registration.

Only valid email formats should be accepted (e.g., user@example.com).

If an invalid email is entered, the user should see an error message such as:

"Please enter a valid email address."

Registration should be blocked until a valid email address is provided.

Acceptance Criteria
 Email field validates the standard email format.

 Invalid email addresses cannot be submitted.

 A clear validation message is displayed for invalid input.

 Registration proceeds only when a valid email is entered.

 Validation works on both the frontend and backend.

Priority
High (Prevents invalid user registrations and ensures reliable communication.)


### *Title*

*Add Meaningful Filtering Functionality in HR Applications Module*

### *Description*

The *HR Applications* module currently lacks an efficient filtering mechanism, making it difficult for HR users to quickly locate and manage application records. A comprehensive and user-friendly filtering feature should be implemented to improve usability, reduce manual effort, and enhance navigation through large datasets.

The filtering functionality should support common business scenarios and allow users to narrow down application records based on relevant criteria. Multiple filters should be applicable simultaneously, with options to clear all filters and refresh the results. The filtered data should remain consistent across pagination and should be available for export where applicable.

### *Expected Outcome*

* Introduce meaningful filters in the HR Applications module.
* Support applying multiple filters together.
* Ensure filters improve record discovery and overall user experience.
* Maintain filter state during navigation where appropriate.
* Allow exporting filtered results if export functionality is available.

### *Acceptance Criteria*

* Meaningful filters are available in the HR Applications module.
* Multiple filters can be applied simultaneously.
* Filtered results are accurate and performant.
* Users can clear all applied filters easily.
* The filtering experience is intuitive, responsive, and improves HR workflow efficiency.


Issue no 4👇
### *Title*

*Temporarily Disable Asset Management Module in Admin Portal*

### *Description*

The *Asset Management* module is not required in the current phase of the project. To simplify the Admin Portal and avoid exposing incomplete or unused functionality, the module should be temporarily disabled.

The feature should be hidden from the user interface, including any related navigation menus, buttons, or accessible routes. However, the underlying implementation and codebase should remain intact to support future development and reactivation without requiring a complete reimplementation.

### *Expected Outcome*

* Remove the Asset Management option from the Admin Portal UI.
* Disable access to the module and its associated routes.
* Preserve the existing code and implementation for future use.
* Ensure disabling the module does not impact other functionalities or introduce regressions.

### *Acceptance Criteria*

* The Asset Management module is not visible in the Admin Portal.
* Users cannot access the module through direct URLs or navigation.
* Existing code remains in the project and is not deleted.
* The feature can be re-enabled in the future with minimal changes.
* No existing functionality is affected by this change.


### *Title*

*Standardize Website Terminology Using Clear and User-Friendly Language*

### *Description*

The application currently contains various labels, button texts, status names, messages, and other UI content that may be technical, inconsistent, or difficult for some users to understand. The entire application should be reviewed to ensure that all terminology is clear, intuitive, and consistent.

Replace ambiguous or technical terms with simple, meaningful, and universally understandable language that can be easily interpreted by both technical and non-technical users. All actions, statuses, notifications, validation messages, and page labels should clearly communicate their purpose without requiring domain-specific knowledge.

The objective is to improve usability, readability, and the overall user experience by adopting consistent and user-friendly terminology throughout the application.

### *Expected Outcome*

* Use clear, simple, and consistent terminology across the application.
* Replace technical or ambiguous labels with meaningful alternatives where appropriate.
* Ensure buttons, menus, statuses, validation messages, tooltips, and notifications are easy to understand.
* Maintain consistency in terminology across all modules and workflows.
* Improve the overall usability for both technical and non-technical users.

### *Acceptance Criteria*

* All user-facing text follows a consistent terminology standard.
* Labels and actions are self-explanatory and easy to understand.
* Validation and error messages are meaningful and actionable.
* Status names and workflow terminology are consistent throughout the application.
* No technical jargon is exposed to end users unless absolutely necessary.

### *Title*

*Resolve UI Styling Issues and Improve Overall User Interface Consistency*

### *Description*

The application currently has several UI inconsistencies and styling issues that affect the overall user experience. In multiple places, cards, tables, forms, and other UI elements overlap, become misaligned, or do not render properly across different screen sizes and resolutions.

A comprehensive UI review should be conducted to identify and fix all visual bugs, layout inconsistencies, spacing issues, alignment problems, responsiveness concerns, and styling glitches throughout the application. The goal is to ensure a clean, professional, and consistent interface across all modules.

### *Expected Outcome*

* Fix overlapping cards, tables, forms, and other UI components.
* Resolve layout, alignment, spacing, and responsiveness issues.
* Ensure all pages render consistently across supported screen sizes.
* Eliminate visual glitches, broken styling, and inconsistent component behavior.
* Maintain a uniform design system and consistent look and feel throughout the application.

### *Acceptance Criteria*

* No overlapping or clipped UI elements.
* Consistent spacing, alignment, and component sizing across all pages.
* Responsive layouts function correctly on different screen resolutions.
* Visual glitches and styling inconsistencies are resolved.
* The application provides a polished, professional, and consistent user experience across all modules.
