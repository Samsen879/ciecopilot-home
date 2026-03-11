# 选题29-DS

- 原始报告标题：CIE-Copilot 架构演进：从纯数学 (9709) 到物理 (9702) 的多模态 RAG 与智能评估系统深度研究报告
- 来源：Google Gemini Deep Research
- 提取日期：2026-03-09

CIE-Copilot 架构演进：从纯数学 (9709) 到物理 (9702) 的多模态 RAG 与智能评估系统深度研究报告

绪论：CIE 考纲跨学科扩展的系统性挑战

在国际剑桥评估体系（CIE）中，A-Level 数学（9709）与物理（9702）在认知维度、知识表征以及评估标准上存在本质差异。CIE-Copilot 系统在第一阶段成功实现了针对 9709 考纲的检索增强生成（RAG）与智能评分（Smart Mark Engine），其核心依赖于文本、LaTeX 公式的密集向量检索（Dense Retrieval）以及基于 SymPy 等计算机代数系统（CAS）的符号逻辑裁决。

然而，当系统路线图扩展至 9702 物理考纲时，原有的系统架构面临着多模态降维、真实世界情境建模、实验方法论评估以及物理量纲解析等一系列极具挑战性的技术瓶颈。物理学科包含约 250 个学习目标（Learning Outcomes），相比数学的 150 个目标，其复杂度呈指数级上升，且深度融合了理论推导与实验设计。物理题目的解答不仅需要数学计算，更依赖于对电路图、受力分析图、速度-时间图表等高密度视觉信息的空间与逻辑推理。此外，物理评分标准（Rubrics）高度强调研绎推理的语义准确性、单位量纲的严谨性以及实验设计的可行性，这使得传统的精准文本匹配与纯符号计算显得捉襟见肘。

本研究报告将系统性地拆解 CIE-Copilot 向物理学科扩展过程中的核心技术路径，提出针对物理图表的多模态 RAG 索引策略、实验技能（AO3）的知识表征框架、具备单位感知能力的混合检索优化方案、基于语义理解的定性评分架构重构，以及基于 `ltree` 的跨学科知识图谱设计，为下一代 STEM 智能教育基础设施提供深度的架构指导。

1. 物理图表的多模态 RAG 索引与表征策略

在物理学科中，图表不仅是文本的辅助说明，更是物理定律的几何与拓扑映射。传统的 RAG 架构主要通过光学字符识别（OCR）将文档扁平化为文本块（Chunks），这种处理方式会彻底破坏物理图表中的空间依赖关系、拓扑连接以及矢量方向。为实现高精度的物理图表检索，必须将非结构化的像素信息转化为大语言模型（LLM）可理解的高维结构化文本或图形模式。

1.1. 电路图的拓扑结构化与 GraphRAG 索引

电路图（Circuit Diagrams）包含了电阻、电容、电感等元器件的复杂网络拓扑。在电子设计自动化（EDA）领域，SPICE（Simulation Program with Integrated Circuit Emphasis）网表长期以来是电路的标准文本表述。

然而，将未经处理的 SPICE 网表直接注入 RAG 系统的 `knowledge_chunks` 表中存在致命缺陷。首先，SPICE 网表高度抽象，主要通过节点编号（如 `R1 1 2 10k`）来表示连接，剥离了物理空间布局与教学语境，使得大语言模型在进行自然语言推理时极易产生幻觉。研究表明，即使是最先进的 LLM，在直接读取 SPICE 网表时，也经常会错误识别电源极性（如将正负极颠倒）并对网孔电流的方向产生严重幻觉，导致解题失败率高达 35.29%。

为了使 RAG 能够真正“理解”电路，应当采用基于图结构（Graph Structure）的 `CircuitJSON` 格式或自然语言描述矩阵，并结合 GraphRAG 范式进行索引。在 GraphRAG 架构中，电路不再是一段扁平的字符串，而是一个知识图谱：元器件作为节点（Nodes），导线与串并联关系作为边（Edges）。

具体的结构化文本转换方案如下：

节点属性映射（Node Attributes）：提取组件的类型、规范名称、阻值/容值以及极性方向。

拓扑连接描述（Topological Connections）：使用自然语言明确描述串并联关系，例如 “Resistor R1 is in series with Capacitor C1, forming an RC timing circuit”（电阻 R1 与电容 C1 串联，构成 RC 定时电路）。

功能性语义标注（Functional Semantics）：补充电路模块的物理意义，如“分压器（Potential Divider）”“平滑电容（Smoothing Capacitor）”。

在数据库层面，可以将这种 `CircuitJSON` 转化为高度描述性的自然语言 Caption 存储于 `content` 字段，同时将图结构的关键边关系存储于元数据中。当学生提问“解释电容充放电的过程”时，RAG 系统的向量检索（Dense Search）能够捕捉到蕴含“RC 拓扑”与“充放电机制”语义的文本块，从而实现高召回率。

1.2. 受力分析图（FBD）的语义向量转化

受力分析图（Free Body Diagrams, FBDs）是牛顿经典力学的核心分析工具，用于隔离研究对象并可视化其受到的所有外力。FBD 的本质是二维或三维空间中的矢量图，其关键要素包括质心（作用点）、力的大小（Magnitude）以及力的方向（Direction，通常相对于参考坐标系）。

将 FBD 转化为 RAG 可索引的语义向量，需要构建一套标准化的物理场景描述协议（JSON Schema）或结构化文本。由于纯图像特征提取（如 ResNet 或 CLIP 向量）无法捕获“正交分解”或“牛顿第三定律”的物理规则，必须通过人工或编程方式建立特征矩阵：

对象声明（Object Isolation）：明确被隔离的实体，例如“一个质量为 m 的木块处于倾角为 θ 的斜面上”。

坐标系建立（Reference Frame）：定义正交坐标系，例如“平行于斜面向上为 x 轴正方向，垂直于斜面向外为 y 轴正方向”。

力矢量枚举（Force Vector Enumeration）：将所有接触力（Contact Forces，如摩擦力、支持力）与长程力（Long-range Forces，如重力、电场力）参数化。例如描述为：“重力 W = mg 垂直向下；法向支持力 N 沿 y 轴正向；动摩擦力 f_k 沿 x 轴负向”。

在 RAG 的 `knowledge_chunks` 中，上述结构化描述将被转化为文本 Embedding（1536d 向量）。当学生提出“斜面上木块的加速度如何计算”时，检索模型通过余弦相似度匹配，能够精准定位到包含类似坐标系设定与力矢量分解的文本块，从而向大模型提供标准的受力分析范本。

1.3. 数据图表与微积分拓扑的映射机制

在 9702 物理中，数据图表（如速度-时间图、力-伸长量图、放射性衰变曲线）密度极高。RAG 系统不能仅仅将这些图表视为图像，而必须理解其底层的数学与物理关系。

图表的物理意义往往隐藏在其几何特征与微积分（Calculus）属性中。为了让 RAG 理解“速度-时间图的斜率代表加速度”这种关系，必须在索引时强制注入物理规则元数据（Physics-Informed Metadata）：

斜率语义（Gradient）：明确定义 `dv/dt` 的物理含义。在 v-t 图中注入文本：“The gradient of the velocity-time graph represents acceleration (a = dv/dt).”

面积语义（Area under curve）：明确定义 `∫ y dx` 的物理含义。在 v-t 图中注入文本：“The area under the velocity-time graph represents displacement (s = ∫ v dt).”

截距与渐近线（Intercepts & Asymptotes）：解释初始状态（如 `t = 0` 时的初速度）或极限状态（如终端速度 Terminal Velocity）。

这种物理逻辑的显式文本化（Explicit Articulation）确保了当用户查询“如何从 v-t 图求位移”时，基于语义相似度的 Dense 检索能够立刻匹配到包含“积分”与“面积”等关键词的理论解释块，弥合了视觉表象与抽象物理量之间的语义鸿沟。

1.4. 前沿 VLM 处理物理图表的准确率评估与局限性

在实施阶段，项目团队必须评估是否可以直接使用视觉大语言模型（Vision-Language Models, VLM，如 GPT-4o 或 Gemini 1.5 Pro）来替代人工建模，直接读取并理解物理图表。

基于 2024-2025 年的最新权威基准测试（如 PhysUniBench, MathVista, MMMU 等），当前 VLM 在物理空间推理与严格图表解析上依然存在严重缺陷。

评估基准（Benchmark）与结果概览如下：

MMLU：一般科学与常识理解。GPT-4o 准确率 88.7%，Gemini 1.5 Pro 准确率 85.9%，结论是在纯文本理论物理知识上表现优异，具备极强的文本推理能力。

MathVista：视觉数学与基础图表推理。GPT-4o 准确率 63.8%，Gemini 1.5 Pro 准确率 68.1%，结论是在处理带有明确数值标注的统计图表与简单几何图形时具备中等能力。

GPQA Diamond：研究生级物理/化学推理。GPT-4o 准确率 53.6%，Gemini 1.5 Pro 准确率 59.1%，结论是面对高难度、多步骤的专业物理计算时，准确率大幅下降。

PhysUniBench：大学级物理图表综合推理。GPT-4o 准确率 34.2% - 38.2%，Gemini 1.5 Pro 准确率小于 40.0%，结论是在需要精确解析多步物理约束与复杂电路/受力分析时面临断崖式下跌。

能力评估数据分析：如表所示，尽管 GPT-4o 与 Gemini 1.5 Pro 在 MMLU 等通用文本基准上得分接近 90%，但当面对需要严格视觉空间对齐与物理法则约束的任务（如 PhysUniBench）时，即便是最先进的模型，其准确率也难以突破 40%。VLM 在处理物理图表时常犯的错误包括：

空间关系错乱：无法准确定位多个物体之间的相对位置和接触面，导致摩擦力或法向支持力方向判断错误。

符号与连接幻觉：在解析电路图时，容易将交叉但不相连的导线误认为节点，或错误识别二极管/电源的极性方向。

定量距离感知缺失：难以从无比例尺的二维示意图中提取定量的物理距离或角度参数，缺乏参考物对照能力。

系统架构建议：鉴于当前 VLM 的准确率尚不足以支撑严肃的高风险教育评估（High-stakes Assessment），CIE-Copilot 不能完全依赖 VLM 的 Zero-shot 视觉能力来动态解析学生上传的复杂物理图表或构建底层索引。在 Phase 1 阶段，必须采用前文所述的“人工/脚本结构化建模（手工提权）+ 自然语言翻译”的混合策略来构建 RAG 数据库。VLM 可以作为辅助工具参与脱机（Offline）的数据清洗与结构化标注，但需引入严格的人机协同（Human-in-the-loop）验证机制。

2. 实验技能（AO3）的知识表示与 Rubric 结构重塑

CIE 9702 物理考纲与 9709 数学考纲的核心差异之一在于其实践属性。数学的评估几乎全部集中于 AO1（知识与理解）和 AO2（应用与推理），而物理的 Paper 3（Advanced Practical Skills）和 Paper 5（Planning, Analysis and Evaluation）专门评估 AO3（实验技能与调查）。特别是 Paper 5 的“计划题”（Planning Question），要求学生从零开始设计一个完整的物理实验，这在传统基于符号计算的 Smart Mark Engine 中是无法处理的。

2.1. 抛弃 M/A/B 框架：重构 P-M-A-D-S 实验 Rubric 结构

在 9709 数学中，评分框架严格遵循 M（Method，方法分）、A（Accuracy，准确分）和 B（Independent，独立分）的线性逻辑。然而，物理 Paper 5 的规划题采用了完全不同的模块化评分维度，旨在评估科学方法的严谨性。

根据 CIE 的官方评分标准（Mark Scheme），一道满分通常为 15 分的 Planning Question 被严格划分为五个知识与能力板块。CIE-Copilot 的底层数据库必须根据这一 P-M-A-D-S 结构进行知识解耦与元数据重构：

P（Defining the Problem，界定问题，2-3 分）：明确指出独立变量（Independent Variable，需改变的量）、因变量（Dependent Variable，需测量的量）以及控制变量（Constants，需保持不变的量）。

M（Methods of Data Collection，数据收集方法，4-5 分）：要求提供切实可行的实验装置图（Workable Diagram），并详细描述如何改变独立变量、如何精确测量因变量。这部分涉及具体仪器的选择，如使用千分尺（Micrometer）测量直径，或使用示波器（Oscilloscope）测量周期。

A（Method of Analysis，数据分析方法，2-3 分）：考察将非线性物理方程线性化的能力。例如，将指数关系 `y = ae^(kx)` 转化为对数关系 `ln y = kx + ln a`，并明确指出应绘制什么图表（如 `ln y` 对 `x` 的图），以及图表的斜率（Gradient）和截距（y-intercept）代表什么物理量。

D（Additional Detail，附加细节，4-6 分）：考察减少实验误差的具体物理手段。例如，使用重锤线（Plumb line）确保垂直、测量多组数据求平均值、等待系统达到热平衡等。

S（Safety Considerations，安全注意事项，1 分）：针对特定物理实验的风险评估与防范。如处理放射源时使用长柄镊子，处理强电流时避免线圈过热等。

架构变更：原有的数学 M/A/B 框架完全不适用于这种发散性的实验设计评估。数据库的 `knowledge_chunks` 表必须新增 JSON 格式的扩展字段，专门用于存储 AO3 实验题的评分维度。当引擎批改 Paper 5 时，必须调用独立的评判逻辑，分别遍历 P、M、A、D、S 五个子模块进行打分与反馈。

2.2. “实验最佳实践”在知识库中的切分与存储

为了使 RAG 系统能够有效地辅助学生回答此类开放性实验题，数据库不能仅仅存储以往的真题答案，必须抽象并存储“实验最佳实践”（Best Practices）的模块化知识库。

分块（Chunking）与标注策略：长篇的实验指导手册和仪器使用说明需要被切分为符合特定任务语义的细粒度文本块，并附带高度结构化的元数据（Metadata）。

例如，当系统摄入关于“使用霍尔探头（Hall Probe）测量磁场”的文档时，切分后的 chunk 应携带如下元数据：

`concept: "Magnetic Field Measurement"`

`apparatus: "Hall Probe"`

`rubric_category: "M_Data_Collection"`

`common_pitfalls: "Probe not perpendicular to magnetic field lines."`

这种基于元数据的分块策略（Metadata-Enriched Chunking）极大地提升了检索的查准率（Precision）。如果学生提问：“在测量磁场实验中，我该如何保证数据的准确性？”RAG 系统的检索器可以通过提取查询中的实体（Magnetic Field）和意图（Accuracy/Detail），结合混合检索策略，精准定位到带有 `rubric_category: "D_Additional_Detail"` 标签的最佳实践片段（如：重复实验、反转电流方向以消除背景磁场影响），从而生成高度符合 CIE 评分标准的指导意见。

3. 单位与量纲的 RAG 感知体系构建

物理学有别于纯数学的另一个核心支柱是单位系统（Unit System）与量纲分析（Dimensional Analysis）。在 9709 数学中，5 就是数字 5；但在 9702 物理中，5 kg 与 5 N 描述的是完全不同的物理实在。CIE 物理考试极度强调 SI 国际单位制的规范使用，单位错误或量纲不一致会导致直接扣分（通常体现在 final calculation mark 丢失）。

3.1. 物理等价性的检索引擎挑战与 SI 基单位归一化

在物理学中，许多导出单位（Derived Units）与基本单位（Base Units）的代数组合是完全等价的。例如，力的单位牛顿（Newton, N）在物理量纲上严格等于 `kg·m·s^-2`；压强的单位帕斯卡（Pascal, Pa）等价于 `N·m^-2` 或 `kg·m^-1·s^-2`。

传统的密集向量检索（Dense Vector Search）依赖于文本的统计共现与语义相似度。主流的嵌入模型（Embedding Models，如 OpenAI `text-embedding-3`）由于训练语料的偏差，可能无法在隐空间（Latent Space）中将自然语言单词 “Newton” 与代数表达式 “kg·m/s²” 紧密映射到同一个聚类中。这会导致学生搜索“kg·m/s²”时，系统无法召回标题仅包含 “Newton's Laws” 的知识块。

解决方案：构建单位归一化层（Unit Normalization Layer）

在数据摄入（Ingestion）和查询预处理（Query Preprocessing）阶段，必须引入物理单位解析中间件。可以利用 Python 中成熟的物理量处理库，如 `pint` 或 `unyt`。

当文档被切分并写入 `knowledge_chunks` 之前：

NLP 管道扫描文本，识别出所有的物理单位缩写和全称。

通过 `pint` 注册表，将所有的导出单位映射分解为其不可约的 SI 基本量纲组合，即仅包含 `kg, m, s, A, K, mol, cd`。

将归一化后的量纲字符串（如 `dim: M L T^-2` 或 `base_si: kg m s^-2`）作为标签注入该数据块的 Metadata 中。

在检索时，如果用户的 Query 包含任意形式的力学单位，系统同样通过预处理提取量纲，并在向量检索之外附加一层基于 Metadata 的硬性过滤（Filter）或权重增强，从而实现完美的物理等价性匹配。

3.2. 克服 PostgreSQL `tsvector` 符号切分的破坏性

在 CIE-Copilot 当前的 Hybrid Search 架构中，使用了 PostgreSQL 提供的全文检索功能（`tsvector` 和 `tsquery`）来实现关键词匹配。然而，这种通用的搜索引擎设计对科学符号和物理单位具有极强的破坏性。

PostgreSQL 默认的文本解析器（Parser）和词典（Dictionary，如 `english` 词典）基于自然语言分词规则，它会将连字符（Hyphen）和点号（Dot）视为单词边界或标点符号进行剥离，更糟糕的是，它会将连字符后跟数字识别为“带符号整数”（Signed Integer）。

例如，当 PostgreSQL 解析科学单位字符串 `kg.m.s-2` 时，`ts_debug` 的结果显示它会被切离成相互重叠的离散词素（Lexemes）：`kg`、`m`、`s` 以及带符号整数 `-2`。这种切分彻底摧毁了物理量纲的整体性语义。当系统执行 `to_tsquery('kg.m.s-2')` 时，将无法进行精确匹配。

数据库架构变更建议：自定义文本规范化机制

为了保护科学公式和单位在 `tsvector` 中的完整性，必须绕过默认解析器的干扰。由于修改 PostgreSQL 底层 C 代码解析器成本过高，工程上最佳的实践是在应用层或数据库生成列中应用正则表达式和字符串替换（String Replacement）策略。

在构建 `fts` 字段时，使用 `replace` 函数将连接符和数学符号转换为安全的下划线连接形式，同时强制使用不进行词干提取的 `simple` 词典：

```sql
CREATE TABLE knowledge_chunks (
    id SERIAL PRIMARY KEY,
    content TEXT,
    topic_path LTREE,
    embedding VECTOR(1536),
    -- 将点号替换为下划线，连字符替换为 '_minus_'
    fts TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('simple',
            replace(
                replace(content, '-', '_minus_'),
                '.', '_')
        )
    ) STORED
);
```

经过处理后，`kg.m.s-2` 将作为一个不可分割的独立词素（Lexeme）`kg_m_s_minus_2` 建立倒排索引。当处理用户查询时，后端 API 同步应用相同的替换规则生成 `tsquery`，由此即可完美实现物理量纲与复杂化学公式的精确关键词匹配检索。

4. 定性解释题的语义评分架构与机制重构

数学 9709 考卷以定量计算（Quantitative Calculation）与代数推导为主，Smart Mark Engine 可以借助 SymPy 等符号计算工具将学生的答案与标准答案进行代数等价性判别（Algebraic Equivalence Testing，例如判定 `0.5x` 等于 `x/2`）。

然而，物理 9702 试卷中充斥着大量的定性解释题（Qualitative Reasoning）。例如：“解释为何金属导体的电阻随温度升高而增加”或“从微观机制解释驻波的形成”。这种题型没有固定的符号表达式，而是依赖特定的物理名词（Keywords）和逻辑链条（Logic Flow）。由于 SymPy 无法处理自然语言语义，现有的评分架构面临彻底失效的风险。

4.1. RAG 检索策略：定量与定性任务的差异

在定性题目的 RAG 检索中，系统需要提取的不是“公式”，而是“因果解释”与“机制描述”。

定量计算题检索：高度依赖确切的变量定义、公式定理（如查找 `F = ma` 或 `ΔQ = mcΔT`）和数值常量。此时混合检索中 Keyword 的权重（Alpha 值）应调高。

定性解释题检索：更依赖对物理过程的语义描述（如查找“晶格离子振动”“电子碰撞频率”）。此时 Dense Vector（语义向量）的权重应当提高，同时引入跨文档的文档逻辑重组技术（如生成式伪知识图谱）以保证检索上下文的完整因果链。

4.2. Smart Mark Engine 的语义评估架构变更

为了解决定性题的自动评分难题，Smart Mark Engine 必须从单一的“符号计算引擎”演进为“神经-符号混合推理架构”（Neuro-symbolic Architecture），其中神经网络部分（LLM）负责语义理解，符号部分负责规则约束与分数累加。

然而，如果简单地将学生的文本丢给 LLM 并提示“请根据评分标准给这道题打分”，由于大模型具有生成概率随机性、易受提示词影响以及存在评估偏差，其内部一致性（Intra-LLM consistency）和评分严谨性往往不尽如人意。LLM 常倾向于给出整体性评价，忽略 CIE 严苛的“踩点给分”原则（List Rule：如果给出了相互矛盾的陈述，即便包含正确术语也不得分）。

解决方案：基于支架式思维链（Scaffolded Chain-of-Thought）的 LLM-as-a-judge 范式

系统架构应当引入一种分解-映射的评估范式：

解构标准答案（Rubric Deconstruction）：将官方 Mark Scheme 中的每个 B 标记（独立给分点）或 M 标记（方法点）提取为一条独立的原子级陈述。例如，解释电阻增加的题目（3 分）：

Point 1: “Temperature increase causes greater amplitude of vibration of lattice ions.”（温度升高导致晶格离子振动幅度增大）

Point 2: “Increased frequency of collisions between free electrons and ions.”（自由电子与离子的碰撞频率增加）

Point 3: “Rate of flow of charge decreases / drift velocity decreases.”（电荷流动率下降 / 漂移速度减小）

原子级事实比对（Atomic Fact-Checking）：并非让 LLM 一次性打总分，而是利用 Scaffolded CoT 技术，强制 LLM 进行多轮次的二元判定（Binary Classification）。引擎向大模型发送受控 Prompt：

“比对学生答案与采分点 1。学生是否在语义上表达了‘晶格离子振动加剧’？请分析学生的措辞，并严格输出布尔值 TRUE 或 FALSE。”

规则引擎汇总（Rule-based Aggregation）：Smart Mark Engine 的符号执行层收集 LLM 输出的多个 TRUE / FALSE 信号，并结合 CIE 特有的判卷规则（如 M 分未得则 A 分无效、错别字容忍度、矛盾答案作废等）计算最终得分，并生成详尽的反馈报告。

这种将 LLM 限制在“执行特定语义比对任务”而非“自主决定分数”的架构重构，能够将物理定性分析题的机器判卷准确率（如 Quadratic Weighted Kappa 一致性指标）提升至人类教师水平（80% 以上）。

5. 跨学科知识图谱：物理与数学的桥梁

在 A-Level 体系中，数学 9709 是物理 9702 的重要工具语言和前置基石。力学（Mechanics）的运动学方程依赖于二次函数和代数变形，变速运动与震荡模型则需要微积分（Calculus）中的微分与积分知识。当学生在物理中犯错时，往往是因为数学工具掌握不牢。

为了支持这种错综复杂的学情诊断与跨科目教学干预，CIE-Copilot 必须设计一个基于关系型的跨学科知识图谱（Cross-Disciplinary Knowledge Graph），打破 9709 和 9702 数据孤岛的界限。

5.1. `curriculum_nodes` 中基于 `ltree` 的层次化路径设计

目前，系统已采用 PostgreSQL 的 `ltree` 模块来存储考纲树的层级关系。`ltree` 数据类型使用点分表示法（Dot-separated paths）记录节点路径，极其适合表示具有强包容关系的教育分类学模型。

为了支持多学科统一检索，应当建立标准化的顶层分类体系：

`[Subject].[Level].[Paper]...[Concept]`

物理节点示例：

`9702.AS.P2.Kinematics.Equations_of_Motion.Derivation`

数学节点示例：

`9709.AS.P1.Calculus.Integration.Definite_Integrals`

通过这种设计，系统可以利用 `ltree` 提供的祖先算子（`@>`）和后代算子（`<@`）实现极为灵活的查询分割。例如，当教师只想针对 AS 级别的力学进行检索时，只需在向量查询后附带 `WHERE topic_path <@ '9702.AS.P2.Kinematics'`，即可利用 B-tree / GiST 索引飞速过滤掉无关内容。

5.2. `PREREQUISITE_OF` 关系的图结构表征与查询

尽管 `ltree` 非常擅长处理自上而下的树状从属关系，例如“积分”是“微积分”的子集，但它难以直接表示横向的网状依赖关系（即 DAG 图中的边），如“定积分（数学）”是“v-t 图面积求位移（物理）”的前置知识。

此时需要引入图关系（Graph Relation）概念。不必一定要引入重量级的图形数据库（如 Neo4j），在 PostgreSQL 中增加一张边表（Edge Table）即可实现轻量级的 GraphRAG 功能：

```sql
CREATE TABLE prerequisite_edges (
    source_node LTREE,
    prerequisite_node LTREE,
    relation_type VARCHAR,
    weight FLOAT
);
```

多跳检索应用场景（Multi-hop Retrieval Scenario）：

假设在 Smart Mark Engine 的判卷过程中，发现学生在物理试卷 Paper 4 的简谐运动（SHM）题目中，频繁在求解 `a = -ω^2x` 的微分方程时失分。

触发诊断：引擎提取当前考察的物理节点 `9702.A2.P4.Oscillations.SHM_Equations`。

图谱遍历（Graph Traversal）：引擎查询 `prerequisite_edges` 表，查找所有指向该物理节点的先决条件，从而追溯到数学节点 `9709.A2.P3.Calculus.Differential_Equations`。

跨域增强（Cross-domain Augmentation）：RAG 系统执行二次检索，将获取到的物理原题、物理答案解释以及对应的数学微积分定理一起组装输入给 LLM。

生成精准反馈：LLM 输出针对性的教学反馈：“你对简谐运动中加速度和位移的关系理解有误。本质上，这是因为你没有正确运用 9709 纯数学 P3 中关于二阶导数的微积分运算技巧。让我们先回顾一下如何对正弦函数求二次导数……”

这种“混合关系图与向量检索”的深度架构设计，不仅提升了 RAG 在处理跨学科问题时的解释力与事实准确性，更在教育学意义上赋予了系统强大的个性化诊断（Diagnostic）与补救学习能力。

结语

CIE-Copilot 系统从单一的数学推导（9709）向具有真实物理情境（9702）的升级，是一次从“文本-符号”计算向“多模态-语义-经验”推理的全面技术重构。

通过引入以 `CircuitJSON` 和矢量参数化为核心的图表降维映射策略，我们绕开了当前视觉大模型在物理空间几何辨识上的软肋。针对 AO3 实验技能的 P-M-A-D-S 元数据重塑，赋予了 RAG 系统理解科学方法的结构化能力。基于物理量纲转换的检索归一化以及 PostgreSQL 自定义解析器的部署，从底层根除了科学符号匹配的系统性偏差。同时，将 Smart Mark Engine 向基于支架式思维链（Scaffolded CoT）的语义核查转型，确保了定性物理描述评分的可靠性。最后，通过在 `ltree` 层级中建立跨越数理学科的先决条件有向图，系统彻底打通了理科底层认知逻辑的任督二脉。这些架构级别的调整，将保障系统在 Phase 2 阶段具备极高的学术鲁棒性与教学有效性。
