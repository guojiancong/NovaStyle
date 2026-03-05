# 🔒 NovaStyle 安全指南

## 推送前安全检查

### 每次推送前执行

```bash
cd /home/admin/.openclaw/workspace/NovaStyle

# 1. 运行安全检查
./pre-push-check.sh

# 2. 如果检查通过，推送代码
git push origin main
```

---

## 🚫 禁止提交的文件

### 绝对不要提交

| 文件类型 | 说明 | 示例 |
|----------|------|------|
| `.env` | 环境变量（包含 API Key） | `.env`, `.env.local` |
| 测试脚本 | 包含硬编码 API Key | `test-api.js` |
| 证书密钥 | SSL 证书、私钥 | `*.pem`, `*.key`, `*.crt` |
| 密码文件 | 包含密码的文件 | `password.txt`, `secrets.json` |
| 本地配置 | 个人配置信息 | `*.local`, `.local` |

---

## ✅ 安全实践

### 1. 使用环境变量

**❌ 错误做法**（硬编码 API Key）:
```javascript
const API_KEY = "sk-TXMpVEGrgsJxQFyAKcB5C36ljopOXkIsyupT2T8qRsG5UULy";
```

**✅ 正确做法**（使用环境变量）:
```javascript
const API_KEY = process.env.API_KEY;
```

### 2. 本地测试文件

创建 `test-api.local.js`（不提交到 Git）:
```javascript
// 从环境变量读取
const API_KEY = process.env.API_KEY;

// 或使用 .env 文件
import dotenv from 'dotenv';
dotenv.config();
```

### 3. .gitignore 配置

确保 `.gitignore` 包含:
```gitignore
# 敏感文件
.env
*.env
*.local

# API 测试脚本
test-api.js
test-*.js

# 证书
*.pem
*.key
*.crt

# 日志
*.log

# 依赖
node_modules/
```

---

## 🔍 安全检查清单

### 推送前检查

- [ ] 运行 `./pre-push-check.sh`
- [ ] 检查是否有 `.env` 文件
- [ ] 检查代码中是否有硬编码的 API Key
- [ ] 确认 `.gitignore` 已正确配置
- [ ] 查看 `git status` 确认无敏感文件

### 命令参考

```bash
# 查看待提交的文件
git status

# 查看待推送的提交
git log origin/main..HEAD --oneline

# 检查是否包含敏感词
grep -r "sk-[A-Za-z0-9]\{20,\}" --include="*.js" --include="*.ts" .

# 从 Git 缓存移除文件
git rm --cached <filename>
```

---

## 🆘 如果泄露了 API Key

### 立即行动

1. **撤销 Key**
   - 访问 API 提供商控制台
   - 删除/撤销泄露的 Key
   - 生成新的 Key

2. **从 Git 历史移除**
   ```bash
   # 如果刚提交，使用 git reset
   git reset --soft HEAD~1
   
   # 或使用 BFG 清理历史
   bfg --delete-files .env
   ```

3. **更新本地配置**
   ```bash
   # 创建新的 .env（不提交）
   echo "API_KEY=新 Key" > .env
   
   # 确保在 .gitignore 中
   echo ".env" >> .gitignore
   ```

4. **推送修复**
   ```bash
   git add .gitignore
   git commit -m "security: 移除敏感文件"
   git push origin main
   ```

---

## 📋 安全推送流程

### 标准流程

```bash
# 1. 提交代码
git add .
git commit -m "feat: 新功能"

# 2. 运行安全检查
./pre-push-check.sh

# 3. 如果检查通过
git push origin main

# 4. 如果检查失败
# - 根据提示修复问题
# - 移除敏感文件
# - 重新检查
```

### 快速检查

```bash
# 一键检查 + 推送
./pre-push-check.sh && git push origin main
```

---

## 🛡️ 最佳实践

### 开发环境

1. **使用 .env 文件**（不提交）
   ```bash
   # .env
   API_KEY=你的 Key
   BASE_URL=https://api.example.com
   ```

2. **创建 .env.example**（可以提交）
   ```bash
   # .env.example
   API_KEY=你的 API Key
   BASE_URL=API 地址
   ```

3. **在 README 中说明**
   ```markdown
   ## 配置
   
   1. 复制 `.env.example` 为 `.env`
   2. 填入你的 API Key
   3. 运行 `npm start`
   ```

### 生产环境

1. **使用 CI/CD  secrets**
   - GitHub Secrets
   - GitLab CI Variables
   - 其他 CI 平台的加密变量

2. **不要提交配置文件**
   - 使用环境变量
   - 使用配置管理工具

---

## 📚 相关资源

- [GitHub 安全文档](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure)
- [Git 安全最佳实践](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History)
- [12-Factor App - 配置](https://12factor.net/config)

---

**安全第一！每次推送前都要检查！** 🔐
