# 选题13-DS

- 原始报告标题：CIE-Copilot 教育 AI 系统数据隐私与 SaaS 合规架构深度调研报告
- 来源：Google Gemini Deep Research
- 提取日期：2026-03-09

CIE-Copilot 教育 AI 系统数据隐私与 SaaS 合规架构深度调研报告
引言

随着人工智能技术在教育领域的深度渗透，面向未成年人和青年学生（特别是 16 至 19 岁群体）的教育科技（EdTech）平台正面临着前所未有的全球监管压力。CIE-Copilot 作为一款专为剑桥 A-Level 学生设计的 AI 辅导系统，其核心业务逻辑依赖于对学生认知状态、学习进度以及错误概念的深度剖析。该系统不仅处理常规的个人身份信息（PII），还通过 LangGraph 的状态快照（Checkpoints）和大型语言模型（LLM）的交互日志，捕获高度敏感的行为数据和教育记录。

鉴于 CIE-Copilot 的目标市场横跨英国、新加坡、马来西亚、中国香港、阿联酋和印度，并计划未来扩展至中国大陆的 B2B 机构采购市场，系统的技术架构必须从底层适应高度碎片化的国际数据隐私法规。本报告旨在针对多租户隔离架构（Supabase RLS）、第三方 AI 模型调用（OpenAI/Anthropic）、数据生命周期管理以及全球未成年人数据保护合规要求，提供详尽的战略分析与技术实施蓝图。

1. 全球隐私法规适用性与未成年人同意矩阵

在数字服务领域，关于“儿童”的法律定义以及“数字同意年龄”（Age of Digital Consent）的界定在全球范围内存在显著差异。对于 16 至 19 岁的 A-Level 学生群体，系统必须根据用户所在的物理司法管辖区，动态调整数据收集的同意机制、隐私默认设置以及家长参与的强制性要求。

1.1 英国：UK GDPR、DPA 2018 与《适龄设计规范》

在英国司法管辖区内，《2018年数据保护法》（DPA 2018）明确将信息社会服务（ISS）的数字同意年龄设定为 13 岁 。这意味着对于 16 至 19 岁的 CIE-Copilot 用户，系统在法律上完全可以依赖学生本人的自主同意来处理其个人数据，无需强制获取家长的授权 。   

然而，合规的复杂性在于英国信息专员办公室（ICO）颁布的《适龄设计规范》（Age-Appropriate Design Code，通常被称为 Children's Code）。该规范采纳了联合国的定义，将“儿童”界定为任何未满 18 岁的个体 。因此，尽管 16 和 17 岁的用户可以自主提供数据处理同意，CIE-Copilot 仍被强制要求将平台默认设置为“最高隐私级别”，关闭非必要的地理位置追踪，且绝对禁止使用“助推（Nudge）”技术来诱导学生放弃隐私保护 。此外，处理此类数据强制要求企业开展数据保护影响评估（DPIA） 。   

1.2 新加坡：PDPA (2012) 及其 2021/2024 修订与指南

新加坡《个人数据保护法》（PDPA）并未在成文法中直接规定数字同意的确切年龄，但新加坡个人数据保护委员会（PDPC）在 2024 年 3 月发布的最新咨询指南中提供了明确的实务框架。指南指出，13 至 17 岁的未成年人在能够充分理解数据收集政策及撤回同意后果的前提下，可以给出有效的自主同意 。   

然而，PDPC 特别强调，在特定的业务场景下（明确列举了教育环境 EdTech），机构若认为未成年人可能缺乏足够的认知能力，则应谨慎行事，主动要求获取家长或监护人的同意 。对于 CIE-Copilot 而言，虽然 16-19 岁学生理论上可自主同意，但在 B2B（学校采购）模式下，最佳实践是联合学校获取统一的家长同意书。此外，PDPA 在 2021 年的修订引入了强制性数据泄露通知义务。鉴于系统处理包括学生错题和学习缺陷在内的数据，任何未经授权的访问都可能被视为对个人造成“重大损害（Significant Harm）”，从而触发向 PDPC 及受影响个人的 72 小时强制通报义务 。   

1.3 中国香港：个人资料（私隐）条例 (PDPO)

香港 PDPO 对所有数据主体一视同仁，并未设立独立的儿童隐私保护章节。但在执行层面，香港个人资料私隐专员公署（PCPD）发布的指引明确指出，对于未满 18 岁的未成年人，若涉及《保障资料第3原则》（DPP3）中规定的“新目的”（即超越原始收集目的的数据使用，例如将学生数据用于训练 AI 模型的商业目的），则必须获得具有父母责任的人士代表未成年人做出的“订明同意（Prescribed Consent）” 。   

PCPD 还建议，在线教育平台在收集未成年人数据时，应采用简明易懂的《个人信息收集声明》（PICS），避免过度收集，并且在任何公开发布（如机构内的班级排名或错题分享）中强制使用假名化技术 。   

1.4 马来西亚：PDPA 2010 及其 2024 年重大修订

马来西亚对未成年人数据的保护采取了非常严格的“一刀切”政策。根据《个人数据保护条例》（2013），任何未满 18 岁的个人均不具备提供有效数据处理同意的法律能力。数据使用者必须获得该未成年人的父母、监护人或具有父母责任的人的明确同意 。因此，对于 CIE-Copilot 中 16 和 17 岁的马来西亚用户，平台在注册环节必须硬性植入家长验证与同意的网关。   

此外，2024 年通过的 PDPA 修订案（Amending Act 2024）大幅增加了合规成本。该法案首次将直接法律义务（如实施安全措施的责任）强加于“数据处理者（Data Processors）”，强制要求企业任命数据保护官（DPO），并引入了对生物识别等敏感数据的更严格限制，违规罚款上限大幅提升至 100 万林吉特 。   

1.5 印度：数字个人数据保护法 (DPDPA 2023)

印度的 DPDPA 2023 是目前全球对儿童数据监管最为严厉的法规之一。该法案明确将“儿童”定义为未满 18 岁的任何个人 。法案规定，数据受托人（Data Fiduciary）在处理任何儿童个人数据之前，必须获得“可验证的父母同意（Verifiable Parental Consent）” 。   

在实际操作中，印度正在推动利用国家授权的电子身份系统（如 DigiLocker）来验证同意人的成年身份以及其与未成年人的监护关系 。此外，DPDPA 绝对禁止对儿童进行行为分析（Profiling）、定向广告以及任何可能对儿童福祉造成不利影响的数据处理活动 。在印度市场，16-17 岁的 A-Level 学生必须通过家长的数字代币授权才能激活 CIE-Copilot 账户。   

1.6 阿联酋：PDPL 45/2021 与《儿童数字安全法》(26/2025)

阿联酋在 2026 年 1 月正式生效了具有里程碑意义的第 26/2025 号联邦法令《儿童数字安全法》（Child Digital Safety Law）。该法案适用于所有在阿联酋运营或目标用户包含阿联酋居民的数字平台，并将“儿童”定义为未满 18 岁的人士 。   

法案严禁收集 13 岁以下儿童的数据。对于 13 至 17 岁的青少年，平台被强制要求实施“增强型儿童保护控制（Enhanced Child Protection Controls）” 。这不仅包括默认的最高隐私设置，还要求平台提供并激活强制性的家长控制工具（如使用时间限制、强制休息机制等），并部署人工智能系统以主动检测和过滤有害内容 。虽然法案允许内阁为教育平台提供一定程度的豁免，但这需要平台主动申请并证明其部署了足够的安全防护措施 。   

1.7 中国大陆：《中华人民共和国个人信息保护法》(PIPL)

若 CIE-Copilot 扩展至中国大陆，必须遵守 PIPL。PIPL 将不满 14 周岁未成年人的个人信息明确划定为“敏感个人信息（Sensitive Personal Information, SPI）”，处理此类信息必须取得父母或其他监护人的单独同意（Separate Consent），并制定专门的处理规则 。   

对于 16-19 岁的 A-Level 学生，他们可以自主同意。然而，CIE-Copilot 在中国大陆面临的最大合规障碍是“数据出境（Cross-Border Data Transfer）”。将学生在辅导中输入的解题过程和对话（包含大量非结构化 PII）发送至境外的 OpenAI 或 Anthropic API，将触发严格的出境安全评估、标准合同（SCC）备案或个人信息保护认证要求 。   

1.8 法规适用性与未成年人同意矩阵总结

下表总结了各管辖区对 16-18 岁用户的核心要求及企业的具体义务：

司法管辖区	适用核心法规	16-18岁是否需家长同意	特殊合规义务与架构要求
英国	UK GDPR, DPA 2018, Children's Code	否（数字同意年龄为13岁）	

必须默认最高隐私设置；严禁使用“助推”技术；必须开展针对儿童的 DPIA 。


新加坡	PDPA, 2024 年 PDPC 儿童指南	否（但 EdTech 环境强烈建议获取）	

实施数据保护基建设计（PbD）；强制性数据泄露通知（72小时内） 。


中国香港	PDPO	是（涉及新目的使用时需“订明同意”）	

必须提供适龄、简明易懂的 PICS；严格执行数据收集最小化（DPP1） 。


马来西亚	PDPA 2010 (含 2024 修正案)	是（任何未满 18 岁均需家长同意）	

数据处理者（Processor）需承担直接法律责任；强制任命 DPO 并进行泄露通知 。


印度	DPDPA 2023	是（法律明确 18 岁以下为儿童）	

必须通过可信机制（如 DigiLocker）实施可验证的父母同意；绝对禁止行为剖析 。


阿联酋	Law 45/2021, Law 26/2025	否（但强制要求家长控制权）	

平台必须提供强制时间限制和休息机制；强制 AI 过滤引擎；禁止算法定向广告 。


中国大陆	PIPL	否（仅未满 14 周岁为 SPI）	

严格的数据出境限制（需 SCC 或安全评估）；敏感个人信息需“单独同意” 。

  
2. 适用于教育 AI 的四级数据分类分级体系

CIE-Copilot 处理的数据从非敏感的系统运行日志，跨越到反映学生深层认知缺陷和潜在心理状态的 AI 交互记录。为确保在 Supabase 和 LangGraph 架构下实施精准的访问控制和保留策略，系统必须建立严密的四级数据分类分级体系（Data Classification and Grading Strategy）。

2.1 体系架构与字段映射
级别一：公开与系统匿名数据 (Tier 1: Anonymous & Telemetry Data)

数据定义： 不包含任何个人身份信息（PII），且无法通过合理手段逆向识别出特定学生个人的统计学和系统性能数据。

映射字段： usage 统计 (匿名)（如 API 调用延迟、节点执行耗时、系统级错误率）。

存储位置要求： 无数据驻留限制，可存储于云服务商的全球任一节点（如 AWS/Azure 的日志分析存储）。

加密要求： 传输层加密（TLS 1.2+）；存储层采用云服务商默认的静态加密（AES-256）。

保留期限： 出于系统优化和商业分析目的，可无限期保留（Indefinite Retention）。

访问权限： 广泛的内部访问权限，授权给开发人员、运维团队和产品分析师。

级别二：业务瞬态与计算过程数据 (Tier 2: Ephemeral Processing Data)

数据定义： 用户为达成特定辅助目的而主动上传，但系统在完成即时计算（如向量化、摘要提取）后无需持久化的文档或素材。

映射字段： knowledge_chunks（通过 BYOC - Bring Your Own Content 上传的课件或笔记原文）。

存储位置要求： 必须在处理节点本地内存或高易失性缓存（如配置了严格 TTL 的 Redis）中处理，严禁落盘至持久化关系型数据库。

加密要求： 内存级隔离；传输过程实施端到端加密。若必须暂存至对象存储以供分块提取，需采用一次性客户托管密钥（CMK）加密。

保留期限： 极短的生存时间（TTL）。文件在经过文本提取和嵌入（Embedding）生成后，原文必须立即（Ephemeral）从内存或临时存储中彻底销毁。

访问权限： 仅限应用程序内部进程（AI Worker）在运行时访问，严禁任何人员或管理员的控制台访问。

级别三：机密教育档案与认知图谱 (Tier 3: Confidential Educational Records)

数据定义： 明确关联至特定用户 ID 的教育成果数据、学习状态以及认知缺陷评估。此类数据一旦泄露，将对学生的学术声誉、尊严或情感造成实质性损害，受 GDPR 及 DPDPA 重点保护。

映射字段： student_state（包含 current_topic_path, mastery, misconceptions, mode）；error_book 的所有字段（错题引用、错因标签、笔记、下次复习时间）。

存储位置要求： 必须遵守数据主权要求。如英国用户数据存放在 UK South 数据中心，印度用户数据存放在 Central India 节点。

加密要求： 数据库级（PostgreSQL）静态加密（TDE，采用 AES-256），并强烈建议对 misconceptions 和 mastery 等字段实施应用层字段级加密（Field-Level Encryption）。

保留期限： 贯穿用户的整个订阅周期或学业阶段。当用户行使删除权或账户因非活跃到期后，系统应在法定宽限期（如 30-60 天）内完成永久物理删除。

访问权限： 严格基于 Supabase RLS 策略，仅允许认证学生本人读取其私有数据。机构教师只能通过聚合函数读取去标识化后的统计数据。

级别四：高度敏感/深度行为交互数据 (Tier 4: Highly Sensitive Deep Behavioral Data)

数据定义： 包含未经过滤的自然语言对话原文和模型状态快照。学生在与 AI 辅导的连续对话中极易泄露家庭状况、心理健康问题及其他高度敏感的 PII。这是合规风险的“重灾区”。

映射字段： checkpoints.state_blob（LangGraph 序列化后的完整状态与对话上下文）；对话日志（发送至 LLM 的 Prompt 与返回的 Response 原文）。

存储位置要求： 必须在隔离的专用 schema 或独立的日志集群中进行逻辑隔离，严格遵守区域内数据驻留政策。

加密要求： 静态存储强制使用 AES-256-GCM 加密，并通过透明数据加密（TDE）管理密钥。必须在将数据发往大模型前实施实时 PII 遮蔽（Redaction）。

保留期限： 采取“最小化”保留原则。checkpoints 应设计为仅保留用于对话恢复的有限轮次（如滚动保留最近 10 次的 Super-step 快照），超时自动丢弃。对于 对话日志，用于调试和滥用监控的保留时间不应超过 30 天 ，期满必须执行物理粉碎或不可逆的脱敏处理。   

访问权限： 零常态化人工访问（Zero Standing Privileges）。仅在触发合规审计、严重错误排查或信任与安全（Trust and Safety）事件时，通过特权访问管理（PAM）系统授予安全工程师或 DPO 限时只读权限。

3. Supabase RLS 策略与多租户隔离架构设计

Supabase 依托 PostgreSQL 的原生行级安全性（Row Level Security, RLS）机制，为 SaaS 平台提供了数据库引擎级别的硬隔离屏障。在 CIE-Copilot 中，由于数据涉及未成年人和教育机构的多级交互，必须通过精确的 RLS 策略落实“最小特权原则”，彻底杜绝越权访问（BOLA/IDOR 漏洞）。

3.1 个人数据隔离：学生与自身状态的绑定

针对 student_state 和 error_book 等表，最核心的要求是学生只能查询和修改属于自己的行记录。

性能优化注意事项： 在 Supabase 中，未认证请求调用 auth.uid() 会返回 null。此外，直接在 USING 子句中针对每一行评估 auth.uid() = user_id 会导致 PostgreSQL 规划器在全表扫描时反复执行该函数，引发严重的性能瓶颈 。最佳实践是将获取 UID 的函数包裹在标量子查询中，例如 (select auth.uid())，从而触发规划器的 initPlan 优化，将函数求值缓存为会话级常量 。同时，必须为所有表中的 user_id 列建立 B-tree 索引 。   

RLS 策略实现示例：

SQL
-- 针对 student_state 和 error_book 表启用 RLS
ALTER TABLE public.student_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_book ENABLE ROW LEVEL SECURITY;

-- 创建索引以优化 RLS 查询性能
CREATE INDEX idx_student_state_userid ON public.student_state USING btree (user_id);
CREATE INDEX idx_error_book_userid ON public.error_book USING btree (user_id);

-- 创建学生本人访问策略 (SELECT, UPDATE, INSERT)
CREATE POLICY "Students can access their own state" 
ON public.student_state 
FOR ALL 
TO authenticated 
USING ( user_id = (select auth.uid()) )
WITH CHECK ( user_id = (select auth.uid()) );

CREATE POLICY "Students can access their own error book" 
ON public.error_book 
FOR ALL 
TO authenticated 
USING ( user_id = (select auth.uid()) )
WITH CHECK ( user_id = (select auth.uid()) );

3.2 机构教师视图：通过安全定义者函数实现聚合抽象

B2B 场景下的难点在于：教师需要查看其所在机构/学校内全班学生的“误概念聚合数据（Aggregated Misconceptions）”，以指导后续教学；但在隐私合规（如 UK GDPR 和阿联酋 Law 26/2025）限制下，教师绝对不能直接读取单个学生的 checkpoints 或具体的认知画像（mastery）从而对学生进行侵入性评估（Evaluative Profiling）。   

若在 RLS 层面允许教师角色读取 student_state，将不可避免地导致底层数据泄露。正确的架构设计是：在底层保持严格的 user_id RLS 隔离，使得教师对 student_state 表的直接 SELECT 永远返回 0 行。然后，利用 PostgreSQL 的 SECURITY DEFINER 函数（或结合安全调用者特权的物化视图）来提供数据抽象层 。   

SECURITY DEFINER 函数以创建者（通常为超级管理员）的权限运行，能够绕过底层表的 RLS 限制，在函数内部执行聚合运算，并仅将剥离了个人身份标识的统计结果返回给调用它的教师 。   

安全聚合函数实现示例：

SQL
-- 创建验证教师权限并返回聚合错因的 SECURITY DEFINER 函数
CREATE OR REPLACE FUNCTION get_class_aggregated_misconceptions(p_class_id UUID)
RETURNS TABLE (misconception_tag TEXT, error_count INT)
LANGUAGE plpgsql
SECURITY DEFINER   -- 关键：以创建者权限运行，可读取所有行以进行聚合
SET search_path = public
AS $$
BEGIN
    -- 步骤 1：严格的调用者鉴权，确认当前执行者(auth.uid())是该班级的合法教师
    IF NOT EXISTS (
        SELECT 1 FROM class_teachers 
        WHERE teacher_id = (select auth.uid()) 
        AND class_id = p_class_id
    ) THEN
        RAISE EXCEPTION 'Access Denied: Not an authorized teacher for this class.';
    END IF;

    -- 步骤 2：执行聚合计算并返回结果，杜绝暴露单个 user_id
    RETURN QUERY
    SELECT unnest(misconceptions) AS misconception_tag, COUNT(*)::INT AS error_count
    FROM student_state
    WHERE student_id IN (
        -- 获取该班级下所有的学生ID
        SELECT student_id FROM class_enrollments WHERE class_id = p_class_id
    )
    GROUP BY misconception_tag;
END;
$$;

3.3 AI Worker 服务账号：基于作业范围的细粒度控制

CIE-Copilot 后端采用 Redis Streams 作为 Job 队列，Python AI Worker 需要从队列中提取负载并更新 Supabase 数据库。很多架构在处理后端服务时，图方便会直接使用 Supabase 提供的 service_role 密钥。然而，service_role 会无条件绕过所有 RLS 策略，直接赋予进程神级权限（God Mode）。一旦 AI Worker 遭受提示词注入攻击（Prompt Injection）或远程代码执行漏洞利用，攻击者将轻易清空或窃取全库数据。   

最小权限架构设计：
AI Worker 不应使用 service_role 密钥。相反，系统应为 Worker 颁发具有时效性的、受限的自定义 JWT。当后台服务准备调度某个 user_id 的任务时，签名中心为其生成一个包含 {"role": "ai_worker", "job_user_id": "<具体学生的UUID>"} 声明的 JWT。

数据库端设置专属的 Worker RLS 策略，解析 JWT 中的声明，确保该 Worker 进程只能精准修改它当前被指派处理的那个学生的数据。

** Worker 限定策略示例：**

SQL
CREATE POLICY "AI Worker can only update assigned user state"
ON public.student_state
FOR UPDATE
TO authenticated
USING ( 
    (auth.jwt() ->> 'role') = 'ai_worker' AND 
    user_id::text = (auth.jwt() ->> 'job_user_id') 
)
WITH CHECK ( 
    (auth.jwt() ->> 'role') = 'ai_worker' AND 
    user_id::text = (auth.jwt() ->> 'job_user_id') 
);

4. 第三方大模型 API 的数据处理协议（DPA）与选型

CIE-Copilot 的核心功能依赖于将包含了学生作答过程、逻辑推演以及潜在背景信息的上下文发送至外部的 LLM。这些 Payload 通常属于级别四的深度敏感数据。将此类数据传输出境或交由第三方服务商处理，是引发全球监管机构（尤其是英国 ICO、阿联酋数据办公室以及中国网信办）高度关注的核心风险。

4.1 OpenAI API 的留存机制与法律风险

通过默认的 OpenAI 开发者 API 发送数据时，尽管 OpenAI 明确承诺默认不使用 API 提交的数据进行模型训练，但其常规策略出于滥用监控（Abuse Monitoring）和信任安全的目的，会将请求和响应的数据暂存最多 30天 。   

对于处理全球多地未成年人数据的 CIE-Copilot 而言，30天的不可控第三方留存是致命的。一旦包含学生身份的数据在美国服务器上停留 30 天，将构成实质性的“跨境数据传输（Cross-Border Data Transfer）”，这直接违反了中国 PIPL 中严格的出境安全评估要求，同时也极大地增加了满足欧盟/英国 GDPR 下充分性决定的合规复杂性 。企业可以向 OpenAI 销售团队提交请求，申请符合条件的端点实现“零数据留存（Zero Data Retention, ZDR）”，但该申请流程繁琐，主要优先面向医疗（符合 HIPAA 规范）或金融等具有特殊信任关系的合作伙伴，缺乏自助式的直接保障 。   

4.2 Anthropic Claude API 的处理政策

Anthropic Claude 在 2025 年进行了一次引发争议的条款更新，宣布其面向普通消费者（Claude web/app）的交互数据将被默认保留 5年 并用于模型训练 。然而，这一激进政策仅限于消费者层级。对于通过 API 调用的企业级工作流，Anthropic 仍然执行不训练模型并提供极为严格的数据处理协议（DPA）。自 2025 年 9 月起，API 的默认日志保留期更是从 30 天缩短至 7天 。此外，企业可以通过签署特定的零数据留存附件（ZDR Addendum）实现实时的滥用检测即弃（0 days retention） 。   

4.3 战略建议：采用 Azure OpenAI Service 并激活 ZDR

在教育技术合规架构中，为了同时满足数据主权（Data Residency）、GDPR 合规性以及无缝的零数据留存，Azure OpenAI Service 是压倒性的最优选择。

数据本地化与主权隔离： 与全局分布的常规 OpenAI API 不同，Azure OpenAI Service 允许架构师指定数据处理的地理区域（如 UK South 节点供英国和阿联酋用户使用，Central India 供印度用户使用） 。这就意味着学生的 Prompt Payload 物理上不会离开合规的管辖区，彻底规避了复杂的跨境数据传输法律障碍。   

彻底的零数据留存（ZDR）： 对于具有企业协议（EA）的客户，可以通过向微软提交审核工单，明确申请开启 ZDR 模式 。一旦获批，微软会从租户级别关闭内置的内容安全过滤日志和人工审查功能。在此模式下，学生的请求和模型的输出仅在 GPU 内存中完成计算，绝不会被持久化到任何磁盘或数据库中，实现了真正的无状态（Stateless）推理 。   

合同与责任保障： 使用 Azure OpenAI 意味着数据永远停留在微软的云生态边界内，不与 OpenAI Inc. 发生任何数据共享 。这满足了阿联酋 Law 26/2025 中关于服务提供商链条中儿童数据免受第三方滥用的审查标准 。   

5. 数据主体权利：“被遗忘权”与 LangGraph 级联删除架构

根据 UK GDPR 第 17 条及各国相应的数据保护法（如新加坡 PDPA 的保留限制原则和撤回同意权），当学生选择注销账户或终止服务时，CIE-Copilot 负有法律义务彻底抹除其所有可识别的个人数据。然而，在 LangGraph 框架下执行擦除操作是一项艰巨的技术挑战。

5.1 LangGraph PostgresSaver 的技术包袱

为了支持复杂多智能体对话的暂停、恢复与时空穿梭（Time-travel），LangGraph 的持久化模块 PostgresSaver 会在 PostgreSQL 数据库中维护深层次的表结构，核心包括 checkpoints（对话图的超级步快照）和 checkpoint_blobs（存储每个节点执行状态的大型序列化二进制/JSONB 数据块） 。这些 Blob 文件体积庞大，忠实记录了用户在此线程（thread_id）中的所有对话历史和上下文。   

5.2 盲目采用 ON DELETE CASCADE 的系统性灾难

架构师常犯的错误是在 Supabase 的 auth.users 表与 LangGraph 状态表之间建立外键，并加上 ON DELETE CASCADE。当用户点击注销时，数据库会尝试在一次主事务中同步删掉该用户遗留的数以万计的 Blob 数据块。

PostgreSQL 采用多版本并发控制（MVCC），执行 DELETE 指令时并不会立即释放磁盘空间，而是将这些行标记为“死元组（Dead Tuples）” 。针对包含大型 JSONB 或 TEXT 对象（存储在 TOAST 表中）的 checkpoint_blobs 触发级联删除，会导致灾难性的后果：   

产生数百 GB 的预写式日志（WAL），瞬间耗尽数据库的 I/O 带宽 。   

导致相关的索引发生页分裂与严重膨胀。

主事务持续时间过长，可能引发写锁，导致其他在线学生的 AI 辅导服务中断（Timeouts） 。   

5.3 级联删除架构重构：异步批处理与逻辑解绑

为保障系统高可用性并符合被遗忘权的 30 天响应时效限制，CIE-Copilot 必须设计一套稳健的异步脱敏与硬删除生命周期：

第一阶段：同步软删除与去标识化（Synchronous Soft-Delete & Pseudonymization）
当用户发起注销请求时，系统立即在 auth.users 和业务表中标记 is_deleted = true，并将该用户的身份标识（如姓名、邮箱、绑定手机）通过单向哈希函数进行彻底脱敏。至此，从应用层和合规层面，该个体已“被遗忘”，对外服务立即阻断。

第二阶段：检索映射（Mapping Thread IDs）
LangGraph 并不直接理解 user_id，其主键是 thread_id 。删除作业首先从关联表中提取该注销用户对应的所有历史 thread_id 集合，并写入到后台的清理任务队列中。   

第三阶段：异步批处理删除（Asynchronous Batched Chunking）
后台的定时任务（如采用 Celery 或 Supabase pg_cron）按批次读取待清理的 thread_id。每次仅执行有限数量的删除操作：

SQL
DELETE FROM checkpoint_blobs 
WHERE thread_id = 'target_thread' 
AND ctid IN (SELECT ctid FROM checkpoint_blobs WHERE thread_id = 'target_thread' LIMIT 1000);


通过切分块大小并分步执行，可以避免长事务锁表，并给予 PostgreSQL 自带的 autovacuum 守护进程充足的时间来回收 TOAST 表中的死元组，维持数据库性能稳定 。   

常态化内存修剪（Rolling Pruning Policy）：
根本的解决之道是限制数据的积累。鉴于教育辅导已经将核心的认知模型沉淀到了 student_state（级别三），LangGraph 的 checkpoints 只应用于短期的对话意外恢复。必须制定严格的生命周期策略，利用后台脚本定期清理所有超过 24 小时或超过特定节点深度的旧 checkpoints，从而极大地缩小数据库底座的攻击面与维护成本 。   

6. 符合 UK GDPR 与《儿童规范》的 DPIA 大纲

鉴于 CIE-Copilot 处理儿童与未成年人的敏感数据，采用创新的人工智能技术进行自动化评估分析（教育弱点探测），并涉及将用户特征转化为大规模聚合视图，系统存在侵犯个人权利的高风险。因此，在平台上线和产生实质性处理前，必须按照英国信息专员办公室（ICO）和阿联酋及新加坡相关指引，完成《数据保护影响评估（DPIA）》 。以下为专门针对该系统的合规评估提纲设计。   

第一部分：处理活动的必要性与范围评估 (Need and Description of Processing)

1. 处理的性质 (Nature of Processing)

活动描述： 平台通过交互式聊天界面收集 16-19 岁学生的自然语言输入。数据从客户端传输至 Supabase（位于特定地理区域），由 Python AI Worker 提取，附加底层状态，发送至 Azure OpenAI 的大语言模型进行推理分析。返回结果被解构为知识点掌握度浮点数并写入 student_state。

数据流图： 记录从 BYOC 材料上传（内存中处理与丢弃）、对话记录、一直到生成概念标签（misconceptions）和图状态持久化（checkpoints）的完整链路。

2. 处理的范围 (Scope of Processing)

数据量级： 预计涵盖六个司法管辖区内的数千名活跃学生。

数据敏感度： 涉及未成年人的认知能力评判数据。极有可能包含未成年人在自然语言交互中主动或意外泄露的个人敏感信息（如家庭背景、情绪健康状态）。

3. 处理的环境 (Context of Processing)

主体关系： 学生与 AI 系统之间存在天然的知识与权威的不对等（Power Imbalance）。学生面临高强度的升学考试压力（Cambridge A-Level），对系统的评估结果具有高度依赖性 。   

受众界定： 系统虽然设计针对 16-19 岁群体，但在用户画像特征上完全落入 UK Children's Code 的保护范围（未满 18 岁）。对于阿联酋及印度市场，受当地刚性法定年龄（18岁）及家长连带责任约束。

4. 处理的目的 (Purposes of Processing)

核心目的： 为用户提供高度个性化的自适应课业辅导。

次要目的： 为签约教育机构的教师提供班级层面的聚合分析仪表盘，提升整体教学质量。不含任何针对未成年人的行为定向广告或数据贩卖意图。

第二部分：合法性、相称性与合规措施 (Lawfulness, Proportionality & Compliance)

合法基准 (Lawful Basis)：

针对提供 AI 辅导服务本身：依赖于“履行合同（Performance of a Contract）”必需。

对于教育机构的聚合数据展示：基于“合法利益（Legitimate Interests）”，并且已经过影响平衡测试，证明不会对个人的基本权利造成负面冲击。

适龄同意与家长验证： 针对马来西亚及印度市场，明确集成受信任的第三方服务以完成强实名的“可验证父母同意”。针对其他区域 13 岁以上用户，设计符合未成年人阅读水平的独立隐私提示弹窗（PICS） 。   

数据最小化原则： 明确禁止在持久化数据库中存储 BYOC 上传原文件。限制 LangGraph Checkpoints 的留存轮数。

第三部分：未成年人高风险场景识别 (Risk Identification)

AI 幻觉与表现性伤害（Representational/Allocative Harm）：

风险源： LLM 输出含有偏见的建议，或者错误地将学生标记为特定知识点“未掌握”，导致教师对学生产生误判或打击学生自信心 。   

风险等级： 中/高。

第三方的越权处理与数据留存（Third-party Sub-processor Overreach）：

风险源： 学生输入中包含的敏感身份信息被发送至商业大模型 API，遭到长时间留存并被大模型提供商用于未来迭代模型的预训练（Training on Consumer Data） 。   

风险等级： 极高。

身份重识别与聚合数据溢出（Re-identification from Aggregates）：

风险源： 在 B2B 的学校仪表盘中，由于班级样本量过小，教师能够通过错因分布（misconceptions）结合日常了解，精确逆向定位到特定的脆弱学生。

风险等级： 中。

第四部分：风险缓解措施与防御性设计 (Mitigation & PbD Strategies)

缓解措施 1（应对 AI 危害）： 在模型 System Prompt 中植入严格的认知边界指令。赋予机构教师对错误评估进行人工推翻（Override）的后台纠偏权利（Human-in-the-Loop 机制）。在交互界面向未成年人提供清晰的免责声明，提示 AI 生成内容可能存在偏差。

缓解措施 2（应对第三方泄漏）： 绝对摒弃基于常规商业 API 的接入方式。签署企业级 Azure 协议组合，将数据处理限制在地理合规的数据网格内，并在订阅配置上硬性锁定“零数据留存（ZDR）”，彻底切断训练回流的通道 。   

缓解措施 3（应对仪表盘越权）： 在 Supabase 中实施复杂的 RLS 隔离。强制利用 SECURITY DEFINER 函数在查询阶段屏蔽底层 user_id。对于任何包含少于 5 名学生的班级群体，在仪表盘上采用 K-匿名化（k-Anonymity）技术，主动隐藏可能导致单一个体被识别的细分错因长尾数据。

结语

部署面向青少年的教育 AI 系统，绝不能仅将合规停留在表面协议的签署上。CIE-Copilot 必须在架构设计的初始阶段将“隐私设计（Privacy by Design）”融入血液。通过精确配置的多层数据分级网络、建立在 RLS 基础上的坚固租户壁垒、利用 Azure OpenAI 构建的零留存推理沙盒，以及无阻碍的异步数据物理粉碎机制，平台方能从根本上免疫跨越欧、亚、中东复杂法规交织所带来的合规毒药，为年轻一代的学习者铸就值得信赖的数字盾牌。
