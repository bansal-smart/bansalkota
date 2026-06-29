## Show/Hide Eye Button on Admin Login Password

### What to build
Add a visibility toggle (eye icon) to the password field on `/admin/login` (`AdminLoginPage.tsx`).

### How
1. Import `Eye` and `EyeOff` icons from `lucide-react`.
2. Add local `showPassword` boolean state.
3. Wrap the password `<Input>` in a `relative` container.
4. Place a small icon button absolutely positioned at the right end of the input field that toggles `type="password"` ↔ `type="text"`.
5. Ensure the right padding of the input accommodates the icon so text doesn't overlap.

### Files changed
- `src/pages/AdminLoginPage.tsx`

No database or backend changes needed.