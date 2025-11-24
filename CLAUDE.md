# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

PakePlus-Android 是一个将任何网页转换成 Android 应用的工具。它使用 WebView 加载指定网页，并通过自动化脚本处理图标生成、配置更新等任务。项目支持通过 GitHub Actions 自动化构建和发布。

## 核心架构

### 主要组件
- **MainActivity.kt** (`app/src/main/java/com/app/pakeplus/MainActivity.kt`): 应用核心入口，负责 WebView 初始化、手势导航、JS 注入和调试功能
- **ppworker.cjs** (`scripts/ppworker.cjs`): Node.js 自动化脚本，处理图标生成、应用配置更新、构建文件准备
- **ppconfig.json** (`scripts/ppconfig.json`): 配置文件，定义应用名称、URL、ID、图标、安全区域等参数

### WebView 功能
- **URL 加载**: 默认加载 `https://juejin.cn/`，可通过 ppworker 脚本修改
- **手势导航**: 支持左右滑动进行前进后退操作
- **JS 注入**: 页面加载时自动注入 `custom.js`
- **调试模式**: 通过 `debug` 标志控制 vConsole 注入
- **用户代理**: 可通过配置自定义 UserAgent
- **安全区域**: 支持配置系统栏的内边距（all/top/bottom/left/right/horizontal/vertical）

## 常用命令

### 构建和测试
```bash
# 构建 Debug APK（需要签名）
./gradlew assembleDebug

# 构建 Release APK（需要签名）
./gradlew assembleRelease

# 安装到设备
./gradlew installDebug

# 运行单元测试
./gradlew test

# 运行 instrumentation 测试
./gradlew connectedAndroidTest

# 清理构建产物
./gradlew clean
```

### 签名配置
Release APK 需要签名才能安装。在本地生成签名文件：
```bash
keytool -genkeypair -v \
-keystore release.keystore \
-keyalg RSA -keysize 2048 -validity 10000 \
-alias pakeplus_android
```

### 配置更新
```bash
# 运行 ppworker 脚本更新应用配置
npm run pp:worker

# 恢复 git 更改
npm run restore
```

## 开发工作流

### 1. 修改应用配置
编辑 `scripts/ppconfig.json` 中的 `android` 部分：
- `name`: GitHub Release 标签名
- `showName`: 应用显示名称
- `webUrl`: 要加载的网页 URL
- `id`: Android 应用 ID (applicationId)
- `icon`: 应用图标路径
- `debug`: 是否开启 vConsole 调试
- `safeArea`: 安全区域配置

### 2. 更新配置到代码
运行 `npm run pp:worker` 会自动：
- 生成适配各密度的应用图标
- 更新 `strings.xml` 中的应用名称
- 修改 `MainActivity.kt` 中的 URL、debug 模式、UserAgent、安全区域
- 更新 `build.gradle.kts` 中的 applicationId
- 设置 GitHub Actions 环境变量

### 3. 自定义 JS 注入
编辑 `app/src/main/assets/custom.js` 实现页面行为定制（如拦截链接打开方式）

### 4. GitHub Actions 构建
推送 tag 触发自动构建：
- Workflow 文件: `.github/workflows/build.yml`
- 构建产物会自动发布到 GitHub Releases
- 支持多平台（但此 Android 项目只构建 APK）

## 项目结构特点

### Gradle 配置
- 使用 Kotlin DSL (`build.gradle.kts`)
- 版本目录管理 (`gradle/libs.versions.toml`)
- minSdk: 24, targetSdk: 34, compileSdk: 34
- applicationId: `com.oaikes.pakeplus.android` (可通过脚本修改)
- 启用 ViewBinding
- Debug 和 Release 都开启了代码混淆和资源压缩

### 依赖库
- AndroidX Core, AppCompat, Material Design
- Navigation Component (Fragment + UI)
- Lifecycle (LiveData + ViewModel)
- ConstraintLayout

### Assets 目录
- `custom.js`: 自定义 JS 注入脚本
- `vConsole.js`: 移动端调试工具
- `index.html`: 本地 HTML（可选，当前未使用）

## 重要注意事项

1. **代码注释**: MainActivity.kt 中有大量注释代码（Navigation Drawer 相关），这些是模板代码，当前未使用
2. **签名要求**: Release 和 Debug 模式都需要签名，否则安装时会提示"安装包损坏"
3. **配置驱动**: 不要直接修改代码中的配置，应修改 `ppconfig.json` 后运行 ppworker 脚本
4. **ImageMagick 依赖**: ppworker 脚本使用 `convert` 命令生成图标，需要安装 ImageMagick
5. **包结构**: 所有源码在 `com.app.pakeplus` 包下，UI 相关类在 `ui` 子包（但当前未使用）

## 调试技巧

- 在 MainActivity.kt 中将 `debug` 设为 `true` 可开启 vConsole
- 或通过 ppconfig.json 的 `android.debug: true` 并运行 ppworker 脚本
- WebView 错误会打印到 Logcat（搜索 "webView onReceivedError"）
- 页面 URL 变化会打印到 Logcat（搜索 "wev view url"）
