#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 Markdown to JSON Converter
==============================

这个脚本用于快速测试转换器的功能。
它会自动创建示例文件，运行转换，然后显示结果。
"""

import os
import shutil
from pathlib import Path
from markdown_to_json_converter import MarkdownToJsonConverter

def create_test_files():
    """创建测试用的Markdown文件"""
    
    # 创建测试文件夹
    test_folder = Path("./test_markdown_files")
    test_folder.mkdir(exist_ok=True)
    
    # 测试文件1：数学基础
    math_content = """# Topic: 数学基础

## Subtopic: 代数基础

### Content
代数是数学的一个分支，研究数字、符号和规则的关系。代数的基本概念包括变量、常数、表达式和方程。

### Formulas
- $x + y = z$
- $a^2 + b^2 = c^2$
- $(x + y)^2 = x^2 + 2xy + y^2$

### Examples
1. 解方程: 2x + 3 = 7
2. 化简表达式: (x + 2)(x - 2)
3. 求解二次方程: x^2 - 5x + 6 = 0

## Subtopic: 几何基础

### Content
几何学是研究形状、大小、相对位置等空间性质的数学分支。

### Formulas
- $A = πr^2$
- $V = \\frac{4}{3}πr^3$
- $A = \\frac{1}{2}bh$

### Examples
1. 计算圆的面积
2. 求三角形的周长
3. 计算长方体的体积
"""
    
    # 测试文件2：物理基础
    physics_content = """# Topic: 物理学基础

## Subtopic: 力学基础

### Content
力学是物理学的一个重要分支，研究物体在力的作用下的运动规律。

### Formulas
- $F = ma$
- $v = u + at$
- $s = ut + \\frac{1}{2}at^2$

### Examples
1. 一个质量为2kg的物体，受到10N的力，求加速度
2. 自由落体运动的计算
3. 圆周运动中的向心力计算
"""
    
    # 写入测试文件
    with open(test_folder / "math_basics.md", 'w', encoding='utf-8') as f:
        f.write(math_content)
    
    with open(test_folder / "physics_basics.md", 'w', encoding='utf-8') as f:
        f.write(physics_content)
    
    print(f"✅ 已创建测试文件到文件夹: {test_folder.absolute()}")
    return test_folder

def run_test():
    """运行测试"""
    
    print("🧪 开始测试 Markdown to JSON Converter")
    print("=" * 50)
    
    # 1. 创建测试文件
    test_folder = create_test_files()
    output_file = "test_output.json"
    
    # 2. 运行转换器
    print("\n📋 运行转换器...")
    converter = MarkdownToJsonConverter(str(test_folder), output_file)
    
    success = converter.convert_all_files()
    
    if success:
        print("\n✅ 测试成功!")
        
        # 3. 显示输出文件内容
        print("\n📄 输出文件内容预览:")
        print("-" * 30)
        
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # 只显示前500个字符
                if len(content) > 500:
                    print(content[:500] + "...")
                else:
                    print(content)
        except Exception as e:
            print(f"读取输出文件时出错: {e}")
        
        # 4. 清理提示
        print("\n🧹 清理测试文件:")
        print(f"删除测试文件夹: {test_folder}")
        print(f"删除输出文件: {output_file}")
        
        response = input("\n是否清理测试文件？(y/n): ").strip().lower()
        if response == 'y':
            shutil.rmtree(test_folder, ignore_errors=True)
            if os.path.exists(output_file):
                os.remove(output_file)
            print("✅ 清理完成!")
        else:
            print("📁 测试文件保留，您可以手动查看")
    
    else:
        print("\n❌ 测试失败!")
        print("请检查脚本是否正确运行")

if __name__ == "__main__":
    run_test() 