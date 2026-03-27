# 键盘快捷键

English version: [shortcuts.md](shortcuts.md)

快捷键定义位于 `src/renderer/src/lib/shortcuts.ts` 的 `SHORTCUTS` 常量中。  
`useShortcuts(handlers)` hook 会注册一个 `keydown` 监听器；在 macOS 上 `meta` 映射为 `⌘`，其他平台映射为 `Ctrl`。

## File

| 快捷键 | 动作 |
|--------|------|
| `⌘O` | 打开归档文件 |
| `⌘W` | 关闭当前文件 |
| `⌘S` | 将当前图表导出为 PNG |
| `⌘⇧S` | 保存处理后的归档 |
| `⌘N` | 打开新窗口 |

## View

| 快捷键 | 动作 |
|--------|------|
| `⌘1` | 切换到 Profile |
| `⌘2` | 切换到 Freq × Phase（Waterfall） |
| `⌘3` | 切换到 Time × Phase |
| `⌘4` | 切换到 Bandpass |
| `⌘5` | 打开 PSRCAT catalogue |
| `⌘B` | 折叠 / 展开 sidebar |

## Edit

| 快捷键 | 动作 |
|--------|------|
| `⌘Z` | Undo |
| `⌘⇧Z` | Redo |

## App

| 快捷键 | 动作 |
|--------|------|
| `⌘,` | 打开 Settings |
| `⌘/` | 打开 Help / shortcuts 面板 |

## 如何新增快捷键

1. 在 `shortcuts.ts` 的 `SHORTCUTS` 数组中加一项：

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

2. 在 `App.tsx` 的 `useShortcuts()` 调用里，用同一个 `label` 字符串注册 handler：

```ts
useShortcuts({
  'Reload Data': () => reloadCurrentFile(),
  // ...
})
```

这个快捷键会自动显示在 Help 面板里。
