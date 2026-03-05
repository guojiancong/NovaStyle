#!/bin/bash

# 🔒 推送前安全检查脚本
# 使用方法：./pre-push-check.sh

echo "🔍 开始推送前安全检查..."
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 检查列表
echo "📋 检查项目："
echo ""

# 1. 检查 .env 文件
echo -n "1. 检查 .env 文件... "
if [ -f ".env" ]; then
    if git ls-files --error-unmatch .env > /dev/null 2>&1; then
        echo -e "${RED}❌ 发现 .env 文件已被 Git 跟踪${NC}"
        echo "   建议：git rm --cached .env"
        ((ERRORS++))
    else
        echo -e "${GREEN}✅ .env 文件未跟踪（安全）${NC}"
    fi
else
    echo -e "${GREEN}✅ 未发现 .env 文件${NC}"
fi

# 2. 检查测试脚本中的 API Key
echo -n "2. 检查测试脚本中的 API Key... "
if grep -r "sk-[A-Za-z0-9]\{20,\}" --include="*.js" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v ".git" > /dev/null; then
    echo -e "${RED}❌ 发现代码中包含 API Key${NC}"
    echo "   找到的文件:"
    grep -r "sk-[A-Za-z0-9]\{20,\}" --include="*.js" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v ".git" | head -5
    ((ERRORS++))
else
    echo -e "${GREEN}✅ 未发现硬编码的 API Key${NC}"
fi

# 3. 检查 .gitignore
echo -n "3. 检查 .gitignore 配置... "
if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore; then
        echo -e "${GREEN}✅ .gitignore 已配置${NC}"
    else
        echo -e "${YELLOW}⚠️  .gitignore 未包含 .env${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${RED}❌ 未找到 .gitignore 文件${NC}"
    ((ERRORS++))
fi

# 4. 检查待推送的提交
echo -n "4. 检查待推送的提交... "
PENDING=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l)
if [ "$PENDING" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  有 $PENDING 个待推送的提交${NC}"
    echo "   使用 git log origin/main..HEAD --stat 查看详情"
else
    echo -e "${GREEN}✅ 没有待推送的提交${NC}"
fi

# 5. 检查待暂存的文件
echo -n "5. 检查待暂存的文件... "
STAGED=$(git diff --cached --name-only 2>/dev/null)
if [ -n "$STAGED" ]; then
    echo -e "${YELLOW}⚠️  有以下文件待提交:${NC}"
    echo "$STAGED" | while read file; do
        echo "   - $file"
        # 检查是否是敏感文件
        if [[ "$file" == *.env ]] || [[ "$file" == *password* ]] || [[ "$file" == *secret* ]] || [[ "$file" == *key* ]]; then
            echo -e "${RED}   ⚠️  警告：这可能是敏感文件！${NC}"
            ((WARNINGS++))
        fi
    done
else
    echo -e "${GREEN}✅ 没有待暂存的文件${NC}"
fi

# 6. 检查未暂存的文件
echo -n "6. 检查未暂存的文件... "
UNSTAGED=$(git status --porcelain 2>/dev/null | grep "^??" | awk '{print $2}')
if [ -n "$UNSTAGED" ]; then
    echo -e "${YELLOW}⚠️  有以下未跟踪的文件:${NC}"
    echo "$UNSTAGED" | while read file; do
        echo "   - $file"
        # 检查是否是敏感文件
        if [[ "$file" == ".env" ]] || [[ "$file" == *password* ]] || [[ "$file" == *secret* ]] || [[ "$file" == *key* ]] || [[ "$file" == *.pem ]] || [[ "$file" == *.key ]]; then
            echo -e "${RED}   ⚠️  警告：这可能是敏感文件！请添加到 .gitignore${NC}"
        fi
    done
else
    echo -e "${GREEN}✅ 没有未跟踪的文件${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 总结
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ 发现 $ERRORS 个错误，建议修复后再推送${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  发现 $WARNINGS 个警告，请确认后推送${NC}"
    echo ""
    echo "是否继续推送？(y/N): "
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "✅ 继续推送..."
        exit 0
    else
        echo "❌ 推送已取消"
        exit 1
    fi
else
    echo -e "${GREEN}✅ 安全检查通过，可以推送！${NC}"
    exit 0
fi
