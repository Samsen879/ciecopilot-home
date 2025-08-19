import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = path.join(__dirname, '..', 'data待整理');
const targetDir = path.join(__dirname, '..', 'data');

// 确保目录存在
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`创建目录: ${dirPath}`);
    }
}

// 移动文件函数
function moveFile(sourcePath, targetPath) {
    try {
        ensureDirectoryExists(path.dirname(targetPath));
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`移动文件: ${path.basename(sourcePath)} -> ${path.relative(process.cwd(), targetPath)}`);
        return true;
    } catch (error) {
        console.error(`移动文件失败: ${sourcePath} -> ${targetPath}`, error.message);
        return false;
    }
}

// 解析paper编号
function getPaperNumber(filename) {
    // 匹配各种paper编号格式
    const matches = filename.match(/[_p](\d)(\d)/);
    if (matches) {
        return parseInt(matches[1]); // 返回paper编号 (1,2,3,4,5,6)
    }
    return null;
}

// 处理数学9709文件
function processMath9709(files, sourceSubDir) {
    let movedCount = 0;
    
    files.forEach(file => {
        const filename = file.toLowerCase();
        
        // 跳过非PDF文件
        if (!filename.endsWith('.pdf')) return;
        
        const paperNum = getPaperNumber(filename);
        if (!paperNum) {
            console.log(`无法识别paper编号: ${file}`);
            return;
        }
        
        // 根据现有目录结构，只处理paper1,3,4,5
        const validPapers = [1, 3, 4, 5];
        if (!validPapers.includes(paperNum)) {
            console.log(`跳过paper${paperNum} (不在目标结构中): ${file}`);
            return;
        }
        
        const sourcePath = path.join(sourceSubDir, file);
        
        // 确定是真题还是答案
        let targetSubDir;
        if (filename.includes('_qp_') || filename.includes('qp-')) {
            targetSubDir = path.join(targetDir, 'past-papers', '9709Mathematics', `paper${paperNum}`);
        } else if (filename.includes('_ms_') || filename.includes('ms-')) {
            targetSubDir = path.join(targetDir, 'mark-schemes', '9709Mathematics', `paper${paperNum}`);
        } else if (filename.includes('_gt')) {
            // 分数线文件放在syllabus目录
            targetSubDir = path.join(targetDir, 'syllabus');
        } else {
            console.log(`无法识别文件类型: ${file}`);
            return;
        }
        
        const targetPath = path.join(targetSubDir, file);
        
        // 检查文件是否已存在
        if (fs.existsSync(targetPath)) {
            console.log(`文件已存在，跳过: ${file}`);
            return;
        }
        
        if (moveFile(sourcePath, targetPath)) {
            movedCount++;
        }
    });
    
    return movedCount;
}

// 处理物理9702文件
function processPhysics9702(files, sourceSubDir) {
    let movedCount = 0;
    
    files.forEach(file => {
        const filename = file.toLowerCase();
        
        // 跳过非PDF文件
        if (!filename.endsWith('.pdf')) return;
        
        const paperNum = getPaperNumber(filename);
        if (!paperNum) {
            console.log(`无法识别paper编号: ${file}`);
            return;
        }
        
        const sourcePath = path.join(sourceSubDir, file);
        
        // 确定AS或A2级别
        let level, targetSubDir;
        if ([1, 2, 3].includes(paperNum)) {
            level = 'A2-LEVEL';
        } else if ([4, 5].includes(paperNum)) {
            level = 'AS-LEVEL'; 
        } else {
            console.log(`跳过paper${paperNum} (不在目标结构中): ${file}`);
            return;
        }
        
        // 确定是真题还是答案
        if (filename.includes('qp') || filename.includes('_qp_')) {
            targetSubDir = path.join(targetDir, 'past-papers', '9702Physics', level, `paper${paperNum}`);
        } else if (filename.includes('ms') || filename.includes('_ms_')) {
            targetSubDir = path.join(targetDir, 'mark-schemes', '9702Physics', level, `paper${paperNum}`);
        } else if (filename.includes('gt') || filename.includes('_gt')) {
            targetSubDir = path.join(targetDir, 'syllabus');
        } else {
            console.log(`无法识别文件类型: ${file}`);
            return;
        }
        
        const targetPath = path.join(targetSubDir, file);
        
        // 检查文件是否已存在
        if (fs.existsSync(targetPath)) {
            console.log(`文件已存在，跳过: ${file}`);
            return;
        }
        
        if (moveFile(sourcePath, targetPath)) {
            movedCount++;
        }
    });
    
    return movedCount;
}

// 处理进阶数学9231文件
function processFurtherMath9231(files, sourceSubDir) {
    let movedCount = 0;
    
    files.forEach(file => {
        const filename = file.toLowerCase();
        
        // 跳过非PDF文件
        if (!filename.endsWith('.pdf')) return;
        
        const paperNum = getPaperNumber(filename);
        if (!paperNum || ![1, 2, 3, 4].includes(paperNum)) {
            console.log(`无法识别或无效paper编号: ${file}`);
            return;
        }
        
        const sourcePath = path.join(sourceSubDir, file);
        
        // 确定是真题还是答案
        let targetSubDir;
        if (filename.includes('_qp_')) {
            targetSubDir = path.join(targetDir, 'past-papers', '9231Further-Mathematics', `paper${paperNum}`);
        } else if (filename.includes('_ms_')) {
            targetSubDir = path.join(targetDir, 'mark-schemes', '9231Further-Mathematics', `paper${paperNum}`);
        } else if (filename.includes('_gt')) {
            targetSubDir = path.join(targetDir, 'syllabus');
        } else {
            console.log(`无法识别文件类型: ${file}`);
            return;
        }
        
        const targetPath = path.join(targetSubDir, file);
        
        // 检查文件是否已存在
        if (fs.existsSync(targetPath)) {
            console.log(`文件已存在，跳过: ${file}`);
            return;
        }
        
        if (moveFile(sourcePath, targetPath)) {
            movedCount++;
        }
    });
    
    return movedCount;
}

// 递归处理目录
function processDirectory(dirPath, processor, subject) {
    let totalMoved = 0;
    
    function processRecursively(currentDir) {
        if (!fs.existsSync(currentDir)) {
            console.log(`目录不存在: ${currentDir}`);
            return;
        }
        
        const items = fs.readdirSync(currentDir);
        const files = [];
        const subdirs = [];
        
        items.forEach(item => {
            const itemPath = path.join(currentDir, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isFile()) {
                files.push(item);
            } else if (stat.isDirectory()) {
                subdirs.push(itemPath);
            }
        });
        
        // 处理当前目录的文件
        if (files.length > 0) {
            console.log(`\n处理目录: ${path.relative(process.cwd(), currentDir)}`);
            console.log(`找到 ${files.length} 个文件`);
            const moved = processor(files, currentDir);
            totalMoved += moved;
            console.log(`移动了 ${moved} 个文件`);
        }
        
        // 递归处理子目录
        subdirs.forEach(subdir => {
            processRecursively(subdir);
        });
    }
    
    console.log(`\n开始处理 ${subject}...`);
    processRecursively(dirPath);
    console.log(`${subject} 总共移动了 ${totalMoved} 个文件`);
    
    return totalMoved;
}

// 主函数
function main() {
    console.log('开始整理CIE真题文件...\n');
    console.log(`源目录: ${sourceDir}`);
    console.log(`目标目录: ${targetDir}\n`);
    
    let totalMoved = 0;
    
    // 处理数学9709
    const math9709Path = path.join(sourceDir, '数学9709');
    totalMoved += processDirectory(math9709Path, processMath9709, '数学9709');
    
    // 处理物理9702
    const physics9702Path = path.join(sourceDir, '物理9702');
    totalMoved += processDirectory(physics9702Path, processPhysics9702, '物理9702');
    
    // 处理进阶数学9231
    const furtherMath9231Path = path.join(sourceDir, '进阶数学9231');
    totalMoved += processDirectory(furtherMath9231Path, processFurtherMath9231, '进阶数学9231');
    
    console.log(`\n整理完成！总共移动了 ${totalMoved} 个文件。`);
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}