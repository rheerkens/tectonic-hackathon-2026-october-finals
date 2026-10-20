# Shared web controls

Keep these native React controls independent of features, routing, HTTP, auth and query state. Accept field errors and values through props. Use the app's CSS tokens, accessible labels, visible focus and a minimum 44px touch target. Add a primitive when a real screen needs it; keep panels and page composition in `apps/web`.

Toasts confirm finished work. Errors that need a decision or must keep input stay inline beside their form. `ToastProvider` is mounted inside the identity key in `apps/web/src/App.tsx`, so an account change drops queued messages. `Dialog` opens on mount and closes through its owner's `onClose`.

This package follows the shared UI ownership pattern from Better-T-Stack. Its controls are original code using the existing app styles, not copied shadcn components. These DOM components are web-only; a future native app shares contracts and feature logic, not these controls.
