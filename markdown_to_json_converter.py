#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Markdown to JSON Converter
==========================

功能：批量转换文件夹中的Markdown文件为JSON格式
适用于：Supabase、MongoDB、Firestore等数据库

作者：AI Assistant
日期：2024
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Any, Optional


# ================================
# 配置区域 - 可自定义修改
# ================================

# 输入文件夹路径（包含.md文件的文件夹）
INPUT_FOLDER = "./markdown_files"

# 输出JSON文件名
OUTPUT_JSON_FILE = "converted_data.json"

# 文件编码格式
FILE_ENCODING = "utf-8"


# ================================
# 核心转换类
# ================================

class MarkdownToJsonConverter:
    """Markdown文件到JSON转换器"""
    
    def __init__(self, input_folder: str, output_file: str):
        """
        初始化转换器
        
        Args:
            input_folder: 输入文件夹路径
            output_file: 输出JSON文件路径
        """
        self.input_folder = Path(input_folder)
        self.output_file = Path(output_file)
        self.converted_data = []
        
    def find_markdown_files(self) -> List[Path]:
        """
        查找文件夹中的所有Markdown文件
        
        Returns:
            List[Path]: Markdown文件路径列表
        """
        if not self.input_folder.exists():
            raise FileNotFoundError(f"输入文件夹不存在: {self.input_folder}")
        
        # 查找所有.md文件（包括子文件夹）
        md_files = list(self.input_folder.rglob("*.md"))
        
        if not md_files:
            print(f"⚠️  在文件夹 {self.input_folder} 中未找到任何.md文件")
            return []
        
        print(f"📁 找到 {len(md_files)} 个Markdown文件")
        return md_files
    
    def parse_markdown_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """
        解析单个Markdown文件
        
        Args:
            file_path: Markdown文件路径
            
        Returns:
            Dict: 解析后的数据结构，如果解析失败返回None
        """
        try:
            # 读取文件内容
            with open(file_path, 'r', encoding=FILE_ENCODING) as f:
                content = f.read()
            
            # 解析Topic
            topic_match = re.search(r'^# Topic:\s*(.+)$', content, re.MULTILINE)
            if not topic_match:
                print(f"⚠️  文件 {file_path.name} 中未找到Topic标题")
                return None
            
            topic_name = topic_match.group(1).strip()
            
            # 解析所有Subtopic部分
            subtopics = self._parse_subtopics(content)
            
            if not subtopics:
                print(f"⚠️  文件 {file_path.name} 中未找到任何Subtopic")
                return None
            
            return {
                "topic": topic_name,
                "subtopics": subtopics
            }
            
        except Exception as e:
            print(f"❌ 解析文件 {file_path.name} 时出错: {e}")
            return None
    
    def _parse_subtopics(self, content: str) -> List[Dict[str, Any]]:
        """
        解析所有Subtopic部分
        
        Args:
            content: 文件内容
            
        Returns:
            List[Dict]: Subtopic列表
        """
        subtopics = []
        
        # 使用正则表达式分割所有Subtopic部分
        subtopic_pattern = r'^## Subtopic:\s*(.+?)(?=^## Subtopic:|$)'
        subtopic_matches = re.finditer(subtopic_pattern, content, re.MULTILINE | re.DOTALL)
        
        for match in subtopic_matches:
            subtopic_name = match.group(1).split('\n')[0].strip()
            subtopic_content = match.group(1)
            
            # 解析单个Subtopic的内容
            parsed_subtopic = self._parse_single_subtopic(subtopic_name, subtopic_content)
            if parsed_subtopic:
                subtopics.append(parsed_subtopic)
        
        return subtopics
    
    def _parse_single_subtopic(self, subtopic_name: str, subtopic_content: str) -> Dict[str, Any]:
        """
        解析单个Subtopic的内容
        
        Args:
            subtopic_name: Subtopic名称
            subtopic_content: Subtopic内容
            
        Returns:
            Dict: 解析后的Subtopic数据
        """
        result = {
            "subtopic": subtopic_name,
            "content": "",
            "formulas": [],
            "examples": []
        }
        
        # 解析Content部分
        content_match = re.search(r'### Content\s*\n(.*?)(?=### |$)', subtopic_content, re.DOTALL)
        if content_match:
            result["content"] = content_match.group(1).strip()
        
        # 解析Formulas部分
        formulas_match = re.search(r'### Formulas\s*\n(.*?)(?=### |$)', subtopic_content, re.DOTALL)
        if formulas_match:
            formulas_text = formulas_match.group(1).strip()
            # 提取以"-"开头的公式行
            formula_lines = re.findall(r'^-\s*(.+)$', formulas_text, re.MULTILINE)
            # 清理公式，去掉$符号
            result["formulas"] = [formula.strip().replace('$', '') for formula in formula_lines]
        
        # 解析Examples部分
        examples_match = re.search(r'### Examples\s*\n(.*?)(?=### |$)', subtopic_content, re.DOTALL)
        if examples_match:
            examples_text = examples_match.group(1).strip()
            # 提取以数字开头的示例行
            example_lines = re.findall(r'^\d+\.\s*(.+)$', examples_text, re.MULTILINE)
            result["examples"] = [example.strip() for example in example_lines]
        
        return result
    
    def convert_all_files(self) -> bool:
        """
        转换所有Markdown文件
        
        Returns:
            bool: 转换是否成功
        """
        print(f"🚀 开始转换Markdown文件...")
        print(f"📂 输入文件夹: {self.input_folder.absolute()}")
        print(f"📄 输出文件: {self.output_file.absolute()}")
        print("-" * 50)
        
        # 查找所有Markdown文件
        md_files = self.find_markdown_files()
        if not md_files:
            return False
        
        # 逐个处理文件
        successful_conversions = 0
        for i, file_path in enumerate(md_files, 1):
            print(f"📋 [{i}/{len(md_files)}] 正在处理: {file_path.name}")
            
            # 解析文件
            parsed_data = self.parse_markdown_file(file_path)
            if parsed_data:
                self.converted_data.append(parsed_data)
                successful_conversions += 1
                print(f"✅ 成功解析: {file_path.name}")
            else:
                print(f"❌ 解析失败: {file_path.name}")
        
        # 保存JSON文件
        if self.converted_data:
            return self._save_json_file(successful_conversions, len(md_files))
        else:
            print("❌ 没有成功转换任何文件")
            return False
    
    def _save_json_file(self, successful_count: int, total_count: int) -> bool:
        """
        保存JSON文件
        
        Args:
            successful_count: 成功转换的文件数
            total_count: 总文件数
            
        Returns:
            bool: 保存是否成功
        """
        try:
            # 创建输出目录（如果不存在）
            self.output_file.parent.mkdir(parents=True, exist_ok=True)
            
            # 写入JSON文件
            with open(self.output_file, 'w', encoding=FILE_ENCODING, newline='\n') as f:
                json.dump(self.converted_data, f, ensure_ascii=False, indent=2)
            
            print("-" * 50)
            print(f"🎉 转换完成!")
            print(f"📊 成功转换: {successful_count}/{total_count} 个文件")
            print(f"💾 输出文件: {self.output_file.absolute()}")
            print(f"📈 总计Topic数: {len(self.converted_data)}")
            
            # 统计Subtopic总数
            total_subtopics = sum(len(topic.get("subtopics", [])) for topic in self.converted_data)
            print(f"📈 总计Subtopic数: {total_subtopics}")
            
            return True
            
        except Exception as e:
            print(f"❌ 保存JSON文件时出错: {e}")
            return False


# ================================
# 主函数
# ================================

def main():
    """主函数 - 程序入口"""
    print("=" * 60)
    print("🔄 Markdown to JSON Converter")
    print("=" * 60)
    
    try:
        # 创建转换器实例
        converter = MarkdownToJsonConverter(INPUT_FOLDER, OUTPUT_JSON_FILE)
        
        # 执行转换
        success = converter.convert_all_files()
        
        if success:
            print("🎊 所有操作完成!")
        else:
            print("⚠️  转换过程中遇到问题，请检查上述错误信息")
            
    except KeyboardInterrupt:
        print("\n⏹️  用户中断操作")
    except Exception as e:
        print(f"❌ 程序执行出错: {e}")


# ================================
# 辅助函数
# ================================

def create_sample_markdown():
    """创建示例Markdown文件（用于测试）"""
    sample_content = """# Topic: 数学基础

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
- $V = \frac{4}{3}πr^3$
- $A = \frac{1}{2}bh$

### Examples
1. 计算圆的面积
2. 求三角形的周长
3. 计算长方体的体积
"""
    
    # 创建示例文件夹
    sample_folder = Path("./markdown_files")
    sample_folder.mkdir(exist_ok=True)
    
    # 创建示例文件
    with open(sample_folder / "sample.md", 'w', encoding='utf-8') as f:
        f.write(sample_content)
    
    print(f"📝 已创建示例文件: {sample_folder / 'sample.md'}")


if __name__ == "__main__":
    # 取消注释下面这行来创建示例文件
    # create_sample_markdown()
    
    main() 