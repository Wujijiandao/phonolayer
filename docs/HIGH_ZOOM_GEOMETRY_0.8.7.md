# High-Zoom Geometry 0.8.7

Application: PhonoLayer Desktop 0.8.7  
Persistent document schema: unchanged (writer 0.8.1)

## Failure mode

Before v0.8.7, `.paper-stage` was a flex container and `.editor` retained the default `flex-shrink: 1`. Once the zoomed paper approached the available workspace width, Chromium reduced the editor flex size instead of allowing the paper to continue growing. The zoom percentage therefore diverged from the paper's real geometry.

A naïve `flex-shrink:0` fix is insufficient: with `justify-content:center`, an oversized centered flex item can begin at a negative x-coordinate, making its left edge unreachable by scrolling.

## Geometry invariant

The release uses both rules:

```css
.paper-stage {
  min-width: 100%;
  width: max-content;
  display: flex;
  justify-content: center;
}
.editor {
  zoom: var(--zoom);
  flex: 0 0 auto;
}
```

This gives two regimes without a hard breakpoint:

- paper narrower than the viewport: stage remains at least viewport width and centers the paper;
- paper wider than the viewport: stage expands to the scaled paper plus its gutters, making the complete paper horizontally scrollable.

## Required test points

Browser QA measures the same document at 100%, 200%, 225%, 250%, and 300%. Above 200% the paper width must continue scaling approximately linearly, the left edge must remain reachable, and workspace `scrollWidth` must grow beyond `clientWidth`.
