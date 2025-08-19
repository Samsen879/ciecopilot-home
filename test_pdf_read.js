import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPdfRead() {
  try {
    // 测试读取一个具体的PDF文件
    const testFile = path.join(__dirname, 'data', 'past-papers', '9702Physics', 'paper1', '9702_m17_qp_12.pdf');
    console.log('测试文件路径:', testFile);
    console.log('文件是否存在:', fs.existsSync(testFile));
    
    if (!fs.existsSync(testFile)) {
      console.log('文件不存在，退出测试');
      return;
    }
    
    // 动态导入pdf-parse
    console.log('导入pdf-parse...');
    const pdf = (await import('pdf-parse')).default;
    console.log('pdf-parse导入成功');
    
    // 读取文件
    console.log('读取PDF文件...');
    const data = await pdf(fs.readFileSync(testFile));
    console.log('PDF解析成功');
    console.log('页数:', data.numpages);
    console.log('文本长度:', data.text.length);
    console.log('前100个字符:', data.text.substring(0, 100));
    
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

testPdfRead();