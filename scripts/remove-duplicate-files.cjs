const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 配置路径
const DATA_DIR = 'C:\\Users\\Samsen\\cie-copilot\\data';

// 计算文件的MD5哈希值
function calculateFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('md5');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// 递归获取目录中的所有PDF文件
function getAllPdfFiles(dirPath, fileList = []) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      getAllPdfFiles(itemPath, fileList);
    } else if (stat.isFile() && item.toLowerCase().endsWith('.pdf')) {
      fileList.push({
        path: itemPath,
        name: item,
        size: stat.size,
        relativePath: path.relative(DATA_DIR, itemPath)
      });
    }
  }
  
  return fileList;
}

// 查找重复文件
function findDuplicateFiles() {
  console.log('开始扫描data目录中的所有PDF文件...');
  
  const allFiles = getAllPdfFiles(DATA_DIR);
  console.log(`找到 ${allFiles.length} 个PDF文件`);
  
  console.log('\n正在计算文件哈希值...');
  const hashMap = new Map();
  const duplicates = [];
  
  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    
    try {
      const hash = calculateFileHash(file.path);
      
      if (hashMap.has(hash)) {
        // 发现重复文件
        const existingFile = hashMap.get(hash);
        duplicates.push({
          hash,
          original: existingFile,
          duplicate: file
        });
        console.log(`发现重复文件: ${file.relativePath} (与 ${existingFile.relativePath} 相同)`);
      } else {
        hashMap.set(hash, file);
      }
      
      // 显示进度
      if ((i + 1) % 50 === 0 || i === allFiles.length - 1) {
        console.log(`进度: ${i + 1}/${allFiles.length}`);
      }
    } catch (error) {
      console.error(`无法处理文件 ${file.relativePath}: ${error.message}`);
    }
  }
  
  return duplicates;
}

// 删除重复文件
function removeDuplicateFiles(duplicates) {
  if (duplicates.length === 0) {
    console.log('\n🎉 没有发现重复文件！');
    return;
  }
  
  console.log(`\n发现 ${duplicates.length} 个重复文件，开始删除...`);
  
  let deletedCount = 0;
  let deletedSize = 0;
  
  for (const duplicate of duplicates) {
    try {
      const duplicateFile = duplicate.duplicate;
      
      // 删除重复文件
      fs.unlinkSync(duplicateFile.path);
      deletedCount++;
      deletedSize += duplicateFile.size;
      
      console.log(`✅ 已删除: ${duplicateFile.relativePath}`);
      console.log(`   保留原文件: ${duplicate.original.relativePath}`);
    } catch (error) {
      console.error(`❌ 删除失败 ${duplicate.duplicate.relativePath}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 删除统计:`);
  console.log(`   删除文件数: ${deletedCount}`);
  console.log(`   节省空间: ${(deletedSize / 1024 / 1024).toFixed(2)} MB`);
}

// 生成重复文件报告
function generateDuplicateReport(duplicates) {
  if (duplicates.length === 0) {
    return;
  }
  
  console.log('\n📋 重复文件详细报告:');
  console.log('='.repeat(80));
  
  const groupedByHash = new Map();
  
  // 按哈希值分组
  for (const duplicate of duplicates) {
    if (!groupedByHash.has(duplicate.hash)) {
      groupedByHash.set(duplicate.hash, {
        original: duplicate.original,
        duplicates: []
      });
    }
    groupedByHash.get(duplicate.hash).duplicates.push(duplicate.duplicate);
  }
  
  let groupIndex = 1;
  for (const [hash, group] of groupedByHash) {
    console.log(`\n重复组 ${groupIndex}:`);
    console.log(`哈希值: ${hash}`);
    console.log(`文件大小: ${(group.original.size / 1024).toFixed(2)} KB`);
    console.log(`保留文件: ${group.original.relativePath}`);
    console.log(`重复文件 (${group.duplicates.length}个):`);
    
    for (const duplicate of group.duplicates) {
      console.log(`  - ${duplicate.relativePath}`);
    }
    
    groupIndex++;
  }
}

// 主函数
function removeDuplicates() {
  console.log('🔍 CIE A-Level 真题重复文件检测和清理工具');
  console.log('='.repeat(60));
  
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`错误: 数据目录不存在 ${DATA_DIR}`);
    return;
  }
  
  try {
    // 查找重复文件
    const duplicates = findDuplicateFiles();
    
    // 生成报告
    generateDuplicateReport(duplicates);
    
    // 删除重复文件
    removeDuplicateFiles(duplicates);
    
    console.log('\n✅ 重复文件清理完成！');
    
  } catch (error) {
    console.error(`处理过程中发生错误: ${error.message}`);
  }
}

// 运行脚本
if (require.main === module) {
  removeDuplicates();
}

module.exports = { removeDuplicates };