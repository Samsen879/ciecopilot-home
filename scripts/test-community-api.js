// 社区系统API测试脚本
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 测试配置
const TEST_CONFIG = {
  testUser: {
    email: 'test@example.com',
    password: 'testpassword123',
    name: 'Test User'
  },
  testQuestion: {
    title: 'Test Question for API Testing',
    content: 'This is a test question to verify the community API functionality.',
    subject_code: '9709',
    tags: ['test', 'api'],
    difficulty_level: 'intermediate'
  },
  testAnswer: {
    content: 'This is a test answer to verify the community API functionality.',
    is_best_answer: false
  }
};

// 辅助函数
class APITester {
  constructor() {
    this.authToken = null;
    this.testUserId = null;
    this.testQuestionId = null;
    this.testAnswerId = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE}/api${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json();
      return {
        status: response.status,
        data,
        ok: response.ok
      };
    } catch (error) {
      return {
        status: 500,
        data: { error: error.message },
        ok: false
      };
    }
  }

  async test(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      await testFn();
      console.log(`✅ ${name} - PASSED`);
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASSED' });
    } catch (error) {
      console.log(`❌ ${name} - FAILED: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAILED', error: error.message });
    }
  }

  async setupTestUser() {
    console.log('\n🔧 Setting up test user...');
    
    // 创建测试用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password,
      options: {
        data: {
          name: TEST_CONFIG.testUser.name
        }
      }
    });

    if (authError && !authError.message.includes('already registered')) {
      throw new Error(`Failed to create test user: ${authError.message}`);
    }

    // 登录获取token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password
    });

    if (signInError) {
      throw new Error(`Failed to sign in test user: ${signInError.message}`);
    }

    this.authToken = signInData.session.access_token;
    this.testUserId = signInData.user.id;
    
    console.log(`✅ Test user setup complete. User ID: ${this.testUserId}`);
  }

  async cleanupTestData() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // 删除测试数据
      if (this.testAnswerId) {
        await supabase.from('community_answers').delete().eq('id', this.testAnswerId);
      }
      if (this.testQuestionId) {
        await supabase.from('community_questions').delete().eq('id', this.testQuestionId);
      }
      
      // 删除测试用户的社区档案
      if (this.testUserId) {
        await supabase.from('user_community_profiles').delete().eq('user_id', this.testUserId);
        await supabase.from('community_interactions').delete().eq('user_id', this.testUserId);
        await supabase.from('user_badges').delete().eq('user_id', this.testUserId);
        await supabase.from('reputation_history').delete().eq('user_id', this.testUserId);
      }
      
      console.log('✅ Test data cleanup complete');
    } catch (error) {
      console.log(`⚠️ Cleanup warning: ${error.message}`);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Community API Tests\n');
    console.log('=' .repeat(50));

    try {
      await this.setupTestUser();

      // 测试问题相关API
      await this.test('Create Question', async () => {
        const response = await this.makeRequest('/community/questions', {
          method: 'POST',
          body: JSON.stringify({
            ...TEST_CONFIG.testQuestion,
            author_id: this.testUserId
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        this.testQuestionId = response.data.question.id;
        console.log(`   Question ID: ${this.testQuestionId}`);
      });

      await this.test('Get Questions List', async () => {
        const response = await this.makeRequest('/community/questions');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        if (!Array.isArray(response.data.questions)) {
          throw new Error('Response should contain questions array');
        }
        
        console.log(`   Found ${response.data.questions.length} questions`);
      });

      await this.test('Get Question by ID', async () => {
        if (!this.testQuestionId) throw new Error('No test question ID available');
        
        const response = await this.makeRequest(`/community/questions/${this.testQuestionId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        if (response.data.question.id !== this.testQuestionId) {
          throw new Error('Returned question ID does not match requested ID');
        }
      });

      // 测试回答相关API
      await this.test('Create Answer', async () => {
        if (!this.testQuestionId) throw new Error('No test question ID available');
        
        const response = await this.makeRequest('/community/answers', {
          method: 'POST',
          body: JSON.stringify({
            ...TEST_CONFIG.testAnswer,
            question_id: this.testQuestionId,
            author_id: this.testUserId
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        this.testAnswerId = response.data.answer.id;
        console.log(`   Answer ID: ${this.testAnswerId}`);
      });

      await this.test('Get Answers for Question', async () => {
        if (!this.testQuestionId) throw new Error('No test question ID available');
        
        const response = await this.makeRequest(`/community/answers?question_id=${this.testQuestionId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        if (!Array.isArray(response.data.answers)) {
          throw new Error('Response should contain answers array');
        }
      });

      // 测试互动相关API
      await this.test('Create Interaction (Upvote)', async () => {
        if (!this.testQuestionId) throw new Error('No test question ID available');
        
        const response = await this.makeRequest('/community/interactions', {
          method: 'POST',
          body: JSON.stringify({
            contentType: 'question',
            contentId: this.testQuestionId,
            interactionType: 'upvote'
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
      });

      await this.test('Get User Interactions', async () => {
        const response = await this.makeRequest('/community/interactions');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        if (!Array.isArray(response.data.interactions)) {
          throw new Error('Response should contain interactions array');
        }
      });

      // 测试用户档案API
      await this.test('Get User Profile', async () => {
        const response = await this.makeRequest(`/community/users/${this.testUserId}/profile`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        if (!response.data.profile) {
          throw new Error('Response should contain profile data');
        }
      });

      // 测试徽章API
      await this.test('Get User Badges', async () => {
        const response = await this.makeRequest(`/community/badges/${this.testUserId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        if (!response.data.badges) {
          throw new Error('Response should contain badges data');
        }
      });

      // 测试声誉API
      await this.test('Get User Reputation', async () => {
        const response = await this.makeRequest(`/community/reputation/${this.testUserId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        if (typeof response.data.reputation.current_score !== 'number') {
          throw new Error('Response should contain numeric reputation score');
        }
      });

      // 测试健康检查
      await this.test('Health Check', async () => {
        const response = await this.makeRequest('/community/health');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
        }
        
        if (response.data.status !== 'ok') {
          throw new Error('Health check should return status: ok');
        }
      });

    } finally {
      await this.cleanupTestData();
    }

    this.printResults();
  }

  printResults() {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('=' .repeat(50));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n🏁 Testing Complete!');
    
    // 退出码
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new APITester();
  tester.runAllTests().catch(error => {
    console.error('\n💥 Test runner failed:', error);
    process.exit(1);
  });
}

export default APITester;