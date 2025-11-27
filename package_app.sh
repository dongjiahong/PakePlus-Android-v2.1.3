#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   PakePlus Android 打包脚本${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 预设配置列表
declare -A PRESETS
PRESETS[1]="EchoBack|eb.08082025.xyz|../EchoBack/public/logo.svg|com.echoback.djh"
PRESETS[2]="SceneLingo|scene.08082025.xyz|../SceneLingo/public/logo.svg|com.scenelingo.djh"
PRESETS[3]="EasyFlomo|mo.08082025.xyz|../easyflomo/public/favicon.svg|com.easyflomo.djh"
PRESETS[4]="OnlyReading|en.08082025.xyz|../novel/public/logo.svg|com.onlyreading.djh"

# 显示预设选项
echo -e "${YELLOW}请选择打包配置:${NC}"
echo "1) EchoBack"
echo "2) SceneLingo"
echo "3) EasyFlomo"
echo "4) OnlyReading"
echo "5) 自定义配置"
echo ""
read -p "请输入选项 [1-5]: " choice

if [[ "$choice" =~ ^[1-4]$ ]]; then
    # 使用预设配置
    IFS='|' read -r app_name url icon app_flag <<< "${PRESETS[$choice]}"
    echo -e "\n${GREEN}已选择预设:${NC} $app_name"
else
    # 自定义配置
    echo -e "\n${YELLOW}请输入自定义配置:${NC}"
    read -p "应用名称 (app-name): " app_name
    read -p "网站 URL (url): " url
    read -p "图标路径 (icon): " icon
    read -p "应用标识 (app-flag, 如: com.example.app): " app_flag
fi

# 获取 git tag 信息并智能建议版本号
echo ""
echo -e "${YELLOW}正在分析 Git 标签...${NC}"

# 获取所有与当前应用相关的 tag
app_tags=$(git tag -l 2>/dev/null | grep -i "^$app_name" | sort -V)

if [[ -z "$app_tags" ]]; then
    # 没有找到相关 tag，建议初始版本
    suggested_version="0.0.1"
    echo -e "${BLUE}未找到 $app_name 相关的 Git 标签${NC}"
    echo -e "${GREEN}建议版本号:${NC} $suggested_version (初始版本)"
else
    # 显示最近的几个 tag
    echo -e "${BLUE}找到以下相关标签:${NC}"
    echo "$app_tags" | tail -5

    # 获取最新的 tag
    latest_tag=$(echo "$app_tags" | tail -1)
    echo -e "\n${GREEN}最新标签:${NC} $latest_tag"

    # 从最新 tag 中提取版本号（假设格式为 AppName-v0.0.1 或 AppName-0.0.1）
    latest_version=$(echo "$latest_tag" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | tail -1)

    if [[ -n "$latest_version" ]]; then
        # 解析版本号
        IFS='.' read -r major minor patch <<< "$latest_version"

        # 计算建议的下一个版本（patch+1）
        next_patch=$((patch + 1))
        suggested_version="$major.$minor.$next_patch"

        echo -e "${GREEN}建议版本号:${NC} $suggested_version (基于最新标签自动递增)"
    else
        suggested_version="0.0.1"
        echo -e "${GREEN}建议版本号:${NC} $suggested_version"
    fi
fi

# 让用户确认或修改版本号
echo ""
read -p "请输入版本号 [直接回车使用建议版本 $suggested_version]: " app_version
app_version=${app_version:-$suggested_version}

# 询问是否开启 debug 模式
echo ""
echo -e "${YELLOW}是否开启调试模式？${NC}"
echo "开启后可在应用中查看 vConsole 调试面板"
read -p "开启 debug 模式? [y/N]: " enable_debug
enable_debug=${enable_debug:-N}

# 验证必填参数
if [[ -z "$app_name" ]] || [[ -z "$url" ]] || [[ -z "$icon" ]] || [[ -z "$app_flag" ]] || [[ -z "$app_version" ]]; then
    echo -e "\n${RED}错误: 所有参数都是必填的!${NC}"
    exit 1
fi

# 确认信息
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}打包配置确认:${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "应用名称: ${GREEN}$app_name${NC}"
echo -e "网站 URL: ${GREEN}$url${NC}"
echo -e "图标路径: ${GREEN}$icon${NC}"
echo -e "应用标识: ${GREEN}$app_flag${NC}"
echo -e "版本号:   ${GREEN}$app_version${NC}"
if [[ "$enable_debug" =~ ^[Yy]$ ]]; then
    echo -e "调试模式: ${GREEN}开启${NC}"
else
    echo -e "调试模式: ${YELLOW}关闭${NC}"
fi
echo -e "${BLUE}========================================${NC}\n"

read -p "确认开始打包? [Y/n]: " confirm
confirm=${confirm:-Y}

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}已取消打包${NC}"
    exit 0
fi

# 执行打包命令
echo -e "\n${GREEN}开始打包...${NC}\n"

# 构建基础命令
packplus_cmd="npm run packplus -- \
    --url \"$url\" \
    --icon \"$icon\" \
    --app-name \"$app_name\" \
    --app-flag \"$app_flag\" \
    --app-version \"$app_version\""

# 如果开启 debug 模式，添加 --debug 参数
if [[ "$enable_debug" =~ ^[Yy]$ ]]; then
    packplus_cmd="$packplus_cmd --debug"
fi

# 执行命令
eval $packplus_cmd

# 检查执行结果
if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ 打包成功!${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "\n${RED}========================================${NC}"
    echo -e "${RED}✗ 打包失败!${NC}"
    echo -e "${RED}========================================${NC}"
    exit 1
fi
