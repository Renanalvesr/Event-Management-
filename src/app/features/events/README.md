# Events Feature Skeleton (Feature + Facade + Store)

This folder is the first scaffold for a feature-first architecture.

## Structure

- `state/events.store.ts`
  - Keeps local UI state for events feature.
  - Exposes readonly signals and computed selectors.
- `facades/events.facade.ts`
  - Orchestrates business flow for components.
  - Calls services and updates store.

## Next approval steps

1. Update `events-list.component.ts` to consume only `EventsFacade`.
2. Remove duplicated filter/format logic from the component.
3. Add unit tests for `EventsStore` and `EventsFacade`.
4. Replicate same pattern to `users` and `organization` features.

