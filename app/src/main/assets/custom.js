console.log(
    '%c主题由 PakePlus 动态管理',
    'color:orangered;font-weight:bolder'
)

/**
 * 系统栏动态主题管理器
 */
;(function() {
    let lastAppliedColor = null
    let debounceTimer = null

    /**
     * 从元素中提取背景色
     */
    function getBackgroundColor(element) {
        if (!element) return null

        const computed = window.getComputedStyle(element)
        const bgColor = computed.backgroundColor

        // 跳过透明色
        if (!bgColor || bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
            return null
        }

        return bgColor
    }

    /**
     * 检测页面背景色并更新系统栏
     */
    function detectAndUpdateTheme() {
        const candidates = [
            document.body,
            document.documentElement,
            document.querySelector('html')
        ]

        for (const element of candidates) {
            const bgColor = getBackgroundColor(element)
            if (bgColor && bgColor !== lastAppliedColor) {
                applyThemeColor(bgColor)
                return
            }
        }

        // 降级：使用白色
        if (!lastAppliedColor) {
            applyThemeColor('#FFFFFF')
        }
    }

    /**
     * 应用主题颜色（带防抖）
     */
    function applyThemeColor(color) {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            try {
                if (window.ThemeBridge && typeof window.ThemeBridge.updateSystemBarColor === 'function') {
                    window.ThemeBridge.updateSystemBarColor(color)
                    lastAppliedColor = color
                    console.log('✅ 系统栏颜色已更新:', color)
                } else {
                    console.warn('⚠️ ThemeBridge 未就绪')
                }
            } catch (e) {
                console.error('❌ 更新系统栏颜色失败:', e)
            }
        }, 300) // 防抖 300ms
    }

    /**
     * 初始化 MutationObserver
     */
    function initObserver() {
        const observer = new MutationObserver((mutations) => {
            const hasStyleChange = mutations.some(mutation =>
                mutation.type === 'attributes' &&
                (mutation.attributeName === 'style' || mutation.attributeName === 'class')
            )

            if (hasStyleChange) {
                detectAndUpdateTheme()
            }
        })

        const targets = [document.documentElement, document.body].filter(Boolean)
        targets.forEach(target => {
            observer.observe(target, {
                attributes: true,
                attributeFilter: ['style', 'class']
            })
        })

        console.log('🚀 主题监听器已启动')
    }

    /**
     * 页面加载完成后初始化
     */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            detectAndUpdateTheme()
            initObserver()
        })
    } else {
        detectAndUpdateTheme()
        initObserver()
    }
})()
