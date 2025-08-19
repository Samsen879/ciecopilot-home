const fs = require('fs');
const path = require('path');

// 配置路径
const PHYSICS_DIR = 'C:\\Users\\Samsen\\cie-copilot\\data\\past-papers\\9702Physics';
const AS_LEVEL_DIR = path.join(PHYSICS_DIR, 'AS-LEVEL');
const A2_LEVEL_DIR = path.join(PHYSICS_DIR, 'A2-LEVEL');

// 目标paper目录
const PAPER_DIRS = {
  'paper1': path.join(PHYSICS_DIR, 'paper1'),
  'paper2': path.join(PHYSICS_DIR, 'paper2'),
  'paper3': path.join(PHYSICS_DIR, 'paper3'),
  'paper4': path.join(PHYSICS_DIR, 'paper4'),
  'paper5': path.join(PHYSICS_DIR, 'paper5')
};

// 创建目标目录
function createTargetDirectories() {
  for (const [paperName, paperPath] of Object.entries(PAPER_DIRS)) {
    if (!fs.existsSync(paperPath)) {
      fs.mkdirSync(paperPath, { recursive: true });
      console.log(`创建目录: ${paperName}`);
    }
  }
}

// 递归获取目录中的所有PDF文件
function getAllPdfFiles(dirPath, fileList = []) {
  if (!fs.existsSync(dirPath)) {
    return fileList;
  }
  
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

// 从文件名中提取paper类型
function extractPaperType(filename) {
  // 匹配 _qp_XX 或 _ms_XX 格式
  const match = filename.match(/_(?:qp|ms)_(\d)(\d)/i);
  if (match) {
    const paperNum = match[1];
    return `paper${paperNum}`;
  }
  
  // 匹配新格式 qp-YYYYMM-physics-pXX.pdf
  const newFormatMatch = filename.match(/qp-\d{6}-physics-p(\d)(\d)/i);
  if (newFormatMatch) {
    const paperNum = newFormatMatch[1];
    return `paper${paperNum}`;
  }
  
  // 特殊情况处理
  if (filename.includes('_qp_5') || filename.includes('_ms_5') || filename.includes('-p5')) {
    return 'paper5';
  }
  if (filename.includes('_qp_4') || filename.includes('_ms_4') || filename.includes('-p4')) {
    return 'paper4';
  }
  if (filename.includes('_qp_3') || filename.includes('_ms_3') || filename.includes('-p3')) {
    return 'paper3';
  }
  if (filename.includes('_qp_2') || filename.includes('_ms_2') || filename.includes('-p2')) {
    return 'paper2';
  }
  if (filename.includes('_qp_1') || filename.includes('_ms_1') || filename.includes('-p1')) {
    return 'paper1';
  }
  
  return null;
}

// 移动文件到正确的paper目录
function moveFileToCorrectPaper(file) {
  const paperType = extractPaperType(file.name);
  
  if (!paperType || !PAPER_DIRS[paperType]) {
    console.log(`⚠️  无法确定paper类型: ${file.name}`);
    return false;
  }
  
  const targetDir = PAPER_DIRS[paperType];
  const targetPath = path.join(targetDir, file.name);
  
  // 检查目标文件是否已存在
  if (fs.existsSync(targetPath)) {
    console.log(`⚠️  目标文件已存在，跳过: ${file.name}`);
    return false;
  }
  
  try {
    // 移动文件
    fs.renameSync(file.path, targetPath);
    console.log(`✅ 移动: ${file.name} -> ${paperType}/`);
    return true;
  } catch (error) {
    console.error(`❌ 移动失败 ${file.name}: ${error.message}`);
    return false;
  }
}

// 删除空目录
function removeEmptyDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  try {
    const items = fs.readdirSync(dirPath);
    
    // 递归删除子目录
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        removeEmptyDirectories(itemPath);
      }
    }
    
    // 检查目录是否为空
    const remainingItems = fs.readdirSync(dirPath);
    if (remainingItems.length === 0) {
      fs.rmdirSync(dirPath);
      console.log(`🗑️  删除空目录: ${path.relative(PHYSICS_DIR, dirPath)}`);
    }
  } catch (error) {
    console.error(`删除目录失败 ${dirPath}: ${error.message}`);
  }
}

// 重新组织Physics文件
function reorganizePhysicsFiles() {
  console.log('🔧 开始重新组织9702Physics文件...');
  console.log('='.repeat(60));
  
  if (!fs.existsSync(PHYSICS_DIR)) {
    console.error(`错误: Physics目录不存在 ${PHYSICS_DIR}`);
    return;
  }
  
  try {
    // 创建目标目录
    createTargetDirectories();
    
    // 获取AS-LEVEL和A2-LEVEL中的所有文件
    const asLevelFiles = getAllPdfFiles(AS_LEVEL_DIR);
    const a2LevelFiles = getAllPdfFiles(A2_LEVEL_DIR);
    const allFiles = [...asLevelFiles, ...a2LevelFiles];
    
    console.log(`\n找到 ${allFiles.length} 个PDF文件需要重新组织`);
    
    if (allFiles.length === 0) {
      console.log('\n🎉 没有文件需要重新组织！');
      return;
    }
    
    console.log('\n开始移动文件...');
    
    let movedCount = 0;
    let skippedCount = 0;
    
    // 按paper类型统计
    const paperStats = {
      'paper1': 0,
      'paper2': 0,
      'paper3': 0,
      'paper4': 0,
      'paper5': 0,
      'unknown': 0
    };
    
    for (const file of allFiles) {
      const paperType = extractPaperType(file.name);
      
      if (moveFileToCorrectPaper(file)) {
        movedCount++;
        if (paperType && paperStats.hasOwnProperty(paperType)) {
          paperStats[paperType]++;
        } else {
          paperStats.unknown++;
        }
      } else {
        skippedCount++;
      }
    }
    
    console.log('\n📊 重新组织统计:');
    console.log(`   成功移动: ${movedCount} 个文件`);
    console.log(`   跳过文件: ${skippedCount} 个文件`);
    
    console.log('\n📋 按paper类型分布:');
    for (const [paperType, count] of Object.entries(paperStats)) {
      if (count > 0) {
        console.log(`   ${paperType}: ${count} 个文件`);
      }
    }
    
    // 清理空目录
    console.log('\n🧹 清理空目录...');
    removeEmptyDirectories(AS_LEVEL_DIR);
    removeEmptyDirectories(A2_LEVEL_DIR);
    
    console.log('\n✅ Physics文件重新组织完成！');
    
  } catch (error) {
    console.error(`处理过程中发生错误: ${error.message}`);
  }
}

// 生成重新组织报告
function generateReorganizationReport() {
  console.log('\n📋 Physics文件重新组织报告:');
  console.log('='.repeat(60));
  
  // 检查AS-LEVEL和A2-LEVEL中的文件
  const asLevelFiles = getAllPdfFiles(AS_LEVEL_DIR);
  const a2LevelFiles = getAllPdfFiles(A2_LEVEL_DIR);
  const allFiles = [...asLevelFiles, ...a2LevelFiles];
  
  if (allFiles.length === 0) {
    console.log('✅ 所有Physics文件都已正确组织！');
    return;
  }
  
  console.log(`发现 ${allFiles.length} 个需要重新组织的文件:`);
  
  // 按来源目录分组
  const asFiles = allFiles.filter(f => f.directory.includes('AS-LEVEL'));
  const a2Files = allFiles.filter(f => f.directory.includes('A2-LEVEL'));
  
  if (asFiles.length > 0) {
    console.log(`\n📁 AS-LEVEL (${asFiles.length} 个文件):`);
    for (const file of asFiles.slice(0, 10)) { // 只显示前10个
      const paperType = extractPaperType(file.name) || 'unknown';
      console.log(`   ${file.name} -> ${paperType}`);
    }
    if (asFiles.length > 10) {
      console.log(`   ... 还有 ${asFiles.length - 10} 个文件`);
    }
  }
  
  if (a2Files.length > 0) {
    console.log(`\n📁 A2-LEVEL (${a2Files.length} 个文件):`);
    for (const file of a2Files.slice(0, 10)) { // 只显示前10个
      const paperType = extractPaperType(file.name) || 'unknown';
      console.log(`   ${file.name} -> ${paperType}`);
    }
    if (a2Files.length > 10) {
      console.log(`   ... 还有 ${a2Files.length - 10} 个文件`);
    }
  }
}

// 主函数
function main() {
  console.log('📝 CIE A-Level Physics文件重新组织工具');
  console.log('='.repeat(60));
  
  // 生成报告
  generateReorganizationReport();
  
  // 执行重新组织
  reorganizePhysicsFiles();
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { reorganizePhysicsFiles, generateReorganizationReport };