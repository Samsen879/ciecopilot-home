const fs = require('fs');
const path = require('path');

// 配置路径
const SOURCE_DIR = 'C:\\Users\\Samsen\\cie-copilot\\data待整理';
const TARGET_DIR = 'C:\\Users\\Samsen\\cie-copilot\\data\\past-papers';
const MARK_SCHEMES_DIR = 'C:\\Users\\Samsen\\cie-copilot\\data\\mark-schemes';

// 科目映射
const SUBJECT_MAPPING = {
  '数学9709': '9709Mathematics',
  '物理9702': '9702Physics',
  '进阶数学9231': '9231Further-Mathematics'
};

// 确保目录存在
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`创建目录: ${dirPath}`);
  }
}

// 解析文件名获取paper类型
function getPaperType(filename) {
  const match = filename.match(/_qp_(\d+)/); // 匹配question paper
  if (match) {
    const paperNum = match[1];
    if (paperNum.startsWith('1')) return 'paper1';
    if (paperNum.startsWith('2')) return 'paper2';
    if (paperNum.startsWith('3')) return 'paper3';
    if (paperNum.startsWith('4')) return 'paper4';
    if (paperNum.startsWith('5')) return 'paper5';
    if (paperNum.startsWith('6')) return 'paper6';
  }
  return null;
}

// 检查是否为mark scheme文件
function isMarkScheme(filename) {
  return filename.includes('_ms_') || filename.includes('_gt.');
}

// 处理单个文件
function processFile(sourceFilePath, targetSubjectDir, markSchemeSubjectDir) {
  const filename = path.basename(sourceFilePath);
  
  if (isMarkScheme(filename)) {
    // 处理mark scheme文件
    const targetPath = path.join(markSchemeSubjectDir, filename);
    if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourceFilePath, targetPath);
        fs.unlinkSync(sourceFilePath);
        console.log(`移动mark scheme: ${filename} -> ${markSchemeSubjectDir}`);
      } else {
        fs.unlinkSync(sourceFilePath);
        console.log(`删除重复的mark scheme: ${filename}`);
      }
  } else {
    // 处理question paper文件
    const paperType = getPaperType(filename);
    if (paperType) {
      const paperDir = path.join(targetSubjectDir, paperType);
      ensureDirectoryExists(paperDir);
      
      const targetPath = path.join(paperDir, filename);
      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourceFilePath, targetPath);
        fs.unlinkSync(sourceFilePath);
        console.log(`移动试卷: ${filename} -> ${paperDir}`);
      } else {
        fs.unlinkSync(sourceFilePath);
        console.log(`删除重复的试卷: ${filename}`);
      }
    } else {
      console.log(`无法识别paper类型: ${filename}`);
    }
  }
}

// 处理目录中的所有文件
function processDirectory(dirPath, targetSubjectDir, markSchemeSubjectDir) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      // 递归处理子目录
      processDirectory(itemPath, targetSubjectDir, markSchemeSubjectDir);
    } else if (stat.isFile() && item.endsWith('.pdf')) {
      // 处理PDF文件
      processFile(itemPath, targetSubjectDir, markSchemeSubjectDir);
    }
  }
}

// 主函数
function organizeAllPapers() {
  console.log('开始整理CIE A-Level真题文件...');
  
  // 检查源目录是否存在
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`源目录不存在: ${SOURCE_DIR}`);
    return;
  }
  
  // 确保目标目录存在
  ensureDirectoryExists(TARGET_DIR);
  ensureDirectoryExists(MARK_SCHEMES_DIR);
  
  // 处理每个科目
  const subjects = fs.readdirSync(SOURCE_DIR);
  
  for (const subject of subjects) {
    const subjectPath = path.join(SOURCE_DIR, subject);
    const stat = fs.statSync(subjectPath);
    
    if (stat.isDirectory() && SUBJECT_MAPPING[subject]) {
      console.log(`\n处理科目: ${subject}`);
      
      const targetSubjectName = SUBJECT_MAPPING[subject];
      const targetSubjectDir = path.join(TARGET_DIR, targetSubjectName);
      const markSchemeSubjectDir = path.join(MARK_SCHEMES_DIR, targetSubjectName);
      
      // 确保科目目录存在
      ensureDirectoryExists(targetSubjectDir);
      ensureDirectoryExists(markSchemeSubjectDir);
      
      // 处理该科目的所有文件
      processDirectory(subjectPath, targetSubjectDir, markSchemeSubjectDir);
      
      console.log(`完成处理科目: ${subject}`);
    }
  }
  
  console.log('\n所有文件整理完成!');
}

// 运行脚本
if (require.main === module) {
  organizeAllPapers();
}

module.exports = { organizeAllPapers };