# Design Document

## Overview

CIE Copilot网站重构设计旨在创建一个现代化、高端且简洁的学习平台界面。设计理念遵循"Less is More"原则，通过精心设计的信息架构、视觉层次和交互体验，打造一个专业可信赖的AI学习助手平台。

设计将采用现代扁平化设计语言，结合微妙的渐变和阴影效果，营造出高端科技感。整体色彩以蓝色系为主调，传达专业、可靠、智能的品牌形象。

## Architecture

### 信息架构重构

```
新网站结构:
├── 首页 (Landing) - 价值展示与转化
├── 学科中心 (Subject Hub) - 核心功能入口
│   ├── Mathematics
│   ├── Further Mathematics  
│   └── Physics
├── AI助手 (AI Assistant) - 智能对话界面
├── 学习中心 (Learning Center) - 个人学习空间
└── 关于我们 (About) - 品牌故事与信任建立
```

### 页面层级简化

**当前问题分析:**
- 页面层级过深 (Landing → Topics → Papers → Topic Detail)
- 导航路径复杂，用户容易迷失
- 功能分散，缺乏统一的学习入口

**新架构优势:**
- 扁平化导航，最多3层深度
- 统一的学科中心作为核心hub
- AI助手贯穿整个学习流程

## Components and Interfaces

### 1. 重新设计的首页 (Landing Page)

#### Hero Section 重构
```jsx
// 新的Hero设计理念
<HeroSection>
  <MinimalNavigation />
  <CenteredValueProposition>
    <MainHeadline>AI-Powered CIE Learning</MainHeadline>
    <SubHeadline>专为A-Level学生打造的智能学习伙伴</SubHeadline>
    <PrimaryCTA>开始学习</PrimaryCTA>
    <SecondaryCTA>观看演示</SecondaryCTA>
  </CenteredValueProposition>
  <HeroVisual>
    <InteractiveAIDemo />
  </HeroVisual>
</HeroSection>
```

**设计特点:**
- 去除冗余信息，突出核心价值
- 大胆的排版和充足的留白
- 交互式AI演示替代静态内容
- 渐变背景营造科技感

#### 功能展示区域
```jsx
<FeatureShowcase>
  <FeatureCard icon="brain" title="智能AI辅导">
    <LiveChatPreview />
  </FeatureCard>
  <FeatureCard icon="book" title="完整学科覆盖">
    <SubjectGrid />
  </FeatureCard>
  <FeatureCard icon="target" title="考试针对性">
    <ExamFocusDemo />
  </FeatureCard>
</FeatureShowcase>
```

### 2. 学科中心 (Subject Hub)

#### 统一的学科入口设计
```jsx
<SubjectHub>
  <HubHeader>
    <BreadcrumbNavigation />
    <SearchBar placeholder="搜索主题、概念或问题..." />
  </HubHeader>
  
  <SubjectGrid>
    <SubjectCard subject="mathematics">
      <SubjectIcon />
      <SubjectTitle>Mathematics</SubjectTitle>
      <QuickStats>
        <TopicCount>156 Topics</TopicCount>
        <ProgressBar value={65} />
      </QuickStats>
      <QuickActions>
        <ActionButton>继续学习</ActionButton>
        <ActionButton variant="outline">浏览主题</ActionButton>
      </QuickActions>
    </SubjectCard>
    {/* 其他学科卡片 */}
  </SubjectGrid>
  
  <RecentActivity>
    <ActivityFeed />
  </RecentActivity>
</SubjectHub>
```

#### 学科内容页面重构
```jsx
<SubjectContentPage>
  <ContentSidebar>
    <TopicTree collapsible expandable />
    <ProgressTracker />
    <AIAssistantTrigger />
  </ContentSidebar>
  
  <MainContent>
    <ContentHeader>
      <TopicBreadcrumb />
      <ContentActions>
        <BookmarkButton />
        <ShareButton />
        <AIHelpButton />
      </ContentActions>
    </ContentHeader>
    
    <ContentBody>
      <TopicContent />
      <RelatedTopics />
      <PracticeQuestions />
    </ContentBody>
  </MainContent>
</SubjectContentPage>
```

### 3. AI助手界面重构 - 画布式交互体验

#### 丝滑的画布式对话界面
```jsx
<AICanvasInterface>
  {/* 可拖拽调整大小的对话窗口 */}
  <ResizableDialogCanvas
    minWidth={400}
    minHeight={300}
    defaultSize={{ width: 800, height: 600 }}
    dragHandles={['top', 'right', 'bottom', 'left', 'corners']}
    smoothResize={true}
    snapToGrid={false}
  >
    <CanvasHeader draggable>
      <AIAvatar 
        animated 
        breathingEffect 
        statusIndicator="online"
      />
      <AIStatus>
        <StatusDot color="green" pulsing />
        专业CIE导师 - 随时为您服务
      </AIStatus>
      <CanvasControls>
        <MinimizeButton />
        <MaximizeButton />
        <FloatingModeButton />
        <CloseButton />
      </CanvasControls>
    </CanvasHeader>
    
    <FluidChatContainer>
      {/* 无限滚动的消息流 */}
      <InfiniteMessageStream
        virtualScrolling
        smoothScrolling
        messageAnimations={{
          enter: 'slideInFromBottom',
          exit: 'fadeOut',
          typing: 'typingDots'
        }}
      >
        <WelcomeMessage animated />
        <ConversationHistory 
          groupByTime
          showTimestamps
          messageTransitions="smooth"
        />
      </InfiniteMessageStream>
      
      {/* 智能输入区域 */}
      <SmartInputCanvas>
        <AdaptiveInputBox
          autoResize
          placeholder="问我任何CIE相关问题..."
          suggestions={true}
          voiceInput={true}
          mathInput={true}
          imageUpload={true}
        >
          <InputEnhancements>
            <MathFormulaButton />
            <ImageUploadButton />
            <VoiceInputButton />
            <EmojiButton />
          </InputEnhancements>
          <SendButton 
            morphing 
            disabled={!hasInput}
            animation="pulse"
          />
        </AdaptiveInputBox>
        
        {/* 智能建议气泡 */}
        <FloatingSuggestions
          position="above"
          animation="bubbleUp"
          autoHide={true}
        >
          <SuggestionBubble>解释这个概念</SuggestionBubble>
          <SuggestionBubble>生成练习题</SuggestionBubble>
          <SuggestionBubble>考试技巧</SuggestionBubble>
        </FloatingSuggestions>
      </SmartInputCanvas>
    </FluidChatContainer>
    
    {/* 可折叠的上下文面板 */}
    <CollapsibleContextPanel
      position="right"
      width={300}
      collapsible
      resizable
    >
      <ContextTabs>
        <Tab icon="book">当前主题</Tab>
        <Tab icon="link">相关资源</Tab>
        <Tab icon="chart">学习进度</Tab>
        <Tab icon="history">对话历史</Tab>
      </ContextTabs>
      <ContextContent animated />
    </CollapsibleContextPanel>
  </ResizableDialogCanvas>
  
  {/* 浮动模式支持 */}
  <FloatingChatMode
    draggable
    alwaysOnTop
    minimizable
    snapToEdges
  />
</AICanvasInterface>
```

#### 多模态交互支持
```jsx
<MultiModalInteraction>
  {/* 语音输入界面 */}
  <VoiceInputCanvas>
    <WaveformVisualizer animated />
    <SpeechToTextDisplay realtime />
    <VoiceCommands>
      <Command trigger="解释">解释概念</Command>
      <Command trigger="练习">生成练习题</Command>
      <Command trigger="总结">总结要点</Command>
    </VoiceCommands>
  </VoiceInputCanvas>
  
  {/* 手写数学公式识别 */}
  <MathInputCanvas>
    <DrawingArea 
      smoothDrawing
      pressureSensitive
      gestureRecognition
    />
    <FormulaPreview realtime />
    <MathToolbar>
      <SymbolPalette />
      <UndoRedoButtons />
      <ClearButton />
    </MathToolbar>
  </MathInputCanvas>
  
  {/* 图像分析界面 */}
  <ImageAnalysisCanvas>
    <ImageDropZone 
      dragAndDrop
      pasteSupport
      cameraCapture
    />
    <AnalysisOverlay>
      <AnnotationTools />
      <OCRResults />
      <ConceptHighlights />
    </AnalysisOverlay>
  </ImageAnalysisCanvas>
</MultiModalInteraction>
```

### 4. 导航系统重构

#### 简化的全局导航
```jsx
<GlobalNavigation>
  <NavBrand>
    <Logo />
    <BrandName>CIE Copilot</BrandName>
  </NavBrand>
  
  <NavItems>
    <NavItem href="/subjects">学科</NavItem>
    <NavItem href="/ai-assistant">AI助手</NavItem>
    <NavItem href="/progress">学习进度</NavItem>
  </NavItems>
  
  <NavActions>
    <SearchTrigger />
    <ThemeToggle />
    <UserMenu />
  </NavActions>
</GlobalNavigation>
```

## Data Models

### 用户学习状态模型
```typescript
interface UserLearningState {
  userId: string;
  subjects: {
    [subjectId: string]: {
      progress: number; // 0-100
      completedTopics: string[];
      currentTopic?: string;
      lastAccessed: Date;
      studyTime: number; // minutes
    }
  };
  aiInteractions: {
    totalQuestions: number;
    favoriteTopics: string[];
    learningStyle: 'visual' | 'textual' | 'interactive';
  };
}
```

### 内容展示模型
```typescript
interface ContentDisplayModel {
  id: string;
  title: string;
  subject: 'mathematics' | 'further-mathematics' | 'physics';
  difficulty: 'foundation' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  prerequisites: string[];
  learningObjectives: string[];
  content: {
    theory: string;
    examples: Example[];
    exercises: Exercise[];
  };
  aiContext: {
    keyTerms: string[];
    commonMistakes: string[];
    examTips: string[];
  };
}
```

## Error Handling

### 用户体验优先的错误处理

#### 网络错误处理
```jsx
<ErrorBoundary>
  <NetworkErrorHandler>
    <RetryMechanism maxAttempts={3} />
    <OfflineMode>
      <CachedContent />
      <OfflineIndicator />
    </OfflineMode>
  </NetworkErrorHandler>
</ErrorBoundary>
```

#### AI服务错误处理
```jsx
<AIErrorHandler>
  <ServiceUnavailable>
    <FallbackMessage>
      AI助手暂时不可用，您可以浏览学习资料或稍后重试
    </FallbackMessage>
    <AlternativeActions>
      <BrowseTopicsButton />
      <ContactSupportButton />
    </AlternativeActions>
  </ServiceUnavailable>
</AIErrorHandler>
```

#### 内容加载错误
```jsx
<ContentErrorHandler>
  <LoadingStates>
    <SkeletonLoader />
    <ProgressIndicator />
  </LoadingStates>
  
  <ErrorStates>
    <ContentNotFound>
      <SuggestedAlternatives />
    </ContentNotFound>
    <LoadingTimeout>
      <RetryButton />
    </LoadingTimeout>
  </ErrorStates>
</ContentErrorHandler>
```

## Testing Strategy

### 视觉回归测试
- 使用Chromatic进行组件视觉测试
- 确保设计系统一致性
- 多设备响应式测试

### 用户体验测试
```javascript
// 关键用户路径测试
describe('Core User Journeys', () => {
  test('新用户首次访问到开始学习', async () => {
    // Landing page → Subject selection → Topic access
  });
  
  test('AI助手交互流程', async () => {
    // Question input → AI response → Follow-up questions
  });
  
  test('学习进度追踪', async () => {
    // Topic completion → Progress update → Achievement unlock
  });
});
```

### 性能测试
- Core Web Vitals监控
- 首屏加载时间 < 2秒
- AI响应时间 < 3秒
- 移动端性能优化

### 可访问性测试
- WCAG 2.1 AA标准合规
- 键盘导航支持
- 屏幕阅读器兼容
- 色彩对比度检查

## 页面转场与动画系统

### 丝滑页面转场
```jsx
<PageTransitionSystem>
  {/* 路由级别的转场动画 */}
  <RouteTransitions>
    <Transition
      name="slide-fade"
      duration={600}
      easing="cubic-bezier(0.4, 0, 0.2, 1)"
    >
      <EnterAnimation>
        <SlideIn direction="right" distance={50} />
        <FadeIn delay={100} />
        <ScaleIn from={0.95} delay={200} />
      </EnterAnimation>
      <ExitAnimation>
        <SlideOut direction="left" distance={30} />
        <FadeOut />
        <ScaleOut to={1.05} />
      </ExitAnimation>
    </Transition>
  </RouteTransitions>
  
  {/* 组件级别的微交互 */}
  <MicroInteractions>
    <ButtonHover>
      <Transform scale={1.05} />
      <Shadow elevation="medium" />
      <ColorShift hue={5} />
    </ButtonHover>
    
    <CardHover>
      <Transform translateY={-8} />
      <Shadow elevation="large" />
      <BorderGlow color="primary" />
    </CardHover>
    
    <InputFocus>
      <BorderExpand width={2} />
      <LabelFloat translateY={-20} />
      <IconRotate degrees={180} />
    </InputFocus>
  </MicroInteractions>
  
  {/* 加载状态动画 */}
  <LoadingAnimations>
    <SkeletonLoader>
      <ShimmerEffect />
      <PulseAnimation />
      <GradientWave />
    </SkeletonLoader>
    
    <ContentReveal>
      <StaggeredFadeIn delay={100} />
      <SlideUpSequence />
      <TypewriterEffect />
    </ContentReveal>
  </LoadingAnimations>
</PageTransitionSystem>
```

### 响应式画布适配
```jsx
<ResponsiveCanvasSystem>
  {/* 桌面端 - 完整画布体验 */}
  <DesktopCanvas>
    <MultiPanelLayout>
      <MainCanvas resizable draggable />
      <SidePanel collapsible width="300px" />
      <FloatingToolbar position="top-right" />
    </MultiPanelLayout>
  </DesktopCanvas>
  
  {/* 平板端 - 适配触控 */}
  <TabletCanvas>
    <TouchOptimizedLayout>
      <SwipeableCanvas />
      <TouchGestures>
        <PinchToZoom />
        <SwipeToNavigate />
        <LongPressMenu />
      </TouchGestures>
    </TouchOptimizedLayout>
  </TabletCanvas>
  
  {/* 移动端 - 全屏沉浸 */}
  <MobileCanvas>
    <FullscreenMode>
      <BottomSheetDialog />
      <SwipeUpToExpand />
      <HapticFeedback />
    </FullscreenMode>
  </MobileCanvas>
</ResponsiveCanvasSystem>
```

### 性能优化的动画
```jsx
<PerformantAnimations>
  {/* GPU加速的变换 */}
  <GPUAccelerated>
    <Transform3D />
    <WillChange property="transform, opacity" />
    <CompositorLayer />
  </GPUAccelerated>
  
  {/* 智能动画降级 */}
  <AdaptiveAnimations>
    <ReducedMotionSupport />
    <LowPowerModeDetection />
    <FrameRateAdaptation />
  </AdaptiveAnimations>
  
  {/* 预加载和缓存 */}
  <AnimationOptimization>
    <PreloadKeyframes />
    <AnimationPool />
    <MemoryManagement />
  </AnimationOptimization>
</PerformantAnimations>
```

## 设计系统规范

### 色彩系统
```css
:root {
  /* Primary Colors - 蓝色系 */
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  
  /* Neutral Colors - 灰色系 */
  --color-neutral-50: #f8fafc;
  --color-neutral-100: #f1f5f9;
  --color-neutral-500: #64748b;
  --color-neutral-700: #334155;
  --color-neutral-900: #0f172a;
  
  /* Semantic Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
}
```

### 排版系统
```css
/* Typography Scale */
.text-display-1 { font-size: 3.5rem; font-weight: 700; line-height: 1.1; }
.text-display-2 { font-size: 2.5rem; font-weight: 600; line-height: 1.2; }
.text-heading-1 { font-size: 2rem; font-weight: 600; line-height: 1.3; }
.text-heading-2 { font-size: 1.5rem; font-weight: 600; line-height: 1.4; }
.text-body-large { font-size: 1.125rem; font-weight: 400; line-height: 1.6; }
.text-body { font-size: 1rem; font-weight: 400; line-height: 1.6; }
.text-caption { font-size: 0.875rem; font-weight: 400; line-height: 1.5; }
```

### 间距系统
```css
/* Spacing Scale - 8px base unit */
.space-1 { margin: 0.5rem; }  /* 8px */
.space-2 { margin: 1rem; }    /* 16px */
.space-3 { margin: 1.5rem; }  /* 24px */
.space-4 { margin: 2rem; }    /* 32px */
.space-6 { margin: 3rem; }    /* 48px */
.space-8 { margin: 4rem; }    /* 64px */
.space-12 { margin: 6rem; }   /* 96px */
```

### 组件设计原则

#### 按钮系统
```jsx
// Primary Button - 主要行动召唤
<Button variant="primary" size="large">
  开始学习
</Button>

// Secondary Button - 次要操作
<Button variant="secondary" size="medium">
  了解更多
</Button>

// Ghost Button - 轻量级操作
<Button variant="ghost" size="small">
  取消
</Button>
```

#### 卡片系统
```jsx
// Content Card - 内容展示
<Card variant="content" elevation="subtle">
  <CardHeader />
  <CardBody />
  <CardActions />
</Card>

// Feature Card - 功能展示
<Card variant="feature" elevation="medium">
  <FeatureIcon />
  <FeatureTitle />
  <FeatureDescription />
</Card>
```

这个设计文档为CIE Copilot网站重构提供了全面的设计指导，重点关注简洁性、专业性和用户体验优化。