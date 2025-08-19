# Supabase 配置指南

本指南将帮助您完成 CIE Copilot 项目的 Supabase 数据库配置。

## 📋 准备工作

### 1. 注册 Supabase 账号
1. 访问 [Supabase官网](https://supabase.com)
2. 点击 "Start your project" 注册账号
3. 使用 GitHub 账号登录（推荐）或邮箱注册

### 2. 创建新项目
1. 登录后点击 "New Project"
2. 选择组织（个人账号）
3. 填写项目信息：
   - **Name**: `cie-copilot`
   - **Database Password**: 设置一个强密码（请记住）
   - **Region**: 选择离您最近的区域（推荐 Singapore 或 Tokyo）
4. 点击 "Create new project"
5. 等待项目创建完成（约2-3分钟）

## 🔧 配置步骤

### 步骤 1: 获取项目凭据

1. 在项目仪表板中，点击左侧菜单的 "Settings" → "API"
2. 复制以下信息：
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `eyJ...` (很长的字符串)

### 步骤 2: 配置环境变量

1. 在项目根目录创建 `.env` 文件：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入您的 Supabase 凭据：
```env
# Supabase 配置
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 应用配置
VITE_APP_NAME=CIE Copilot
VITE_APP_VERSION=1.0.0
VITE_NODE_ENV=development
```

### 步骤 3: 创建数据库表

1. 在 Supabase 仪表板中，点击左侧菜单的 "SQL Editor"
2. 点击 "New query"
3. 复制 `scripts/001_initial_schema.sql` 文件的全部内容
4. 粘贴到 SQL 编辑器中
5. 点击 "Run" 执行 SQL 脚本
6. 确认所有表都创建成功（无错误信息）

### 步骤 4: 配置认证

1. 点击左侧菜单的 "Authentication" → "Settings"
2. 在 "Site URL" 中填入：`http://localhost:5173`
3. 在 "Redirect URLs" 中添加：`http://localhost:5173/**`
4. 启用 "Enable email confirmations"（可选）
5. 点击 "Save"

### 步骤 5: 启用 Supabase 客户端

1. 编辑 `src/utils/supabase.js` 文件
2. 取消注释所有被注释的代码：

```javascript
// 取消注释这些行
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ... 其他代码也要取消注释
```

### 步骤 6: 更新认证上下文

1. 编辑 `src/contexts/AuthContext.jsx` 文件
2. 将临时的 localStorage 实现替换为 Supabase 认证：

```javascript
// 导入 Supabase 客户端
import { supabase } from '../utils/supabase';

// 替换 signIn 函数
const signIn = async (email, password) => {
  setLoading(true);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    setUser(data.user);
    setShowAuthModal(false);
  } catch (error) {
    console.error('登录失败:', error.message);
    throw error;
  } finally {
    setLoading(false);
  }
};

// 类似地更新其他认证函数...
```

## 🧪 测试配置

### 1. 启动开发服务器
```bash
npm run dev
```

### 2. 测试用户注册
1. 访问 `http://localhost:5173`
2. 点击 "登录/注册" 按钮
3. 尝试注册一个新账号
4. 检查 Supabase 仪表板的 "Authentication" → "Users" 是否有新用户

### 3. 运行数据迁移
```bash
node scripts/migrate-data.js
```

## 📊 数据迁移

配置完成后，运行数据迁移脚本将现有的 JSON 数据导入到 Supabase：

```bash
# 确保 Supabase 配置正确后运行
node scripts/migrate-data.js
```

这将会：
- 导入所有科目和试卷信息
- 迁移数学、进阶数学、物理的主题数据
- 验证数据完整性

## 🔍 验证配置

### 检查清单
- [ ] Supabase 项目创建成功
- [ ] 环境变量配置正确
- [ ] 数据库表创建成功
- [ ] 认证设置配置完成
- [ ] 用户注册/登录功能正常
- [ ] 数据迁移完成
- [ ] 应用可以正常访问数据库

### 常见问题

**Q: 无法连接到 Supabase**
- 检查 `.env` 文件中的 URL 和 Key 是否正确
- 确认项目已完全创建（状态为 "Active"）

**Q: SQL 脚本执行失败**
- 检查是否有语法错误
- 确认您有足够的权限
- 尝试分段执行 SQL 脚本

**Q: 用户注册失败**
- 检查认证设置中的 URL 配置
- 确认邮箱格式正确
- 查看浏览器控制台的错误信息

## 📚 下一步

配置完成后，您可以：

1. **测试核心功能**：注册、登录、浏览主题
2. **个性化设置**：配置学习偏好、通知设置
3. **开始学习**：使用进度跟踪和错题本功能
4. **数据分析**：查看学习统计和成就系统

## 🆘 获取帮助

如果遇到问题：
1. 查看 [Supabase 官方文档](https://supabase.com/docs)
2. 检查浏览器控制台的错误信息
3. 查看 Supabase 项目的 "Logs" 页面
4. 参考项目的 GitHub Issues

---

**注意**: 请妥善保管您的 Supabase 凭据，不要将 `.env` 文件提交到版本控制系统中。