# Keyboard Shortcuts

中文版本: [shortcuts.zh.md](shortcuts.zh.md)

Defined in `src/renderer/src/lib/shortcuts.ts` as the `SHORTCUTS` constant.  
The `useShortcuts(handlers)` hook registers a `keydown` listener; on macOS `meta` maps to `⌘`, on other platforms to `Ctrl`.

## File

| Shortcut | Action |
|----------|--------|
| `⌘O` | Open archive file(s) |
| `⌘W` | Close current file |
| `⌘S` | Save current chart as PNG |
| `⌘⇧S` | Save processed archive |
| `⌘N` | Open new window |

## View

| Shortcut | Action |
|----------|--------|
| `⌘1` | Switch to Profile view |
| `⌘2` | Switch to Freq × Phase (Waterfall) |
| `⌘3` | Switch to Time × Phase |
| `⌘4` | Switch to Bandpass view |
| `⌘5` | Switch to PSRCAT catalogue |
| `⌘B` | Toggle sidebar |

## Edit

| Shortcut | Action |
|----------|--------|
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |

## App

| Shortcut | Action |
|----------|--------|
| `⌘,` | Open Settings |
| `⌘/` | Show Help / shortcuts panel |

## Adding new shortcuts

1. Add an entry to the `SHORTCUTS` array in `shortcuts.ts`:

```ts
{
  key: 'r',
  meta: true,
  label: 'Reload Data',
  labelZh: '重新加载',
  description: 'Reload current archive from disk',
  descriptionZh: '从磁盘重新加载当前文件',
  category: 'file'
}
```

2. Register a handler in `App.tsx`'s `useShortcuts()` call using the same `label` string as the key:

```ts
useShortcuts({
  'Reload Data': () => reloadCurrentFile(),
  // ...
})
```

The shortcut automatically appears in the Help panel.
