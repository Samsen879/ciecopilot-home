#!/usr/bin/env node

/**
 * API端点测试脚本
 * 测试所有API端点的基本功能
 */

import { createClient } from '@supabase/supabase-js'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// 测试用户数据
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  username: 'testuser',
  full_name: 'Test User'
}

let authToken = null
let userId = null

/**
 * 发送HTTP请求的辅助函数
 */
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  }
  
  const response = await fetch(url, { ...defaultOptions, ...options })
  const data = await response.json()
  
  return {
    status: response.status,
    ok: response.ok,
    data
  }
}

/**
 * 测试结果记录
 */
const testResults = []

function logTest(name, success, message = '') {
  const result = { name, success, message }
  testResults.push(result)
  
  const status = success ? '✅' : '❌'
  console.log(`${status} ${name}${message ? ': ' + message : ''}`)
}

/**
 * 认证系统测试
 */
async function testAuthSystem() {
  console.log('\n🔐 测试认证系统...')
  
  try {
    // 测试用户注册
    const registerResponse = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser)
    })
    
    if (registerResponse.ok) {
      logTest('用户注册', true)
      authToken = registerResponse.data.token
      userId = registerResponse.data.user.id
    } else {
      logTest('用户注册', false, registerResponse.data.message)
    }
    
    // 测试用户登录
    const loginResponse = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    })
    
    if (loginResponse.ok) {
      logTest('用户登录', true)
      authToken = loginResponse.data.token
      userId = loginResponse.data.user.id
    } else {
      logTest('用户登录', false, loginResponse.data.message)
    }
    
    // 测试Token验证
    const verifyResponse = await makeRequest('/api/auth/verify')
    logTest('Token验证', verifyResponse.ok, verifyResponse.data.message)
    
  } catch (error) {
    logTest('认证系统测试', false, error.message)
  }
}

/**
 * 用户管理系统测试
 */
async function testUserSystem() {
  console.log('\n👤 测试用户管理系统...')
  
  try {
    // 测试获取用户列表
    const usersResponse = await makeRequest('/api/users')
    logTest('获取用户列表', usersResponse.ok)
    
    // 测试获取用户资料
    if (userId) {
      const profileResponse = await makeRequest(`/api/users/profile/${userId}`)
      logTest('获取用户资料', profileResponse.ok)
      
      // 测试更新用户资料
      const updateResponse = await makeRequest(`/api/users/profile/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: 'Updated Test User',
          bio: 'This is a test user bio'
        })
      })
      logTest('更新用户资料', updateResponse.ok)
    }
    
    // 测试获取用户权限
    if (userId) {
      const permissionsResponse = await makeRequest(`/api/users/permissions/${userId}`)
      logTest('获取用户权限', permissionsResponse.ok)
    }
    
  } catch (error) {
    logTest('用户管理系统测试', false, error.message)
  }
}

/**
 * 推荐系统测试
 */
async function testRecommendationSystem() {
  console.log('\n🎯 测试推荐系统...')
  
  try {
    // 测试获取推荐内容
    const recommendationsResponse = await makeRequest('/api/recommendations')
    logTest('获取推荐内容', recommendationsResponse.ok)
    
    // 测试获取用户偏好
    const preferencesResponse = await makeRequest('/api/recommendations/preferences')
    logTest('获取用户偏好', preferencesResponse.ok)
    
    // 测试更新用户偏好
    const updatePreferencesResponse = await makeRequest('/api/recommendations/preferences', {
      method: 'POST',
      body: JSON.stringify({
        subjects: ['数学', '物理'],
        difficulty_level: 'intermediate',
        learning_style: 'visual',
        goals: ['考试准备', '技能提升']
      })
    })
    logTest('更新用户偏好', updatePreferencesResponse.ok)
    
    // 测试获取学习数据
    const learningDataResponse = await makeRequest('/api/recommendations/learning-data')
    logTest('获取学习数据', learningDataResponse.ok)
    
    // 测试推荐反馈
    const feedbackResponse = await makeRequest('/api/recommendations/feedback', {
      method: 'POST',
      body: JSON.stringify({
        content_id: 'test-content-1',
        content_type: 'article',
        feedback_type: 'like',
        rating: 5
      })
    })
    logTest('推荐反馈', feedbackResponse.ok)
    
  } catch (error) {
    logTest('推荐系统测试', false, error.message)
  }
}

/**
 * 社区系统测试
 */
async function testCommunitySystem() {
  console.log('\n💬 测试社区系统...')
  
  let questionId = null
  let answerId = null
  
  try {
    // 测试获取问题列表
    const questionsResponse = await makeRequest('/api/community/questions')
    logTest('获取问题列表', questionsResponse.ok)
    
    // 测试创建问题
    const createQuestionResponse = await makeRequest('/api/community/questions', {
      method: 'POST',
      body: JSON.stringify({
        title: '测试问题标题',
        content: '这是一个测试问题的内容',
        tags: ['测试', '问题'],
        subject: '数学'
      })
    })
    
    if (createQuestionResponse.ok) {
      logTest('创建问题', true)
      questionId = createQuestionResponse.data.question.id
    } else {
      logTest('创建问题', false, createQuestionResponse.data.message)
    }
    
    // 测试获取问题详情
    if (questionId) {
      const questionDetailResponse = await makeRequest(`/api/community/questions/${questionId}`)
      logTest('获取问题详情', questionDetailResponse.ok)
    }
    
    // 测试创建回答
    if (questionId) {
      const createAnswerResponse = await makeRequest('/api/community/answers', {
        method: 'POST',
        body: JSON.stringify({
          question_id: questionId,
          content: '这是一个测试回答的内容'
        })
      })
      
      if (createAnswerResponse.ok) {
        logTest('创建回答', true)
        answerId = createAnswerResponse.data.answer.id
      } else {
        logTest('创建回答', false, createAnswerResponse.data.message)
      }
    }
    
    // 测试获取回答列表
    if (questionId) {
      const answersResponse = await makeRequest(`/api/community/answers?question_id=${questionId}`)
      logTest('获取回答列表', answersResponse.ok)
    }
    
    // 测试互动功能（点赞）
    if (questionId) {
      const interactionResponse = await makeRequest('/api/community/interactions', {
        method: 'POST',
        body: JSON.stringify({
          content_type: 'question',
          content_id: questionId,
          interaction_type: 'vote',
          vote_type: 'up'
        })
      })
      logTest('问题点赞', interactionResponse.ok)
    }
    
    // 测试收藏功能
    if (questionId) {
      const bookmarkResponse = await makeRequest('/api/community/interactions', {
        method: 'POST',
        body: JSON.stringify({
          content_type: 'question',
          content_id: questionId,
          interaction_type: 'bookmark'
        })
      })
      logTest('问题收藏', bookmarkResponse.ok)
    }
    
  } catch (error) {
    logTest('社区系统测试', false, error.message)
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  console.log('\n🧹 清理测试数据...')
  
  try {
    // 删除测试用户（如果有权限）
    if (userId) {
      const deleteUserResponse = await makeRequest(`/api/users/${userId}`, {
        method: 'DELETE'
      })
      logTest('清理测试用户', deleteUserResponse.ok)
    }
  } catch (error) {
    logTest('清理测试数据', false, error.message)
  }
}

/**
 * 生成测试报告
 */
function generateTestReport() {
  console.log('\n📊 测试报告')
  console.log('=' * 50)
  
  const totalTests = testResults.length
  const passedTests = testResults.filter(r => r.success).length
  const failedTests = totalTests - passedTests
  const successRate = ((passedTests / totalTests) * 100).toFixed(2)
  
  console.log(`总测试数: ${totalTests}`)
  console.log(`通过: ${passedTests}`)
  console.log(`失败: ${failedTests}`)
  console.log(`成功率: ${successRate}%`)
  
  if (failedTests > 0) {
    console.log('\n❌ 失败的测试:')
    testResults
      .filter(r => !r.success)
      .forEach(r => console.log(`  - ${r.name}: ${r.message}`))
  }
  
  console.log('\n' + '=' * 50)
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始API端点测试...')
  console.log(`API基础URL: ${API_BASE_URL}`)
  
  try {
    await testAuthSystem()
    await testUserSystem()
    await testRecommendationSystem()
    await testCommunitySystem()
    await cleanupTestData()
    
    generateTestReport()
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message)
    process.exit(1)
  }
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
}

export { runTests, testResults }