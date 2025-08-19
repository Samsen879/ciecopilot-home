import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sourceDir = path.join(__dirname, '..', 'data待整理');
const targetDir = path.join(__dirname, '..', 'data');

// 测试模式：只显示将要执行的操作，不实际移动文件
const DRY_RUN = false;

// 确保目录存在
function ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
        if (DRY_RUN) {
            console.log(`[DRY RUN] 将创建目录: ${path.relative(process.cwd(), dirPath)}`);
        } else {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`创建目录: ${path.relative(process.cwd(), dirPath)}`);
        }
    }
}

// 模拟移动文件函数
function moveFile(sourcePath, targetPath) {
    try {
        ensureDirectoryExists(path.dirname(targetPath));
        
        if (DRY_RUN) {
            console.log(`[DRY RUN] 将移动: ${path.basename(sourcePath)} -> ${path.relative(process.cwd(), targetPath)}`);
            return true;
        } else {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`移动文件: ${path.basename(sourcePath)} -> ${path.relative(process.cwd(), targetPath)}`);
            return true;
        }
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

// 分析单个目录的文件
function analyzeDirectory(dirPath, subject) {
    if (!fs.existsSync(dirPath)) {
        console.log(`目录不存在: ${dirPath}`);
        return;
    }
    
    console.log(`\n=== 分析 ${subject} ===`);
    console.log(`目录: ${path.relative(process.cwd(), dirPath)}`);
    
    const items = fs.readdirSync(dirPath);
    const subdirs = items.filter(item => {
        const itemPath = path.join(dirPath, item);
        return fs.statSync(itemPath).isDirectory();
    });
    
    console.log(`找到子目录: ${subdirs.join(', ')}`);
    
    // 只分析第一个子目录作为示例
    if (subdirs.length > 0) {
        const firstSubdir = path.join(dirPath, subdirs[0]);
        console.log(`\n分析示例子目录: ${subdirs[0]}`);
        
        function analyzeSubdir(subDirPath, depth = 0) {
            if (depth > 2) return; // 限制递归深度
            
            const subItems = fs.readdirSync(subDirPath);
            const files = subItems.filter(item => {
                const itemPath = path.join(subDirPath, item);
                return fs.statSync(itemPath).isFile() && item.toLowerCase().endsWith('.pdf');
            });
            
            const subDirs = subItems.filter(item => {
                const itemPath = path.join(subDirPath, item);
                return fs.statSync(itemPath).isDirectory();
            });
            
            const indent = '  '.repeat(depth);
            console.log(`${indent}${path.relative(dirPath, subDirPath)}/`);
            
            if (files.length > 0) {
                console.log(`${indent}  PDF文件 (${files.length}个):`);
                // 只显示前5个文件作为示例
                files.slice(0, 5).forEach(file => {
                    const paperNum = getPaperNumber(file);
                    const fileType = file.includes('_qp_') ? 'QP' : 
                                   file.includes('_ms_') ? 'MS' : 
                                   file.includes('_gt') ? 'GT' : '未知';
                    console.log(`${indent}    ${file} [Paper${paperNum || '?'}, ${fileType}]`);
                });
                if (files.length > 5) {
                    console.log(`${indent}    ... 还有 ${files.length - 5} 个文件`);
                }
            }
            
            // 递归分析子目录（只分析第一个）
            if (subDirs.length > 0 && depth < 2) {
                analyzeSubdir(path.join(subDirPath, subDirs[0]), depth + 1);
            }
        }
        
        analyzeSubdir(firstSubdir);
    }
}

// 测试处理单个目录的几个文件
function testProcess(dirPath, subject, maxFiles = 3) {
    console.log(`\n=== 处理 ${subject} ===`);
    
    if (!fs.existsSync(dirPath)) {
        console.log(`目录不存在: ${dirPath}`);
        return 0;
    }
    
    let processedCount = 0;
    
    function processRecursively(currentDir, depth = 0) {
        if (depth > 3 || processedCount >= maxFiles) return;
        
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            if (processedCount >= maxFiles) break;
            
            const itemPath = path.join(currentDir, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isFile() && item.toLowerCase().endsWith('.pdf')) {
                console.log(`\n处理文件: ${item}`);
                
                const paperNum = getPaperNumber(item);
                const filename = item.toLowerCase();
                
                if (!paperNum) {
                    console.log(`  ❌ 无法识别paper编号`);
                    continue;
                }
                
                let targetPath;
                if (subject === '数学9709') {
                    const validPapers = [1, 3, 4, 5];
                    if (!validPapers.includes(paperNum)) {
                        console.log(`  ⚠️  跳过paper${paperNum} (不在目标结构中)`);
                        continue;
                    }
                    
                    if (filename.includes('_qp_')) {
                        targetPath = path.join(targetDir, 'past-papers', '9709Mathematics', `paper${paperNum}`, item);
                    } else if (filename.includes('_ms_')) {
                        targetPath = path.join(targetDir, 'mark-schemes', '9709Mathematics', `paper${paperNum}`, item);
                    }
                } else if (subject === '物理9702') {
                    let level = [1, 2, 3].includes(paperNum) ? 'A2-LEVEL' : 'AS-LEVEL';
                    
                    if (filename.includes('qp')) {
                        targetPath = path.join(targetDir, 'past-papers', '9702Physics', level, `paper${paperNum}`, item);
                    } else if (filename.includes('ms')) {
                        targetPath = path.join(targetDir, 'mark-schemes', '9702Physics', level, `paper${paperNum}`, item);
                    }
                } else if (subject === '进阶数学9231') {
                    if (![1, 2, 3, 4].includes(paperNum)) {
                        console.log(`  ⚠️  跳过paper${paperNum} (不在目标结构中)`);
                        continue;
                    }
                    
                    if (filename.includes('_qp_')) {
                        targetPath = path.join(targetDir, 'past-papers', '9231Further-Mathematics', `paper${paperNum}`, item);
                    } else if (filename.includes('_ms_')) {
                        targetPath = path.join(targetDir, 'mark-schemes', '9231Further-Mathematics', `paper${paperNum}`, item);
                    }
                }
                
                if (targetPath) {
                    console.log(`  ✅ Paper${paperNum} -> ${path.relative(process.cwd(), targetPath)}`);
                    moveFile(itemPath, targetPath);
                    processedCount++;
                } else {
                    console.log(`  ❌ 无法确定目标路径`);
                }
                
            } else if (stat.isDirectory()) {
                processRecursively(itemPath, depth + 1);
            }
        }
    }
    
    processRecursively(dirPath);
    return processedCount;
}

// 主函数
function main() {
    console.log('=== CIE真题文件整理分析和测试 ===\n');
    console.log(`模式: ${DRY_RUN ? 'DRY RUN (仅显示操作，不实际移动文件)' : '实际执行'}`);
    console.log(`源目录: ${sourceDir}`);
    console.log(`目标目录: ${targetDir}`);
    
    // 检查源目录是否存在
    if (!fs.existsSync(sourceDir)) {
        console.log(`❌ 源目录不存在: ${sourceDir}`);
        return;
    }
    console.log(`✅ 源目录存在`);
    
    // 分析目录结构
    const subjects = [
        { path: path.join(sourceDir, '数学9709'), name: '数学9709' },
        { path: path.join(sourceDir, '物理9702'), name: '物理9702' },
        { path: path.join(sourceDir, '进阶数学9231'), name: '进阶数学9231' }
    ];
    
    subjects.forEach(subject => {
        analyzeDirectory(subject.path, subject.name);
    });
    
    console.log('\n=== 完整文件迁移 ===');
    let totalProcessed = 0;
    subjects.forEach(subject => {
        totalProcessed += testProcess(subject.path, subject.name, 9999);
    });
    
    console.log(`\n=== 总结 ===`);
    console.log(`成功处理了 ${totalProcessed} 个文件`);
    if (DRY_RUN) {
        console.log(`\n要执行实际移动，请修改脚本中的 DRY_RUN = false，然后重新运行`);
    }
}

// 运行脚本
import { pathToFileURL } from 'url';
const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
    main();
}