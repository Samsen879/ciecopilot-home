const fs = require('fs');
const path = require('path');

// 配置路径
const SOURCE_DIR = 'C:\\Users\\Samsen\\cie-copilot\\data待整理';

// 删除目录及其所有内容
function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        removeDirectory(itemPath); // 递归删除子目录
      } else {
        fs.unlinkSync(itemPath); // 删除文件
      }
    }
    
    fs.rmdirSync(dirPath); // 删除空目录
    console.log(`已删除目录: ${dirPath}`);
  }
}

// 主函数
function cleanupOrganizedFiles() {
  console.log('开始清理已整理的源文件...');
  
  if (!fs.existsSync(SOURCE_DIR)) {
    console.log('源目录不存在，无需清理。');
    return;
  }
  
  // 确认操作
  console.log(`即将删除目录: ${SOURCE_DIR}`);
  console.log('请确认所有文件已正确整理到目标位置。');
  
  // 删除整个源目录
  removeDirectory(SOURCE_DIR);
  
  console.log('清理完成!');
}

// 运行脚本
if (require.main === module) {
  cleanupOrganizedFiles();
}

module.exports = { cleanupOrganizedFiles };

// 注意：运行此脚本前请确保所有文件已正确整理！