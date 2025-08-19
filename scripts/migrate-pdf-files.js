// PDF文件迁移脚本
// 将data待整理目录中的PDF文件移动到正确的data目录结构中

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 源目录和目标目录
const SOURCE_DIR = path.join(__dirname, '../data待整理');
const TARGET_DIR = path.join(__dirname, '../data');

// 确保目标目录存在
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`创建目录: ${dirPath}`);
  }
}

// 解析文件名获取信息
function parseFileName(filename) {
  // 移除 (1) 后缀
  const cleanName = filename.replace(/\(\d+\)/g, '');
  
  // 文件名格式: 9709_s16_qp_11.pdf (subject_session_type_paper.pdf)
  const match = cleanName.match(/^(\d{4})_([^_]+)_([^_]+)_(\d+)\.pdf$/);
  if (!match) return null;
  
  const [, subject, session, type, paperNum] = match;
  return {
    subject,
    session,
    type, // qp = question paper, ms = mark scheme
    paperNum,
    originalName: filename
  };
}

// 获取年份和月份信息
function getYearAndSession(session) {
  const yearMatch = session.match(/([a-z])(\d{2})/);
  if (!yearMatch) return null;
  
  const [, sessionCode, year] = yearMatch;
  const fullYear = `20${year}`;
  
  const sessionMap = {
    's': 'May-June',
    'w': 'October-November', 
    'm': 'March'
  };
  
  return {
    year: fullYear,
    session: sessionMap[sessionCode] || sessionCode
  };
}

// 获取物理试卷的级别
function getPhysicsLevel(paperNum) {
  if (['4', '5'].includes(paperNum)) return 'AS-LEVEL';
  if (['1', '2', '3'].includes(paperNum)) return 'A2-LEVEL';
  return null;
}

// 移动单个文件
function moveFile(sourcePath, targetPath) {
  try {
    ensureDirectoryExists(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✓ 移动: ${path.basename(sourcePath)} -> ${path.relative(process.cwd(), targetPath)}`);
    return true;
  } catch (error) {
    console.error(`✗ 移动失败: ${sourcePath} -> ${targetPath}`, error.message);
    return false;
  }
}

// 处理数学9709文件
function processMathFiles(sourceDir) {
  console.log('\n处理数学9709文件...');
  let processedCount = 0;
  
  const mathDir = path.join(sourceDir, '数学9709');
  if (!fs.existsSync(mathDir)) return processedCount;
  
  function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        processDirectory(filePath);
      } else if (file.endsWith('.pdf')) {
        const fileInfo = parseFileName(file);
        if (!fileInfo || fileInfo.subject !== '9709') continue;
        
        // 跳过不支持的类型和paper2
        if (!['qp', 'ms'].includes(fileInfo.type)) continue;
        if (fileInfo.paperNum === '2') continue;
        
        const typeDir = fileInfo.type === 'qp' ? 'past-papers' : 'mark-schemes';
        const targetPath = path.join(
          TARGET_DIR, 
          typeDir, 
          '9709Mathematics', 
          `paper${fileInfo.paperNum}`, 
          file
        );
        
        if (moveFile(filePath, targetPath)) {
          processedCount++;
        }
      }
    }
  }
  
  processDirectory(mathDir);
  return processedCount;
}

// 处理物理9702文件
function processPhysicsFiles(sourceDir) {
  console.log('\n处理物理9702文件...');
  let processedCount = 0;
  
  const physicsDir = path.join(sourceDir, '物理9702');
  if (!fs.existsSync(physicsDir)) return processedCount;
  
  function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        processDirectory(filePath);
      } else if (file.endsWith('.pdf')) {
        const fileInfo = parseFileName(file);
        if (!fileInfo || fileInfo.subject !== '9702') continue;
        
        // 跳过不支持的类型
        if (!['qp', 'ms'].includes(fileInfo.type)) continue;
        
        const level = getPhysicsLevel(fileInfo.paperNum);
        if (!level) continue;
        
        const typeDir = fileInfo.type === 'qp' ? 'past-papers' : 'mark-schemes';
        const targetPath = path.join(
          TARGET_DIR, 
          typeDir, 
          '9702Physics', 
          level,
          `paper${fileInfo.paperNum}`, 
          file
        );
        
        if (moveFile(filePath, targetPath)) {
          processedCount++;
        }
      }
    }
  }
  
  processDirectory(physicsDir);
  return processedCount;
}

// 处理进阶数学9231文件
function processFurtherMathFiles(sourceDir) {
  console.log('\n处理进阶数学9231文件...');
  let processedCount = 0;
  
  const furtherMathDir = path.join(sourceDir, '进阶数学9231');
  if (!fs.existsSync(furtherMathDir)) return processedCount;
  
  function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        processDirectory(filePath);
      } else if (file.endsWith('.pdf')) {
        const fileInfo = parseFileName(file);
        if (!fileInfo || fileInfo.subject !== '9231') continue;
        
        // 跳过不支持的类型
        if (!['qp', 'ms'].includes(fileInfo.type)) continue;
        if (!['1', '2', '3', '4'].includes(fileInfo.paperNum)) continue;
        
        const typeDir = fileInfo.type === 'qp' ? 'past-papers' : 'mark-schemes';
        const targetPath = path.join(
          TARGET_DIR, 
          typeDir, 
          '9231Further-Mathematics', 
          `paper${fileInfo.paperNum}`, 
          file
        );
        
        if (moveFile(filePath, targetPath)) {
          processedCount++;
        }
      }
    }
  }
  
  processDirectory(furtherMathDir);
  return processedCount;
}

// 主函数
async function migrateAllFiles() {
  console.log('=== CIE PDF文件迁移工具 ===\n');
  
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`源目录不存在: ${SOURCE_DIR}`);
    return;
  }
  
  let totalProcessed = 0;
  
  // 处理各学科文件
  totalProcessed += processMathFiles(SOURCE_DIR);
  totalProcessed += processPhysicsFiles(SOURCE_DIR);
  totalProcessed += processFurtherMathFiles(SOURCE_DIR);
  
  console.log(`\n=== 迁移完成 ===`);
  console.log(`总共处理文件: ${totalProcessed}`);
  
  // 检查剩余文件
  console.log('\n检查未处理的文件...');
  checkRemainingFiles(SOURCE_DIR);
}

// 检查剩余文件
function checkRemainingFiles(sourceDir) {
  function countFiles(dir) {
    let count = 0;
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        count += countFiles(filePath);
      } else if (file.endsWith('.pdf')) {
        count++;
      }
    }
    return count;
  }
  
  const remainingCount = countFiles(sourceDir);
  console.log(`剩余未处理文件: ${remainingCount}`);
  
  if (remainingCount > 0) {
    console.log('\n剩余文件可能包括:');
    console.log('- 不支持的文件类型 (er, gt, ir 等)');
    console.log('- 不支持的paper编号');
    console.log('- 文件名格式不匹配的文件');
  }
}

// 运行迁移
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateAllFiles();
}

export { migrateAllFiles };