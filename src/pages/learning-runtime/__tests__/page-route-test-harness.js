import { jest } from '@jest/globals';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SourceTextModule, SyntheticModule } from 'node:vm';

const require = createRequire(import.meta.url);
const vitePackagePath = require.resolve('vite/package.json');
const viteNodeApiPath = path.join(path.dirname(vitePackagePath), 'dist/node/index.js');
const { transformWithEsbuild } = await import(pathToFileURL(viteNodeApiPath).href);

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '../../../..');
const SESSION_PAGE_PATH = path.join(REPO_ROOT, 'src/pages/learning-runtime/LearningSessionPage.jsx');
const WORKSPACE_PAGE_PATH = path.join(REPO_ROOT, 'src/pages/learning-runtime/TopicWorkspacePage.jsx');

function createSyntheticModule(exportsByName) {
  const exportNames = Object.keys(exportsByName);
  return new SyntheticModule(exportNames, function setSyntheticExports() {
    exportNames.forEach((exportName) => {
      this.setExport(exportName, exportsByName[exportName]);
    });
  });
}

function hasChangedDeps(previousDeps, nextDeps) {
  if (!previousDeps || !nextDeps) {
    return true;
  }

  if (previousDeps.length !== nextDeps.length) {
    return true;
  }

  return nextDeps.some((value, index) => !Object.is(value, previousDeps[index]));
}

class HookRuntime {
  constructor() {
    this.reset();
  }

  reset() {
    this.component = null;
    this.tree = null;
    this.hookIndex = 0;
    this.states = [];
    this.refs = [];
    this.effects = [];
    this.pendingEffectIndexes = new Set();
    this.needsRender = false;
  }

  useState(initialValue) {
    const hookIndex = this.hookIndex;
    this.hookIndex += 1;

    if (!Object.prototype.hasOwnProperty.call(this.states, hookIndex)) {
      this.states[hookIndex] = typeof initialValue === 'function'
        ? initialValue()
        : initialValue;
    }

    const setState = (nextValue) => {
      this.states[hookIndex] = typeof nextValue === 'function'
        ? nextValue(this.states[hookIndex])
        : nextValue;
      this.needsRender = true;
    };

    return [this.states[hookIndex], setState];
  }

  useRef(initialValue) {
    const hookIndex = this.hookIndex;
    this.hookIndex += 1;

    if (!this.refs[hookIndex]) {
      this.refs[hookIndex] = {
        current: initialValue,
      };
    }

    return this.refs[hookIndex];
  }

  useEffect(callback, deps) {
    const hookIndex = this.hookIndex;
    this.hookIndex += 1;

    const previous = this.effects[hookIndex];
    if (!previous || hasChangedDeps(previous.deps, deps)) {
      this.pendingEffectIndexes.add(hookIndex);
    }

    this.effects[hookIndex] = {
      callback,
      deps,
      cleanup: previous?.cleanup || null,
    };
  }

  mount(component) {
    if (this.component !== component) {
      this.reset();
      this.component = component;
    }
    this.needsRender = true;
  }

  render() {
    if (!this.component) {
      return;
    }

    this.hookIndex = 0;
    this.needsRender = false;
    this.tree = this.component();
  }

  runPendingEffects() {
    const pendingEffectIndexes = Array.from(this.pendingEffectIndexes);
    this.pendingEffectIndexes.clear();

    pendingEffectIndexes.forEach((effectIndex) => {
      const effect = this.effects[effectIndex];
      if (!effect) {
        return;
      }

      if (typeof effect.cleanup === 'function') {
        effect.cleanup();
      }

      const cleanup = effect.callback();
      effect.cleanup = typeof cleanup === 'function' ? cleanup : null;
    });
  }

  async flush() {
    for (let index = 0; index < 25; index += 1) {
      if (this.needsRender || !this.tree) {
        this.render();
      }

      const hadPendingEffects = this.pendingEffectIndexes.size > 0;
      this.runPendingEffects();

      await Promise.resolve();
      await Promise.resolve();

      if (!this.needsRender && this.pendingEffectIndexes.size === 0 && !hadPendingEffects) {
        return;
      }
    }

    throw new Error('Page route harness did not settle after 25 flush iterations.');
  }
}

function createReactMock(runtime) {
  const React = {
    Fragment: Symbol.for('react.fragment'),
    createElement(type, props, ...children) {
      const nextProps = {
        ...(props || {}),
      };

      if (children.length === 1) {
        [nextProps.children] = children;
      } else if (children.length > 1) {
        nextProps.children = children;
      }

      if (type === React.Fragment) {
        return nextProps.children || null;
      }

      if (typeof type === 'function') {
        return type(nextProps);
      }

      return {
        type,
        props: nextProps,
      };
    },
  };

  return {
    default: React,
    Fragment: React.Fragment,
    startTransition(callback) {
      callback();
    },
    useEffect: runtime.useEffect.bind(runtime),
    useRef: runtime.useRef.bind(runtime),
    useState: runtime.useState.bind(runtime),
  };
}

function createCaptureComponent(captures, captureName) {
  return function CapturedComponent(props = {}) {
    captures[captureName].push(props);
    return {
      type: captureName,
      props,
    };
  };
}

function createApiMock() {
  return {
    askInSession: jest.fn(),
    createSession: jest.fn(),
    getSession: jest.fn(),
    getWorkspace: jest.fn(),
    importQuestion: jest.fn(),
    listReviewTasks: jest.fn(),
    updateReviewTask: jest.fn(),
  };
}

function createRouterMock() {
  return {
    location: {
      pathname: '/learn/session/new',
      search: '',
      state: null,
      key: 'route-0',
    },
    navigate: jest.fn(),
    params: {},
    routeIndex: 0,
  };
}

function setRoute(router, {
  params = {},
  pathname = '/',
  search = '',
  state = null,
} = {}) {
  router.routeIndex += 1;
  router.params = params;
  router.location = {
    pathname,
    search,
    state,
    key: `route-${router.routeIndex}`,
  };
}

async function transformPageSource(filePath) {
  const source = await fs.readFile(filePath, 'utf8');
  const transformed = await transformWithEsbuild(source, filePath, {
    loader: 'jsx',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    format: 'esm',
  });

  return transformed.code;
}

function resolveSpecifier(specifier, referencingModule) {
  if (!specifier.startsWith('.')) {
    return specifier;
  }

  return path.resolve(
    path.dirname(fileURLToPath(referencingModule.identifier)),
    specifier,
  );
}

async function createModuleLoader({
  api,
  captures,
  reactMock,
  router,
}) {
  const moduleCache = new Map();
  const actualModuleCache = new Map();

  async function loadActualModule(filePath) {
    if (actualModuleCache.has(filePath)) {
      return actualModuleCache.get(filePath);
    }

    const source = await fs.readFile(filePath, 'utf8');
    const module = new SourceTextModule(source, {
      identifier: pathToFileURL(filePath).href,
    });
    actualModuleCache.set(filePath, module);
    await module.link(linker);
    await module.evaluate();
    return module;
  }

  async function createImportedQuestionIntakeModule(filePath) {
    const actualModule = await loadActualModule(filePath);
    const exportsByName = {
      default: createCaptureComponent(captures, 'ImportedQuestionIntake'),
    };

    Object.keys(actualModule.namespace).forEach((exportName) => {
      if (exportName !== 'default') {
        exportsByName[exportName] = actualModule.namespace[exportName];
      }
    });

    return createSyntheticModule(exportsByName);
  }

  async function linker(specifier, referencingModule) {
    if (specifier === 'react') {
      return createSyntheticModule(reactMock);
    }

    if (specifier === 'react-router-dom') {
      return createSyntheticModule({
        useLocation: () => router.location,
        useNavigate: () => router.navigate,
        useParams: () => router.params,
      });
    }

    if (specifier === 'lucide-react') {
      return createSyntheticModule({
        ArrowLeft: createCaptureComponent(captures, 'ArrowLeft'),
      });
    }

    const resolved = resolveSpecifier(specifier, referencingModule);

    if (resolved === path.join(REPO_ROOT, 'src/api/learningRuntimeApi.js')) {
      return createSyntheticModule(api);
    }

    if (resolved.endsWith('/components/learning-runtime/LearningSessionShell.js')) {
      return createSyntheticModule({
        default: createCaptureComponent(captures, 'LearningSessionShell'),
      });
    }

    if (resolved.endsWith('/components/learning-runtime/WorkspaceShell.js')) {
      return createSyntheticModule({
        default: createCaptureComponent(captures, 'WorkspaceShell'),
      });
    }

    if (resolved.endsWith('/components/learning-runtime/ImportPostureBanner.js')) {
      return createSyntheticModule({
        default: createCaptureComponent(captures, 'ImportPostureBanner'),
      });
    }

    if (resolved.endsWith('/components/learning-runtime/ImportedQuestionIntake.js')) {
      return createImportedQuestionIntakeModule(resolved);
    }

    if (!resolved.startsWith(REPO_ROOT)) {
      throw new Error(`Unhandled page route test import: ${specifier}`);
    }

    const source = await fs.readFile(resolved, 'utf8');
    const module = new SourceTextModule(source, {
      identifier: pathToFileURL(resolved).href,
    });
    await module.link(linker);
    return module;
  }

  async function loadPage(filePath) {
    if (moduleCache.has(filePath)) {
      return moduleCache.get(filePath);
    }

    const code = await transformPageSource(filePath);
    const module = new SourceTextModule(code, {
      identifier: pathToFileURL(filePath).href,
    });
    moduleCache.set(filePath, module);
    await module.link(linker);
    await module.evaluate();
    return module;
  }

  return {
    loadPage,
  };
}

export function createDeferred() {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}

export function getLatestCapture(harness, captureName) {
  const values = harness.captures[captureName] || [];
  const latest = values[values.length - 1];

  if (!latest) {
    throw new Error(`No ${captureName} capture is available.`);
  }

  return latest;
}

export function textContent(node) {
  if (node === null || typeof node === 'undefined' || typeof node === 'boolean') {
    return '';
  }

  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => textContent(child)).join('');
  }

  if (typeof node === 'object') {
    return textContent(node.props?.children);
  }

  return '';
}

export async function createLearningRuntimePageHarness() {
  const api = createApiMock();
  const captures = {
    ArrowLeft: [],
    ImportedQuestionIntake: [],
    ImportPostureBanner: [],
    LearningSessionShell: [],
    WorkspaceShell: [],
  };
  const router = createRouterMock();
  const runtime = new HookRuntime();
  const reactMock = createReactMock(runtime);
  const loader = await createModuleLoader({
    api,
    captures,
    reactMock,
    router,
  });
  const sessionPageModule = await loader.loadPage(SESSION_PAGE_PATH);
  const workspacePageModule = await loader.loadPage(WORKSPACE_PAGE_PATH);
  const sessionPage = sessionPageModule.namespace.default;
  const workspacePage = workspacePageModule.namespace.default;

  const harness = {
    api,
    captures,
    navigate: router.navigate,
    router,
    async flush() {
      await runtime.flush();
    },
    async renderSessionRoute({
      sessionId = 'new',
      pathname = `/learn/session/${sessionId}`,
      search = '',
      state = null,
    } = {}) {
      setRoute(router, {
        params: { sessionId },
        pathname,
        search,
        state,
      });
      runtime.mount(sessionPage);
      await runtime.flush();
    },
    async renderWorkspaceRoute({
      topicId,
      pathname = `/learn/workspace/${topicId}`,
      search = '',
      state = null,
    } = {}) {
      setRoute(router, {
        params: { topicId },
        pathname,
        search,
        state,
      });
      runtime.mount(workspacePage);
      await runtime.flush();
    },
    tree() {
      return runtime.tree;
    },
  };

  return harness;
}
