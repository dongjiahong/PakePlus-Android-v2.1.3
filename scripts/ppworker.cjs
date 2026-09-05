const fs = require('fs-extra')
const path = require('path')
const sharp = require('sharp')
const ppconfig = require('./ppconfig.json')

async function generateAdaptiveIcons(input, output) {
    // Adaptive icon layers must be 108dp. 48dp legacy sizes get upscaled by
    // the launcher and look blurry on modern Android.
    const densities = {
        'mipmap-mdpi': { legacy: 48, adaptive: 108 },
        'mipmap-hdpi': { legacy: 72, adaptive: 162 },
        'mipmap-xhdpi': { legacy: 96, adaptive: 216 },
        'mipmap-xxhdpi': { legacy: 144, adaptive: 324 },
        'mipmap-xxxhdpi': { legacy: 192, adaptive: 432 },
    }

    // icon背景颜色,可设置为none透明
    const bgColor = '#FFFFFF'
    // Adaptive icon safe zone is the inner 72/108 ≈ 0.67
    const foregroundScale = 0.72

    if (!fs.existsSync(output)) {
        fs.mkdirSync(output, { recursive: true })
    }

    for (const [folder, sizes] of Object.entries(densities)) {
        const dir = path.join(output, folder)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

        const { legacy, adaptive } = sizes
        const backgroundFile = path.join(dir, 'ic_launcher_background.png')
        const foregroundFile = path.join(dir, 'ic_launcher_foreground.png')
        const launcherFile = path.join(dir, 'ic_launcher.png')
        const launcherRoundFile = path.join(dir, 'ic_launcher_round.png')

        // 使用 sharp 生成背景：纯色填充
        await sharp({
            create: {
                width: adaptive,
                height: adaptive,
                channels: 4,
                background: bgColor
            }
        })
        .png()
        .toFile(backgroundFile)

        // 前景大小 = 自适应画布 × 前景缩放比例
        const fgSize = Math.round(adaptive * foregroundScale)
        const left = Math.floor((adaptive - fgSize) / 2)
        const top = Math.floor((adaptive - fgSize) / 2)
        const fgBuffer = await sharp(input)
            .resize(fgSize, fgSize, {
                fit: 'contain',
                kernel: 'lanczos3',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toBuffer()

        await sharp({
            create: {
                width: adaptive,
                height: adaptive,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
            .composite([{ input: fgBuffer, left, top }])
            .png()
            .toFile(foregroundFile)

        // Legacy launcher icons for API < 26 and some OEM launchers
        await sharp(input)
            .resize(legacy, legacy, {
                fit: 'contain',
                kernel: 'lanczos3',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png()
            .toFile(launcherFile)
        await fs.copy(launcherFile, launcherRoundFile)
    }

    // 生成 Adaptive Icon XML (放到 mipmap-anydpi-v26)
    const anydpiDir = path.join(output, 'mipmap-anydpi-v26')
    if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true })

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`

    fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), xml, 'utf-8')
    fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), xml, 'utf-8')

    console.log('✅ Adaptive Icons 已生成:', output)
}

const updateAppName = async (androidResDir, appName) => {
    // workerflow build apk name always is app-debug.apk
    try {
        const stringsPath = path.join(androidResDir, 'values', 'strings.xml')

        // Check if strings.xml exists
        const exists = await fs.pathExists(stringsPath)
        if (!exists) {
            console.log('⚠️ strings.xml not found, creating a new one')
            await fs.ensureDir(path.dirname(stringsPath))
            await fs.writeFile(
                stringsPath,
                `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${appName}</string>
</resources>`
            )
            console.log(`✅ Created strings.xml with app_name: ${appName}`)
            return
        }

        // Read and update existing strings.xml
        let content = await fs.readFile(stringsPath, 'utf8')

        // Check if app_name already exists
        if (content.includes('<string name="app_name">')) {
            content = content.replace(
                /<string name="app_name">.*?<\/string>/,
                `<string name="app_name">${appName}</string>`
            )
        } else {
            // Add app_name if it doesn't exist
            content = content.replace(
                /<\/resources>/,
                `    <string name="app_name">${appName}</string>\n</resources>`
            )
        }

        await fs.writeFile(stringsPath, content)
        console.log(`✅ Updated app_name to: ${appName}`)
    } catch (error) {
        console.error('❌ Error updating app name:', error)
    }
}

const updateWebEnv = async (
    androidResDir,
    webUrl,
    debug,
    webview,
    safeArea
) => {
    try {
        const { userAgent } = webview

        // Assuming MainActivity.kt is in the standard location
        const mainActivityPath = path.join(
            androidResDir.replace('res', ''),
            'java/com/app/pakeplus/MainActivity.kt'
        )

        // Check if file exists
        const exists = await fs.pathExists(mainActivityPath)
        if (!exists) {
            console.log(
                '⚠️ MainActivity.kt not found at expected location:',
                mainActivityPath
            )
            return
        }

        // Read and update the file
        let content = await fs.readFile(mainActivityPath, 'utf8')

        // Replace the web URL in the loadUrl call
        let updatedContent = content.replace(
            /webView\.loadUrl\(".*?"\)/,
            `webView.loadUrl("${webUrl}")`
        )
        // update debug mode
        console.log('webview debug to:', debug)
        if (debug) {
            updatedContent = updatedContent.replace(
                'private var debug = false',
                'private var debug = true'
            )
        } else {
            updatedContent = updatedContent.replace(
                'private var debug = true',
                'private var debug = false'
            )
        }

        // update webview userAgent
        if (userAgent) {
            updatedContent = updatedContent.replace(
                '// webView.settings.userAgentString = ""',
                `webView.settings.userAgentString = "${userAgent}"`
            )
        }

        // update safeArea
        if (safeArea) {
            if (safeArea === 'all') {
                console.log('webview debug to all')
            } else if (safeArea === 'top') {
                updatedContent = updatedContent.replace(
                    'view.setPadding(systemBar.left, systemBar.top, systemBar.right, systemBar.bottom)',
                    `view.setPadding(0, systemBar.top, 0, 0)`
                )
            } else if (safeArea === 'bottom') {
                updatedContent = updatedContent.replace(
                    'view.setPadding(systemBar.left, systemBar.top, systemBar.right, systemBar.bottom)',
                    `view.setPadding(0, 0, 0, systemBar.bottom)`
                )
            } else if (safeArea === 'left') {
                updatedContent = updatedContent.replace(
                    'view.setPadding(systemBar.left, systemBar.top, systemBar.right, systemBar.bottom)',
                    `view.setPadding(systemBar.left, 0, 0, 0)`
                )
            } else if (safeArea === 'right') {
                updatedContent = updatedContent.replace(
                    'view.setPadding(systemBar.left, systemBar.top, systemBar.right, systemBar.bottom)',
                    `view.setPadding(0, 0, systemBar.right, 0)`
                )
            } else if (safeArea === 'horizontal') {
                updatedContent = updatedContent.replace(
                    'view.setPadding(systemBar.left, systemBar.top, systemBar.right, systemBar.bottom)',
                    `view.setPadding(systemBar.left, 0, systemBar.right, 0)`
                )
            } else if (safeArea === 'vertical') {
                updatedContent = updatedContent.replace(
                    'view.setPadding(systemBar.left, systemBar.top, systemBar.right, systemBar.bottom)',
                    `view.setPadding(0, systemBar.top, 0, systemBar.bottom)`
                )
            }
        }

        await fs.writeFile(mainActivityPath, updatedContent)
        console.log(`✅ Updated web URL to: ${webUrl}`)
    } catch (error) {
        console.error('❌ Error updating web URL:', error)
    }
}

// update build yml
const updateBuildYml = async (tagName, releaseName, releaseBody) => {
    try {
        const buildYmlPath = path.join('.github', 'workflows', 'build.yml')
        const exists = await fs.pathExists(buildYmlPath)
        if (!exists) {
            console.log(
                '⚠️ build.yml not found at expected location:',
                buildYmlPath
            )
            return
        }

        // Read the file
        let content = await fs.readFile(buildYmlPath, 'utf8')

        // Replace all occurrences of PakePlus-v0.0.1
        const tagUpdate = content.replaceAll('PakePlus-v0.0.1', tagName)
        const releaseUpdate = tagUpdate.replaceAll(
            'PakePlus v0.0.1',
            releaseName
        )
        const bodyUpdate = releaseUpdate.replaceAll(
            'PakePlus ReleaseBody',
            releaseBody
        )

        // Write back only if changes were made
        if (bodyUpdate !== content) {
            await fs.writeFile(buildYmlPath, bodyUpdate)
            console.log(`✅ Updated build.yml with new app name: ${tagName}`)
        } else {
            console.log('ℹ️ No changes needed in build.yml')
        }
    } catch (error) {
        console.error('❌ Error updating build.yml:', error)
    }
}

// set github env
const setGithubEnv = (name, version, pubBody) => {
    const envPath = process.env.GITHUB_ENV
    if (!envPath) {
        console.log('ℹ️  跳过 GitHub 环境变量设置（仅在 GitHub Actions 中生效）')
        return
    }
    console.log('设置 GitHub 环境变量...')
    try {
        const entries = {
            NAME: name,
            VERSION: version,
            PUBBODY: pubBody,
        }
        for (const [key, value] of Object.entries(entries)) {
            if (value !== undefined) {
                fs.appendFileSync(envPath, `${key}=${value}\n`)
            }
        }
        console.log('✅ GitHub 环境变量已写入')
    } catch (err) {
        console.error('❌ 写入 GitHub 环境变量失败:', err)
    }
}

// update android applicationId
const updateAndroidId = async (id) => {
    const gradlePath = path.join(__dirname, '../app/build.gradle.kts')
    const exists = await fs.pathExists(gradlePath)
    if (!exists) {
        console.log('⚠️ build.gradle.kts not found, creating a new one')
        return
    }

    // Read and update the file
    let content = await fs.readFile(gradlePath, 'utf8')

    // Replace the applicationId
    const updatedContent = content.replace(
        /applicationId = ".*?"/,
        `applicationId = "${id}"`
    )

    // Write back only if changes were made
    if (updatedContent !== content) {
        await fs.writeFile(gradlePath, updatedContent)
        console.log(`✅ Updated applicationId to: ${id}`)
    } else {
        console.log('ℹ️ No changes needed in build.gradle.kts')
    }
}

// Main execution
const main = async () => {
    const { webview } = ppconfig.phone
    const {
        name,
        version,
        id,
        pubBody,
        input,
        output,
        copyTo,
        webUrl,
        showName,
        debug,
        safeArea,
    } = ppconfig.android

    const outPath = path.resolve(output)
    await generateAdaptiveIcons(input, outPath)

    const dest = path.resolve(copyTo)
    await fs.copy(outPath, dest, { overwrite: true })
    console.log(`📦 Icons copied to Android res dir: ${dest}`)

    // Update app name if provided
    await updateAppName(dest, showName)

    // Update web URL if provided
    await updateWebEnv(dest, webUrl, debug, webview, safeArea)

    // 删除根目录的res
    await fs.remove(outPath)

    // update android applicationId
    await updateAndroidId(id)

    // set github env
    setGithubEnv(name, version, pubBody)

    // success
    console.log('✅ Worker Success')
}

// run
;(async () => {
    try {
        console.log('🚀 worker start')
        await main()
        console.log('🚀 worker end')
    } catch (error) {
        console.error('❌ Worker Error:', error)
    }
})()
