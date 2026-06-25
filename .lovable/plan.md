## Plan

1. **Move the floating save bar out of the form content path visually**
   - Keep it fixed/sticky-floating and centered as requested.
   - Position it lower and constrain it to the admin content area, not over the Pricing inputs.

2. **Add reliable scroll clearance below Pricing**
   - Add a real spacer after the Pricing card so the page can scroll past the price inputs.
   - This ensures the Original Price field can be reached and edited even with the floating bar visible.

3. **Make the bar non-blocking outside the buttons**
   - Keep pointer events only on the button container so it won’t block scrolling/clicking nearby form fields.

4. **Verify on the current edit route**
   - Check that the Original Price input is no longer covered and the page still scrolls normally.