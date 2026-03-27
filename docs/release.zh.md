# 发版流程

English version: [release.md](release.md)

这个项目目前有两条发版通道：

- 推送到 `main`：GitHub Actions 发布 nightly prerelease
- 推送 annotated tag（例如 `v0.0.2`）：GitHub Actions 发布稳定版 release

## 端到端流程

1. 完成代码修改，并提交到 `main`
2. 如果你只想产出 nightly build，直接推送 `main`
3. 如果你要发稳定版，创建一个带说明的 annotated tag
4. 推送该 tag
5. GitHub Actions 打包应用、创建 GitHub Release，并上传 updater metadata
6. 已安装的打包版应用会在启动时或通过 Help → Check for Updates 检测更新

## 稳定版发版命令顺序

```bash
git add .
git commit -m "feat: improve updater flow"
git push origin main

git tag -a v0.0.2 -m "PSRCHIVE Viewer 0.0.2

- Add in-app GitHub Release update checks
- Support manual download and restart-to-install flow
- Split nightly and stable update channels"

git push origin v0.0.2
```

## GitHub Release 描述来自哪里

对于稳定版，GitHub Release 的 `desc` / body 直接取自 annotated tag 的 message。

这意味着：

- 要使用 `git tag -a`，不要只打 lightweight tag
- 完整的 release notes 要直接写在 tag message 里
- 第一行会成为 release body 的开头
- 后续内容可以继续写 bullets、迁移说明、已知问题

如果 annotated tag message 是空的，workflow 才会回退到默认通用文案。

nightly prerelease 的 body 则仍由 workflow 自动生成。

## 推荐的稳定版 release note 模板

```text
PSRCHIVE Viewer 0.0.2

- New: ...
- Improved: ...
- Fixed: ...

Notes:
- Any migration or manual follow-up
- Any known limitation
```

## 版本号与 updater 行为

- 稳定版 tag 会把打包应用版本号改写成 tag 版本，例如 `v0.0.2 -> 0.0.2`
- `main` 产物会把应用版本号改写成 `0.0.2-nightly.153` 这种 nightly prerelease
- 稳定版安装包只接收稳定版更新
- nightly 安装包只接收 GitHub prerelease

## 应用内更新怎么走

1. 打包版应用启动并初始化 `electron-updater`
2. 它在后台检查 GitHub Releases
3. 如果发现匹配通道的新版本，标题栏会显示更新动作
4. 点击后开始下载更新
5. 下载完成后，再点一次会重启并安装

## 备注

- `npm run dev` 不会真正走 auto-update 链路；要验证 updater，请使用打包产物
- GitHub Actions 需要 `contents: write` 权限，或者提供一个可创建 release 的 `RELEASE_TOKEN`
