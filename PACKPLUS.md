# PackPlus 快速打包命令使用文档

## 简介

`packplus` 是一个自动化打包工具，可以快速将任何网页打包成 Android 应用，并自动触发 GitHub Actions 构建。

## 安装

```bash
# 安装项目依赖
npm install

# （可选）全局安装，可直接使用 packplus 命令
npm link
```

## 基本用法

```bash
npm run packplus -- \
  --url <网页URL> \
  --icon <图标路径> \
  --app-name <应用名称> \
  --app-flag <包名> \
  --app-version <版本号>
```

## 必选参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--url` | 应用要加载的网页 URL | `https://aistudio.google.com/apps` |
| `--icon` | 应用图标路径（支持 PNG、JPG） | `~/Downloads/icon.png` |
| `--app-name` | 应用显示名称 | `aistudio` 或 `"AI Studio"` |
| `--app-flag` | Android 应用包名（applicationId） | `com.aistudio.app` |
| `--app-version` | 应用版本号 | `0.0.1` 或 `1.2.3` |

## 可选参数

| 参数 | 说明 | 默认值 | 示例 |
|------|------|--------|------|
| `--debug` | 开启调试模式（注入 vConsole） | `false` | `--debug` |
| `--safe-area` | 安全区域设置 | `all` | `--safe-area top` |
| `--user-agent` | 自定义 UserAgent | 系统默认 | `--user-agent "Mozilla/5.0..."` |
| `--desc` | 应用描述（显示在 Release 中） | 默认提示文本 | `--desc "我的应用"` |
| `--skip-git` | 跳过 Git 提交和打 Tag | `false` | `--skip-git` |

### 安全区域选项

`--safe-area` 参数控制系统栏（状态栏、导航栏）的内边距：

- `all`：四周都有内边距（默认）
- `top`：仅顶部有内边距
- `bottom`：仅底部有内边距
- `left`：仅左侧有内边距
- `right`：仅右侧有内边距
- `horizontal`：左右有内边距
- `vertical`：上下有内边距

## 使用示例

### 示例 1：基本打包

```bash
npm run packplus -- \
  --url https://aistudio.google.com/apps \
  --icon ~/Downloads/aistudio-icon.png \
  --app-name aistudio \
  --app-flag com.google.aistudio \
  --app-version 1.0.0
```

### 示例 2：开启调试模式

```bash
npm run packplus -- \
  --url https://example.com \
  --icon ~/icon.png \
  --app-name "My App" \
  --app-flag com.example.myapp \
  --app-version 0.1.0 \
  --debug
```

### 示例 3：自定义安全区域

```bash
npm run packplus -- \
  --url https://chat.openai.com \
  --icon ~/chatgpt-icon.png \
  --app-name ChatGPT \
  --app-flag com.openai.chatgpt \
  --app-version 2.0.0 \
  --safe-area top
```

### 示例 4：自定义 UserAgent

```bash
npm run packplus -- \
  --url https://mobile.twitter.com \
  --icon ~/twitter-icon.png \
  --app-name Twitter \
  --app-flag com.twitter.mobile \
  --app-version 1.5.0 \
  --user-agent "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36"
```

### 示例 5：仅生成配置，不提交 Git

```bash
npm run packplus -- \
  --url https://example.com \
  --icon ~/icon.png \
  --app-name Example \
  --app-flag com.example.app \
  --app-version 0.0.1 \
  --skip-git
```

### 示例 6：全局安装后使用

```bash
# 先执行 npm link 安装到全局
packplus \
  --url https://juejin.cn \
  --icon ~/juejin-icon.png \
  --app-name "稀土掘金" \
  --app-flag cn.juejin.app \
  --app-version 3.2.1
```

## 执行流程

当运行 `packplus` 命令后，工具会自动执行以下步骤：

### 1. 验证参数
- ✅ 检查图标文件是否存在
- ✅ 验证所有必选参数

### 2. 更新配置
- ✅ 读取 `scripts/ppconfig.json`
- ✅ 更新 Android 配置信息
- ✅ 保存配置文件

### 3. 生成应用资源
- ✅ 运行 `ppworker.cjs` 脚本
- ✅ 使用 sharp 库生成各尺寸图标：
  - mipmap-mdpi (48x48)
  - mipmap-hdpi (72x72)
  - mipmap-xhdpi (96x96)
  - mipmap-xxhdpi (144x144)
  - mipmap-xxxhdpi (192x192)
- ✅ 生成 Adaptive Icon XML
- ✅ 更新 `strings.xml` 中的应用名称
- ✅ 更新 `MainActivity.kt` 中的 URL、debug 模式、UserAgent、安全区域
- ✅ 更新 `build.gradle.kts` 中的 applicationId

### 4. Git 操作（如果未使用 `--skip-git`）
- ✅ 执行 `git add .`
- ✅ 检查文件变更
  - 有变更：创建 commit
  - 无变更：跳过 commit
- ✅ 创建 Tag（格式：`{app-name}-v{version}`）
  - 如果 Tag 已存在，自动删除旧 Tag
- ✅ 推送代码到远程仓库
- ✅ 推送 Tag 到远程仓库

### 5. 触发 GitHub Actions
- ✅ Tag 推送后自动触发 `.github/workflows/android-build.yml`
- ✅ GitHub Actions 自动构建 Release APK
- ✅ 创建 GitHub Release 并上传 APK

## Tag 命名规则

Tag 格式：`{app-name}-v{version}`

示例：
- `aistudio-v1.0.0`
- `ChatGPT-v2.3.5`
- `MyApp-v0.0.1`

## 常见问题

### 1. 图标格式要求

- ✅ 支持格式：PNG、JPG、JPEG
- ✅ 推荐尺寸：512x512 或更大
- ✅ 推荐格式：PNG（支持透明背景）
- ✅ 图标会自动缩放到各个密度

### 2. 应用包名命名规范

应用包名（`--app-flag`）必须符合 Android 规范：
- ✅ 格式：`com.company.appname`
- ✅ 只能包含小写字母、数字、点号
- ✅ 每段必须以字母开头
- ✅ 不能使用 Java 关键字

合法示例：
- `com.google.aistudio`
- `cn.juejin.app`
- `com.example.myapp`

非法示例：
- `Google.AIStudio`（包含大写）
- `com.123app`（数字开头）
- `app`（缺少包名层级）

### 3. 版本号格式

推荐使用语义化版本号：
- `主版本号.次版本号.修订号`
- 示例：`1.0.0`、`2.3.15`、`0.0.1`

### 4. 如何重新打包同一版本

如果需要重新打包同一版本（相同的 app-name 和 version）：

```bash
# 方式 1：脚本会自动删除旧 Tag 并重新创建
npm run packplus -- \
  --url https://example.com \
  --icon ~/icon.png \
  --app-name MyApp \
  --app-flag com.myapp \
  --app-version 1.0.0

# 方式 2：手动删除 Tag 后再打包
git tag -d MyApp-v1.0.0
git push origin :refs/tags/MyApp-v1.0.0
```

### 5. 调试模式说明

使用 `--debug` 参数后：
- ✅ 应用启动时会自动加载 vConsole
- ✅ 可以在移动端查看 console 日志
- ✅ 方便调试网页问题

**注意**：生产环境请关闭调试模式。

### 6. 本地测试配置

如果只想生成配置，不想提交到 Git：

```bash
# 使用 --skip-git 参数
npm run packplus -- \
  --url https://example.com \
  --icon ~/icon.png \
  --app-name Test \
  --app-flag com.test \
  --app-version 0.0.1 \
  --skip-git

# 然后本地构建测试
./gradlew assembleDebug
```

### 7. GitHub Actions 构建失败

如果 GitHub Actions 构建失败，检查：

1. **是否配置了 Environment**
   - 去 Settings → Environments 检查
   - 确认 workflow 中的 `environment` 配置正确

2. **权限问题**
   - 去 Settings → Actions → General
   - 确保 "Workflow permissions" 设置为 "Read and write permissions"

3. **Java 版本**
   - workflow 使用 Java 17
   - 本地 Gradle 版本需要兼容

4. **签名配置**
   - Release 构建需要签名
   - 可以在 GitHub Secrets 中配置签名密钥

## 构建产物

### GitHub Release

构建完成后，在 GitHub 仓库的 Releases 页面可以看到：
- 📦 Release 标题：`{app-name} v{version}`
- 📦 附件：`{app-name}-v{version}.apk`
- 📦 描述：自定义的应用描述

### 本地构建

如果想在本地构建测试：

```bash
# Debug 版本（需要签名）
./gradlew assembleDebug

# Release 版本（需要签名）
./gradlew assembleRelease

# APK 位置
# Debug: app/build/outputs/apk/debug/app-debug.apk
# Release: app/build/outputs/apk/release/app-release.apk
```

## 自定义 JS 注入

如果需要在网页加载时注入自定义 JS：

1. 编辑 `app/src/main/assets/custom.js`
2. 添加你的 JavaScript 代码
3. 重新运行 `packplus` 命令

示例：
```javascript
// custom.js
// 拦截所有链接点击，在应用内打开
document.addEventListener('click', function(e) {
    if (e.target.tagName === 'A') {
        e.preventDefault();
        window.location.href = e.target.href;
    }
});
```

## 完整命令参考

```bash
npm run packplus -- \
  --url <string>              # 必选：网页URL
  --icon <path>               # 必选：图标路径
  --app-name <string>         # 必选：应用名称
  --app-flag <string>         # 必选：包名
  --app-version <string>      # 必选：版本号
  --debug                     # 可选：开启调试
  --safe-area <area>          # 可选：安全区域 (all|top|bottom|left|right|horizontal|vertical)
  --user-agent <string>       # 可选：自定义UA
  --desc <string>             # 可选：应用描述
  --skip-git                  # 可选：跳过Git操作
```

## 查看帮助

```bash
npm run packplus -- --help
```

## 技术栈

- **图标生成**：Sharp（替代 ImageMagick）
- **配置管理**：ppconfig.json
- **构建工具**：Gradle + Android SDK
- **CI/CD**：GitHub Actions
- **命令行工具**：Commander.js

## 相关文件

- `scripts/packplus.cjs` - 主命令脚本
- `scripts/ppworker.cjs` - 资源生成脚本
- `scripts/ppconfig.json` - 配置文件
- `.github/workflows/android-build.yml` - CI/CD 配置
- `app/src/main/assets/custom.js` - 自定义 JS 注入

## 项目仓库

如有问题或建议，欢迎提交 Issue。
