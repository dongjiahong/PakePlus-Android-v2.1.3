#!/usr/bin/env node

const { Command } = require('commander')
const fs = require('fs-extra')
const path = require('path')
const { execSync } = require('child_process')

const program = new Command()

program
    .name('packplus')
    .description('PakePlus Android 快速打包工具')
    .version('1.0.0')
    .requiredOption('--url <url>', '应用要加载的网页URL')
    .requiredOption('--icon <path>', '应用图标路径')
    .requiredOption('--app-name <name>', '应用显示名称')
    .requiredOption('--app-flag <id>', 'Android应用包名(如: com.aistudio.com)')
    .requiredOption('--app-version <version>', '应用版本号')
    .option('--debug', '开启调试模式(vConsole)', false)
    .option('--safe-area <area>', '安全区域设置(all/top/bottom/left/right/horizontal/vertical)', 'all')
    .option('--user-agent <ua>', '自定义UserAgent')
    .option('--desc <description>', '应用描述', 'Package for personal use only, please do not use for commercial purposes（打包仅限个人使用，请勿传播或商业用途）')
    .option('--skip-git', '跳过Git提交和打Tag', false)
    .action(async (options) => {
        try {
            console.log('🚀 开始打包流程...\n')

            // 验证图标文件
            const iconPath = path.resolve(options.icon)
            if (!fs.existsSync(iconPath)) {
                throw new Error(`图标文件不存在: ${iconPath}`)
            }

            // 读取配置文件
            const configPath = path.join(__dirname, 'ppconfig.json')
            const config = await fs.readJSON(configPath)

            // 更新Android配置
            config.android.name = `${options.appName}-v${options.appVersion}`
            config.android.showName = options.appName
            config.android.version = options.appVersion
            config.android.webUrl = options.url
            config.android.id = options.appFlag
            config.android.icon = iconPath
            config.android.input = iconPath
            config.android.debug = options.debug
            config.android.safeArea = options.safeArea
            config.android.desc = options.desc
            config.android.pubBody = options.desc

            // 更新WebView配置
            if (options.userAgent) {
                config.phone.webview.userAgent = options.userAgent
            }

            // 保存配置
            await fs.writeJSON(configPath, config, { spaces: 4 })
            console.log('✅ 配置文件已更新')

            // 运行ppworker脚本
            console.log('\n📦 生成应用资源...')
            execSync('npm run pp:worker', { stdio: 'inherit', cwd: path.join(__dirname, '..') })

            if (!options.skipGit) {
                // Git操作
                const tagName = `${options.appName}-v${options.appVersion}`
                const commitMsg = `build: 打包 ${options.appName} v${options.appVersion}\n\n- URL: ${options.url}\n- 包名: ${options.appFlag}`

                console.log('\n📝 提交代码到Git...')
                execSync('git add .', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
                execSync(`git commit -m "${commitMsg}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') })

                console.log(`\n🏷️  创建Tag: ${tagName}`)
                execSync(`git tag ${tagName}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') })

                console.log('\n🚀 推送到远程仓库...')
                execSync('git push', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
                execSync(`git push origin ${tagName}`, { stdio: 'inherit', cwd: path.join(__dirname, '..') })

                console.log('\n✅ 打包流程完成！')
                console.log(`\n🎉 GitHub Actions 将自动构建 ${tagName}`)
                console.log('📦 构建完成后可在 Releases 页面下载APK')
            } else {
                console.log('\n✅ 配置生成完成！(已跳过Git提交)')
                console.log('💡 请手动执行以下命令完成发布：')
                console.log(`   git add .`)
                console.log(`   git commit -m "build: 打包 ${options.appName} v${options.appVersion}"`)
                console.log(`   git tag ${options.appName}-v${options.appVersion}`)
                console.log(`   git push && git push origin ${options.appName}-v${options.appVersion}`)
            }

        } catch (error) {
            console.error('\n❌ 打包失败:', error.message)
            process.exit(1)
        }
    })

program.parse()
