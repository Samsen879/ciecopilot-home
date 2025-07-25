# Markdown to JSON Converter 使用说明

## 📋 功能概述

这个Python脚本可以批量转换文件夹中的Markdown文件为JSON格式，生成的JSON文件可以直接用于数据库（如Supabase、MongoDB、Firestore）。

## 🔧 环境要求

- Python 3.6+
- 无需额外依赖，仅使用Python标准库

## 📁 文件结构

```
项目文件夹/
├── markdown_to_json_converter.py  # 主脚本
├── README_converter.md            # 使用说明
├── markdown_files/                # 输入文件夹（可自定义）
│   ├── file1.md
│   ├── file2.md
│   └── ...
└── converted_data.json            # 输出文件（可自定义）
```

## 📝 Markdown文件格式要求

每个Markdown文件必须严格遵循以下格式：

```markdown
# Topic: 您的主题名称

## Subtopic: 子主题名称1

### Content
这里是正文内容，可以是多行文本。
支持中文和英文。

### Formulas
- $公式1$
- $公式2$
- $公式3$

### Examples
1. 示例1的描述
2. 示例2的描述
3. 示例3的描述

## Subtopic: 子主题名称2

### Content
第二个子主题的正文内容...

### Formulas
- $另一个公式$

### Examples
1. 另一个示例
```

## 🚀 使用步骤

### 1. 配置脚本

打开 `markdown_to_json_converter.py`，在文件顶部修改配置：

```python
# 输入文件夹路径（包含.md文件的文件夹）
INPUT_FOLDER = "./markdown_files"

# 输出JSON文件名
OUTPUT_JSON_FILE = "converted_data.json"

# 文件编码格式
FILE_ENCODING = "utf-8"
```

### 2. 准备Markdown文件

将您的Markdown文件放入指定的输入文件夹中。

### 3. 运行脚本

```bash
python markdown_to_json_converter.py
```

### 4. 查看结果

转换完成后，您会看到类似的输出：

```
============================================================
🔄 Markdown to JSON Converter
============================================================
🚀 开始转换Markdown文件...
📂 输入文件夹: /path/to/your/markdown_files
📄 输出文件: /path/to/your/converted_data.json
--------------------------------------------------
📁 找到 3 个Markdown文件
📋 [1/3] 正在处理: math_basics.md
✅ 成功解析: math_basics.md
📋 [2/3] 正在处理: physics_intro.md
✅ 成功解析: physics_intro.md
📋 [3/3] 正在处理: chemistry_basics.md
✅ 成功解析: chemistry_basics.md
--------------------------------------------------
🎉 转换完成!
📊 成功转换: 3/3 个文件
💾 输出文件: /path/to/your/converted_data.json
📈 总计Topic数: 3
📈 总计Subtopic数: 8
🎊 所有操作完成!
```

## 📊 输出JSON格式

生成的JSON文件格式如下：

```json
[
  {
    "topic": "数学基础",
    "subtopics": [
      {
        "subtopic": "代数基础",
        "content": "代数是数学的一个分支，研究数字、符号和规则的关系。代数的基本概念包括变量、常数、表达式和方程。",
        "formulas": [
          "x + y = z",
          "a^2 + b^2 = c^2",
          "(x + y)^2 = x^2 + 2xy + y^2"
        ],
        "examples": [
          "解方程: 2x + 3 = 7",
          "化简表达式: (x + 2)(x - 2)",
          "求解二次方程: x^2 - 5x + 6 = 0"
        ]
      },
      {
        "subtopic": "几何基础",
        "content": "几何学是研究形状、大小、相对位置等空间性质的数学分支。",
        "formulas": [
          "A = πr^2",
          "V = \\frac{4}{3}πr^3",
          "A = \\frac{1}{2}bh"
        ],
        "examples": [
          "计算圆的面积",
          "求三角形的周长",
          "计算长方体的体积"
        ]
      }
    ]
  }
]
```

## 🔧 创建测试示例

如果您想快速测试脚本，可以取消注释脚本末尾的这行：

```python
# create_sample_markdown()  # 取消注释这行
```

然后运行脚本，它会自动创建一个示例文件用于测试。

## ⚠️ 注意事项

1. **格式严格性**：Markdown文件必须严格遵循指定格式
2. **编码问题**：确保文件使用UTF-8编码
3. **文件路径**：支持相对路径和绝对路径
4. **错误处理**：脚本会跳过格式错误的文件并继续处理其他文件
5. **公式处理**：自动去除公式中的$符号

## 🔄 常见问题解决

### Q: 找不到文件夹
A: 检查`INPUT_FOLDER`路径是否正确，确保文件夹存在

### Q: 解析失败
A: 检查Markdown文件格式是否严格遵循要求，特别是标题级别和关键词

### Q: 中文乱码
A: 确保文件使用UTF-8编码保存

### Q: 公式显示异常
A: 检查公式是否正确使用$符号包围

## 📈 扩展功能

您可以根据需要修改脚本来：
- 支持更多的Markdown格式
- 添加数据验证
- 直接连接数据库
- 支持其他输出格式（如CSV、XML）

## 🤝 技术支持

如果您遇到问题，可以：
1. 检查错误信息
2. 验证文件格式
3. 查看示例文件
4. 修改配置参数 