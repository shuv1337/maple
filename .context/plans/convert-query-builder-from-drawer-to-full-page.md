# Plan: Convert Query Builder from Drawer to Full Page

## Context

The widget query builder on the custom dashboard (`/dashboards`) currently opens as a Sheet (slide-in drawer from the right, capped at `sm:max-w-5xl`). This cramps the live preview to 288px height and squeezes all config fields into a narrow column. The user wants a full-page experience with proper space utilization and polished UX.

## Approach

Replace the `WidgetQueryBuilderSheet` usage in the dashboards route with a new **full-page** `WidgetQueryBuilderPage` component. When the user clicks "Configure" on a widget, the dashboard canvas is replaced entirely by the query builder page. This is a conditional render swap — no new routes needed.

## Files to Create

### 1. `apps/web/src/components/dashboard-builder/config/widget-query-builder-page.tsx` (NEW)

New full-page component. Takes the same props as the Sheet (`widget`, `onApply`, `onCancel`). Moves all business logic from the Sheet into this component (state management, validation, query CRUD, preview building — all identical logic, just new layout).

**Layout structure:**

```
┌─────────────────────────────────────────────────────┐
│  ← Back   Widget Title [editable]    Cancel | Apply │  ← sticky header bar
├─────────────────────────────────────────────────────┤
│                                                     │
│            LIVE PREVIEW (hero, ~400px)              │  ← muted bg, full width
│                                                     │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────┐ ┌────────────────────────┐ │
│  │ Widget Settings     │ │ Execution Options      │ │  ← compact horizontal bar
│  │ Chart Style | Comp. │ │ % change | Debug       │ │
│  └─────────────────────┘ └────────────────────────┘ │
│                                                     │
│  [+ Add Query]  [+ Add Formula]  [▶ Run Preview]   │  ← toolbar row
│                                                     │
│  ┌─ Query A ──────────────────────────────────────┐ │
│  │ Source | Aggregation | Step | [Metric] | Group │ │  ← fields in a single
│  │ By | Legend | Where Clause                     │ │     wide row/grid
│  └────────────────────────────────────────────────┘ │
│  ┌─ Query B ──────────────────────────────────────┐ │
│  │ ...                                            │ │
│  └────────────────────────────────────────────────┘ │
│  ┌─ Formula F1 ───────────────────────────────────┐ │
│  │ Expression | Legend                            │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

Key design choices:
- **Header**: Fixed/sticky top bar with back arrow (returns to dashboard), inline-editable title, and right-aligned Cancel + Apply buttons
- **Preview**: Hero section — generous ~400px height, full-width, subtle `bg-muted/30` background to visually separate data from controls
- **Widget settings**: Compact horizontal strip (3-4 col grid) for title, chart style, comparison, stat/table options — these are "set once" fields
- **Toolbar**: `Add Query` / `Add Formula` / `Run Preview` with query alias display
- **Query panels**: Each query gets a full-width bordered card. Fields use a wider grid layout (4 cols on lg) so source/aggregation/step/groupBy can all sit on one row, with where clause spanning full width below
- **Formulas**: Dashed-border cards, expression + legend side by side
- Stat-specific options (aggregate, value field, unit) and table-specific options (row limit) appear contextually alongside widget settings

Aesthetic (leaning into existing brutalist system):
- Zero radius, sharp borders, Geist Mono throughout
- `animate-in fade-in slide-in-from-bottom-2 duration-200` on mount for subtle entrance
- Query panels use `border-l-2 border-l-primary` left accent to visually anchor each query
- Generous `p-6` / `space-y-6` spacing — the whole point of going full-page

## Files to Modify

### 2. `apps/web/src/routes/dashboards.tsx`

- Remove `WidgetQueryBuilderSheet` import and usage (lines 10, 184-189)
- Import new `WidgetQueryBuilderPage`
- When `configureOpen && configureWidget` is truthy, render `WidgetQueryBuilderPage` instead of `DashboardCanvas` (conditional swap inside the existing `DashboardLayout`)
- Pass `onCancel` handler that resets `configureOpen` + `configureWidgetId`
- Pass `onApply` that calls `handleApplyWidgetConfig` then resets state
- Update breadcrumbs to show: `Dashboards > {name} > Configure Widget`

Change is ~20 lines: replace the Sheet render with a conditional branch.

## Files to Delete (optional cleanup)

### 3. `apps/web/src/components/dashboard-builder/config/widget-query-builder-sheet.tsx`

Can be deleted since it's only imported from `dashboards.tsx`. Or leave it for now and delete in a follow-up.

## Reused Code

All business logic is copied from the Sheet component — these functions and patterns are preserved identically:
- `toInitialState()`, `cloneWidgetState()`, `buildWidgetDataSource()`, `buildWidgetDisplay()`, `validateQueries()` — from `widget-query-builder-sheet.tsx`
- `WidgetPreview` component — from `widget-query-builder-sheet.tsx`
- Query/formula CRUD handlers (`addQuery`, `removeQuery`, `cloneQuery`, `updateQuery`, `addFormula`, `removeFormula`)
- Metric selection logic using `listMetricsResultAtom`
- All types from `@/lib/query-builder/model` and `@/components/dashboard-builder/types`

## Implementation Sequence

1. Create `widget-query-builder-page.tsx` with all logic + new layout
2. Update `dashboards.tsx` to swap Sheet for full-page conditional render
3. Verify everything works end-to-end
4. Optionally delete the old Sheet file

## Verification

1. Navigate to `/dashboards?dashboardId=<id>` with an existing dashboard that has widgets
2. Click the configure (gear) icon on any widget
3. Verify the full-page builder appears (not a drawer)
4. Test: title editing, chart style changes, comparison toggles
5. Test: add/remove/clone queries, change source/aggregation/filters
6. Test: add/remove formulas with expressions
7. Test: Run Preview updates the chart
8. Test: Apply saves changes and returns to dashboard
9. Test: Cancel returns to dashboard without changes
10. Test: stat widget shows aggregate/unit/value options, table widget shows row limit
11. Run `bun typecheck` to verify no type errors
