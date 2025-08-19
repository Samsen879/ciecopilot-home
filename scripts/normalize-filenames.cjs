const fs = require('fs');
const path = require('path');

// 配置路径
const DATA_DIR = 'C:\\Users\\Samsen\\cie-copilot\\data';

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
        directory: dirPath
      });
    }
  }
  
  return fileList;
}

// 检查文件名是否需要规范化
function needsNormalization(filename) {
  // 检查是否有 (1), (2), (3) 等后缀
  return /\(\d+\)\.pdf$/i.test(filename);
}

// 规范化文件名
function normalizeFilename(filename) {
  // 移除 (1), (2), (3) 等后缀
  return filename.replace(/\(\d+\)(\.pdf)$/i, '$1');
}

// 检查目标文件名是否已存在
function targetExists(directory, newFilename) {
  const targetPath = path.join(directory, newFilename);
  return fs.existsSync(targetPath);
}

// 规范化所有文件名
function normalizeAllFilenames() {
  console.log('🔧 开始规范化文件名...');
  console.log('='.repeat(60));
  
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`错误: 数据目录不存在 ${DATA_DIR}`);
    return;
  }
  
  try {
    // 获取所有PDF文件
    const allFiles = getAllPdfFiles(DATA_DIR);
    console.log(`找到 ${allFiles.length} 个PDF文件`);
    
    // 筛选需要规范化的文件
    const filesToNormalize = allFiles.filter(file => needsNormalization(file.name));
    
    if (filesToNormalize.length === 0) {
      console.log('\n🎉 所有文件名都已规范化！');
      return;
    }
    
    console.log(`\n发现 ${filesToNormalize.length} 个需要规范化的文件`);
    console.log('\n开始重命名...');
    
    let renamedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const file of filesToNormalize) {
      const normalizedName = normalizeFilename(file.name);
      const oldPath = file.path;
      const newPath = path.join(file.directory, normalizedName);
      
      try {
        // 检查目标文件是否已存在
        if (targetExists(file.directory, normalizedName)) {
          console.log(`⚠️  跳过: ${file.name} -> ${normalizedName} (目标文件已存在)`);
          skippedCount++;
          continue;
        }
        
        // 重命名文件
        fs.renameSync(oldPath, newPath);
        console.log(`✅ 重命名: ${file.name} -> ${normalizedName}`);
        renamedCount++;
        
      } catch (error) {
        console.error(`❌ 重命名失败 ${file.name}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 规范化统计:');
    console.log(`   成功重命名: ${renamedCount} 个文件`);
    console.log(`   跳过文件: ${skippedCount} 个文件`);
    console.log(`   错误文件: ${errorCount} 个文件`);
    
    if (renamedCount > 0) {
      console.log('\n✅ 文件名规范化完成！');
    }
    
  } catch (error) {
    console.error(`处理过程中发生错误: ${error.message}`);
  }
}

// 生成规范化报告
function generateNormalizationReport() {
  console.log('\n📋 文件名规范化报告:');
  console.log('='.repeat(60));
  
  const allFiles = getAllPdfFiles(DATA_DIR);
  const unnormalizedFiles = allFiles.filter(file => needsNormalization(file.name));
  
  if (unnormalizedFiles.length === 0) {
    console.log('✅ 所有文件名都已规范化！');
    return;
  }
  
  console.log(`发现 ${unnormalizedFiles.length} 个需要规范化的文件:`);
  
  // 按目录分组
  const groupedByDir = new Map();
  
  for (const file of unnormalizedFiles) {
    const relativePath = path.relative(DATA_DIR, file.directory);
    if (!groupedByDir.has(relativePath)) {
      groupedByDir.set(relativePath, []);
    }
    groupedByDir.get(relativePath).push(file);
  }
  
  for (const [dirPath, files] of groupedByDir) {
    console.log(`\n📁 ${dirPath} (${files.length} 个文件):`);
    for (const file of files) {
      const normalizedName = normalizeFilename(file.name);
      console.log(`   ${file.name} -> ${normalizedName}`);
    }
  }
}

// 主函数
function main() {
  console.log('📝 CIE A-Level 真题文件名规范化工具');
  console.log('='.repeat(60));
  
  // 生成报告
  generateNormalizationReport();
  
  // 执行规范化
  normalizeAllFilenames();
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { normalizeAllFilenames, generateNormalizationReport };