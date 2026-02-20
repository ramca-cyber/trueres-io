

# Fix: AllTools page Helmet title error

## Problem
The `<title>` tag in `AllTools.tsx` uses JSX expression interpolation:
```jsx
<title>All {TOOLS.length} Free Audio & Video Tools — TrueRes.io</title>
```
`react-helmet-async` does not support multiple children or expressions inside `<title>` -- it requires a single string. This causes an `Invariant Violation` that crashes the page via the ErrorBoundary.

## Fix
Change the `<title>` to use a JavaScript template literal so it resolves to one string:

```jsx
<title>{`All ${TOOLS.length} Free Audio & Video Tools — TrueRes.io`}</title>
```

Apply the same pattern to the `<meta>` tags that also interpolate `TOOLS.length` (lines 28-29), since those can trigger the same issue.

## File
- **`src/pages/AllTools.tsx`** -- wrap all Helmet children that use `{TOOLS.length}` in template literal strings.
