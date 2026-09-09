# Feature: Filtered CSV export for BOOST Registrations

## Context
The Super Admin panel has a **BOOST Registrations** page (sidebar item under COMMERCE, alongside
"BOOST Page") that already supports downloading all BOOST lead data as CSV. There's currently no
way to filter *before* exporting — it's all-or-nothing, which makes it hard to pull just, say,
"all leads from Kota centre in the last 30 days" without exporting everything and filtering
manually afterward.

## What I need you to build

1. **Locate the existing export**:
   - Find the BOOST Registrations page component (likely `AdminBoostRegistrationsPage.tsx` or
     similar) and the current "Export"/"Download CSV" logic — is it client-side (exporting
     whatever's currently loaded/paginated in the table) or a server-side export (a query/edge
     function that pulls all rows fresh)?
   - Find the `boost_registrations` (or equivalent) table schema to see what fields are actually
     available to filter on — confirm which of Centre, City, State, Class, Registration Status,
     and Date fields actually exist, and note any additional relevant fields worth exposing as
     filters (e.g. source/campaign, phone verified, payment status — whatever's actually present).

2. **Add filter controls to the BOOST Registrations page**, matching the style of filters already
   used elsewhere in this project (e.g. the "All Classes" / "All Batches" dropdowns on the
   Students page, or the search box pattern):
   - **Centre** — dropdown, sourced from the same centres list used elsewhere (Centres page).
   - **City / State** — dropdown or searchable select, based on actual distinct values present in
     the data.
   - **Class** — dropdown.
   - **Registration Status** — dropdown (whatever statuses actually exist in the data, e.g.
     pending/confirmed/rejected — confirm actual values rather than guessing).
   - **Date Range** — a from/to date picker, applied to the registration date field.
   - Any other clearly relevant field found in step 1.
   - Filters should be combinable (AND logic) and should also drive the on-screen table/list, not
     just the export — i.e. this should behave as a real filter for the page, with "Export" acting
     on the currently-filtered view.

3. **Make the export respect the filters**:
   - If the export is currently a full-table pull, change it to apply the same filter conditions
     used for the on-screen list, so the exported CSV matches exactly what's filtered/visible.
   - If the export is currently only exporting the current page of a paginated table, fix it to
     export **all matching rows** across the full filtered result set, not just the visible page.

4. **Retain full/unfiltered export**:
   - When no filters are applied, "Export" should still produce the complete dataset, exactly as
     it does today — don't break the existing "download everything" use case.
   - Make it clear in the UI when an export will be filtered vs. full (e.g. a label like "Export
     (124 filtered)" vs. "Export All", or similar to the existing "Export All" button already seen
     on the Students page for consistency).

5. **Performance**:
   - If the underlying data set is large, make sure the filtered query is done server-side
     (proper `WHERE` clauses / Supabase query filters) rather than fetching everything and
     filtering in the browser, so this scales.

## Deliverable
- Filter UI on the BOOST Registrations page for Centre, City/State, Class, Registration Status,
  Date Range (and any other relevant fields confirmed to exist in the data).
- Export action that produces a CSV matching exactly the currently-applied filters, across the
  full result set (not just one page).
- Unfiltered "export everything" behavior preserved when no filters are applied.
