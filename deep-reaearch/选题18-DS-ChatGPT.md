# 选题18-DS-ChatGPT

- 原始报告标题：项目背景与问题概述
- 来源：OpenAI ChatGPT Deep Research
- 提取日期：2026-03-09T06:08:49.414Z

项目背景与问题概述

CIE-Copilot 面向 A-Level 科目，以 流式 SSE 推送 AI 回答。由于数学回答中 30–50% 的字符是 LaTeX 公式，模型每次输出一个新 token，往往进入不完整的公式状态（如 \frac{, $x^2 等）。使用 KaTeX 同步渲染，遇到非闭合的 LaTeX 会抛异常或渲染错误，导致前端每个 token 都尝试渲染失败、DOM 重置，从而产生大量不可预期的布局移动（CLS）
1
2
。Core Web Vitals 标准下，CLS 总分应 ≤0.1
2
；而流式错误渲染会导致 CLS 大幅飙升，用户体验极差。为定量分析，可采样典型 A-Level 回答，记录无效渲染触发次数及每次布局偏移；由于暂无公开数据，只能推断：每遇不完整公式都可能发生一次布局 shift，可累计产生远超阈值的 CLS。需要设计策略：仅在公式闭合时渲染，并在此期间展示合适占位符。

缓冲渲染策略对比
策略	实现复杂度	渲染准确度	极端情况（长公式未闭合）	备注
分界符栈追踪	中等：需维护 $,$$,\[、\begin 等入栈出栈规则，处理嵌套	高：精确跟踪开始/结束符，只有栈空时触发渲染	当公式极长且未闭合时会一直缓冲；可加超时保护	Streamdown 插件即用此思路：检测到未闭合块公式时，临时插入闭合符号渲染
1

正则完整性检测	中高：需要编写全面的正则匹配（闭合符号、环境）	较高：可检测大多数简单模式，但对嵌套或特殊语法敏感性差	复杂嵌套或新语法可能漏判；反复匹配成本较高	可借助状态机或 DFA 将正则编译为自动机，对每个新 token 迭代检查，有前端/后端示例实现。
超时触发渲染	简单：记录自上次闭合的时间，200ms 未闭合就渲染已有内容	较低：可能输出不完整公式（导致 KaTeX 报错或显示源码）	长时间未闭合时按时渲染，导致公式部分渲染错误；但避免无限等待	可作为兜底，当长公式卡住时强制渲染，虽会触发 KaTeX 错误，但能继续流式输出。
KaTeX 增量渲染	不支持：KaTeX 本身无增量流式 API	－	－	KaTeX 需完整表达式才能生成正确输出，不支持部分树渲染，只能一次性渲染完整公式。

比较与讨论：分界符栈方法能准确处理大部分内外嵌套情况，但需实现类似状态机的解析器，相对复杂；正则检测则更为灵活，但难保证对所有 LaTeX 语法无漏判。超时触发是简单粗暴的补偿手段，但可能让 KaTeX 渲染出错误代码或红色源码（throwOnError:false 时 KaTeX 会将非法输入以红色源码形式显示
3
）。在极端情况下（超长多嵌套公式），分界符栈可无限期缓冲；如果加上超时兜底（如 500ms 后强制渲染），可保证不堵死流输出，但会偶尔产生错误渲染。Streamdown 等流式 Markdown 库采用**“未终止块解析”策略：一旦发现块级公式（以 $$ 开始）未闭合，即临时补上 $$ 后渲染
1
；这是一种混合策略的思路。综合考虑，推荐混合算法**：主要用栈跟踪判断是否完整，只有栈清零时才渲染；对超时部分使用占位符（参下）并等待下文。

<details><summary>示例 TypeScript 伪代码：缓冲策略</summary>
ts
复制
let buffer = "";
let stack: string[] = [];
const STACK_PAIRS: Record<string, string> = { "$$": "$$", "$": "$", "\\[": "\\]", "\\(": "\\)", "\\begin": "\\end" };

function processToken(token: string) {
  buffer += token;
  // 检查分界符：检测 token 是否启动或结束一个数学模式
  if (token === "$" || token === "$$" || token === "\\[" || token === "\\]" ||
      token === "\\(" || token === "\\)" || token === "\\begin" || token === "\\end") {
    if (token in STACK_PAIRS) {
      // 是开始符号：入栈相应闭合符号
      stack.push(STACK_PAIRS[token]);
    } else {
      // 是结束符号：如果和栈顶匹配则出栈
      if (stack[stack.length-1] === token) { stack.pop(); }
    }
  }
  // 检查栈是否清空
  if (stack.length === 0) {
    // 发现完整公式，触发 KaTeX 渲染
    renderKaTeX(buffer);
    buffer = "";
  } else {
    // 否则继续缓冲
    showPlaceholder();
  }
}
// 超时处理（例如 200ms 无闭合时）
setInterval(() => {
  if (stack.length > 0 && timeSinceLastFlush > 200) {
    // 强制渲染现有内容，尽管可能不完整
    renderKaTeX(buffer, /* allowError: true */);
    buffer = "";
    stack = [];
  }
}, 200);

</details>
占位符 UX 设计与认知负荷分析

占位符应能降低认知负荷，避免用户在等待公式时困惑。研究表明：**骨架屏（Skeleton）**通过显示灰色占位块反映最终内容结构，可有效减少认知负荷
4
。例如下图所示，类似骨架屏的线条提示用户即将出现文本块或公式结构，可帮助建立页面结构认知
4
。相比之下，单纯的闪烁光标或“正在计算”文字提供的信息极少，仅表明系统仍在工作（正如 Fatima Sumair 所言：“小小的闪烁光标看似无物，却意味着整个过程”（“It looks like nothing. It means everything.”）
5
）。但它并不传递内容预期。研究还建议使用更具意义的加载状态提示（比如“分析中”、“生成解答”等阶段提示），以降低焦虑
6
。综合来看，推荐骨架屏方案：在缓冲期间显示与即将出现公式形状相似的灰色占位符（比如多行灰色矩形条），这样用户能预期版面结构、不会被布局闪烁干扰
4
6
。必要时可加上细微动画以示加载进行中，但应避免强烈闪烁造成分心。

图：骨架屏占位示例（LinkedIn 应用）。骨架屏通过灰色占位块展示内容结构，有助于降低用户等待时的认知负荷
4
。

KaTeX 错误边界设计

即使做了缓冲，有时 LLM 输出的 LaTeX 语法仍可能非法（缺少符号或使用 KaTeX 不支持的命令）。需设计优雅降级策略：

抛出异常 vs 渲染红字：KaTeX 默认（throwOnError:true）遇错会抛 ParseError，造成 React 组件崩溃；设置 throwOnError:false 则会把错误输入以红色源码形式显示
3
。为了用户体验，建议使用 throwOnError:false，这样能直接将原始 LaTeX 文本（单空格或多行）以可读格式显示，并在 hover 时显示错误提示。
降级展示：遇到无法渲染的公式，可有以下选项：1) 以等宽字体原样显示 LaTeX 源（辅助用户阅读和检查）；2) 显示一个错误图标并在旁注明“渲染错误”；3) 提示用户“尝试重试”或让前端记录并在后台重询 LLM。一般而言，显示可复制的原始源码（选项1）对学习最友好，因为这至少保留了内容信息；而纯图标无可读信息且易让用户困惑。
React Error Boundary：KaTeX 渲染组件应包裹在 React 错误边界组件中，以捕获渲染过程中未预料的异常
7
。例如定义一个 ErrorBoundary，在 getDerivedStateFromError 中切换到备用渲染模式（如显示原始 LaTeX）。React 文档说明：Error Boundary 会捕获子组件树中的渲染错误并显示后备 UI
7
。在本场景中，可在边界的 fallback 中渲染纯文本 LaTeX（红色或普通）或一个提示信息。

综上，实现 KaTeX 渲染时应：设置 throwOnError:false，并为每个公式组件添加 ErrorBoundary。如果出现不可解析 LaTeX，ErrorBoundary 可以将公式以特殊样式（等宽字体、红色）展示原文，或附加一个感叹号图标提示出错。

性能基准测试方案

为评估各策略效果，需要在受控环境下测量 CLS 和首屏显现时间（FMP 或 LCP）。方案如下：

测试页面搭建：构造多个测试场景，包含不同公式密度（例如低密度 10%、高密度 50%）的典型数学回答。使用 Next.js 构建页面，内嵌 KaTeX 渲染逻辑，并实现上述缓冲策略版本（栈追踪、正则、超时、混合等）。
模拟网络环境：利用 Chrome DevTools 或 Puppeteer，将网络延迟设为 100ms RTT 和 500ms RTT 两种典型值（或其他 Throttling 设置），模拟不同带宽/延迟情况。
指标采集：使用 Lighthouse 或 WebPageTest 获取页面加载时的 Core Web Vitals 指标，重点关注 CLS 和 FMP/LCP。CLS 可通过浏览器的 Layout Instability API 获取（测量所有布局偏移合计
2
）；FMP/LCP 可看首个渲染可见内容时间。
对比分析：记录各策略下的 CLS 值和页面有意义内容的首次渲染时间。在网络慢时观察策略延迟对用户看到内容的影响（是否出现“长白屏”或频繁跳动）。多次运行取平均值以消除偶然波动。
用户感知测试（可选）：可邀请用户执行可用性测试，感知不同策略和占位符设计的体验，侧重主观等待体验和干扰度。

基准测试应指出：良好策略应在网络慢（500ms RTT）时仍能保证合理的首屏渲染（FMP/LCP），并将 CLS 控制在可接受范围（尽量 <0.1）
2
。

开源参考案例
Streamdown / vue-stream-markdown：这些流式 Markdown 渲染库内置对流式 LaTeX 的支持。Streamdown 的 @streamdown/math 插件使用 remark-math + rehype-katex 实现，可在检测到未闭合公式时自动补全闭合标记进行渲染
1
；其文档指出 “Streaming LaTeX rendering – Progressive math equation rendering with KaTeX support”
1
。类似地，vue-stream-markdown 也声称支持“Streaming LaTeX rendering”，但更多是采用快速渲染手段。
Notion AI：Notion 官方文档明确指出其数学渲染基于 KaTeX
8
。虽然 Notion AI 的实现细节未公开，但我们可推测其生成的公式最终也是交给 KaTeX 渲染。Notion 对公式采用占位块方式编辑（同样可视为块级公式缓冲）。
Claude.ai：目前公开资料较少。Claude Code VS Code 扩展的 Issue 提到：Claude 在 chat 中生成的 LaTeX 公式在扩展中未被渲染，而其 Web 版界面支持 LaTeX 渲染
9
。这表明 Claude AI 的 Web UI 自带数学渲染机制，但其实现未开源。根据该 Issue，
9
指出需要在客户端引入 KaTeX 以渲染流式 Markdown 中的数学表达式。
ChatGPT Web：截至目前 OpenAI 未公开其流式渲染细节。一些用户社区讨论表明 ChatGPT 在 Web 端可以生成 MathJax/MathML，但此处没有官方实现参考。ChatGPT UI 通常直接使用客户端渲染库显示 $...$ 公式（可能是内部集成的 MathJax/KaTeX）。尚无公开文档，但流式渲染问题正是多个开发者关注的主题。
结论与推荐方案

综合以上分析，推荐混合缓冲方案：使用分界符栈跟踪判断公式完整性，只有完成闭合才进行 KaTeX 渲染；在缓冲期间使用骨架屏占位（反映公式结构）以降低认知负荷
4
。若遇到长时间未闭合的公式，则利用超时机制强制渲染剩余内容，但 KaTeX 配置 throwOnError:false 以优雅降级显示
3
。所有 KaTeX 渲染组件应被 React ErrorBoundary 包裹（捕获未预料错误并回退到显示源码模式）
7
。这样能最大程度减少 CLS，保证首屏稳定性，同时兼顾用户对数学内容的可读性和学习连贯性。

参考资料：KaTeX 文档及示例
3
；Streamdown 插件文档
1
；Web Vitals CLS 指标
2
；Nielsen 等用户体验研究
4
6
；React 错误边界指南
7
；Notion 与 Claude 开发者社区资料
9
8
。
