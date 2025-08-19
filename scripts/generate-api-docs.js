#!/usr/bin/env node

/**
 * API文档生成脚本
 * 自动扫描API文件并生成文档
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const apiDir = path.join(projectRoot, 'api')
const docsDir = path.join(projectRoot, 'docs')

/**
 * API端点信息
 */
const apiEndpoints = {
  auth: {
    title: '认证系统 API',
    description: '用户认证、注册、登录相关接口',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/register',
        description: '用户注册',
        body: {
          email: 'string (required)',
          password: 'string (required)',
          username: 'string (required)',
          full_name: 'string (optional)'
        },
        response: {
          success: {
            token: 'string',
            user: 'object',
            message: 'string'
          },
          error: {
            message: 'string',
            errors: 'array'
          }
        }
      },
      {
        method: 'POST',
        path: '/api/auth/login',
        description: '用户登录',
        body: {
          email: 'string (required)',
          password: 'string (required)'
        },
        response: {
          success: {
            token: 'string',
            user: 'object',
            message: 'string'
          }
        }
      },
      {
        method: 'POST',
        path: '/api/auth/refresh',
        description: '刷新访问令牌',
        headers: {
          Authorization: 'Bearer <refresh_token>'
        },
        response: {
          success: {
            token: 'string',
            message: 'string'
          }
        }
      },
      {
        method: 'GET',
        path: '/api/auth/verify',
        description: '验证访问令牌',
        headers: {
          Authorization: 'Bearer <access_token>'
        },
        response: {
          success: {
            user: 'object',
            message: 'string'
          }
        }
      },
      {
        method: 'POST',
        path: '/api/auth/forgot-password',
        description: '请求密码重置',
        body: {
          email: 'string (required)'
        }
      },
      {
        method: 'POST',
        path: '/api/auth/reset-password',
        description: '重置密码',
        body: {
          token: 'string (required)',
          password: 'string (required)'
        }
      }
    ]
  },
  users: {
    title: '用户管理 API',
    description: '用户信息管理、权限控制相关接口',
    endpoints: [
      {
        method: 'GET',
        path: '/api/users',
        description: '获取用户列表',
        query: {
          page: 'number (optional, default: 1)',
          limit: 'number (optional, default: 20)',
          search: 'string (optional)',
          role: 'string (optional)',
          status: 'string (optional)'
        },
        headers: {
          Authorization: 'Bearer <access_token>'
        }
      },
      {
        method: 'POST',
        path: '/api/users',
        description: '创建用户（管理员）',
        headers: {
          Authorization: 'Bearer <access_token>'
        },
        body: {
          email: 'string (required)',
          password: 'string (required)',
          username: 'string (required)',
          full_name: 'string (optional)',
          role: 'string (optional)'
        }
      },
      {
        method: 'GET',
        path: '/api/users/profile/:userId',
        description: '获取用户资料',
        headers: {
          Authorization: 'Bearer <access_token>'
        }
      },
      {
        method: 'PUT',
        path: '/api/users/profile/:userId',
        description: '更新用户资料',
        headers: {
          Authorization: 'Bearer <access_token>'
        },
        body: {
          username: 'string (optional)',
          full_name: 'string (optional)',
          bio: 'string (optional)',
          location: 'string (optional)',
          website: 'string (optional)',
          avatar_url: 'string (optional)'
        }
      },
      {
        method: 'GET',
        path: '/api/users/permissions/:userId',
        description: '获取用户权限',
        headers: {
          Authorization: 'Bearer <access_token>'
        }
      },
      {
        method: 'PUT',
        path: '/api/users/permissions/:userId/role',
        description: '更新用户角色（管理员）',
        headers: {
          Authorization: 'Bearer <access_token>'
        },
        body: {
          role: 'string (required)'
        }
      }
    ]
  },
  recommendations: {
    title: '推荐系统 API',
    description: '个性化推荐、学习偏好管理相关接口',
    endpoints: [
      {
        method: 'GET',
        path: '/api/recommendations',
        description: '获取推荐内容',
        query: {
          page: 'number (optional, default: 1)',
          limit: 'number (optional, default: 10)',
          type: 'string (optional)',
          subject: 'string (optional)',
          difficulty: 'string (optional)'
        },
        headers: {
          Authorization: 'Bearer <access_token>'
        }
      },
      {
        method: 'GET',
        path: '/api/recommendations/preferences',
        description: '获取用户偏好',
        headers: {
          Authorization: 'Bearer <access_token>'
        }
      },
      {
        method: 'POST',
        path: '/api/recommendations/preferences',
        description: '创建/更新用户偏好',
        headers: {
          Authorization: 'Bearer <access_token>'
        },
        body: {
          subjects: 'array (optional)',
          difficulty_level: 'string (optional)',
          learning_style: 'string (optional)',
          goals: 'array (optional)',
          time_availability: 'object (optional)'
        }
      },
      {
        method: 'GET',
        path: '/api/recommendations/learning-data',
        description: '获取学习数据',
        headers: {
          Authorization: 'Bearer <access_token>'
        }
      },
      {
        method: 'POST',
        path: '/api/recommendations/feedback',
        description: '提交推荐反馈',
        headers: {
          Authorization: 'Bearer <access_token>'
        },
        body: {
          content_id: 'string (required)',
          content_type: 'string (required)',
          feedback_type: 'string (required)',
          rating: 'number (optional)',
          comment: 'string (optional)'
        }
      }
    ]
  },
  community: {
    title: '社区系统 API',
    description: '问答社区、用户互动相关接口',
    endpoints: [
      {
        method: 'GET',
        path: '/api/community/questions',
        description: '获取问题列表',
        query: {
          page: 'number (optional, default: 1)',
          limit: 'number (optional, default: 20)',
          search: 'string (optional)',
          tags: 'string (optional)',
          subject: 'string (optional)',
          sort: 'string (optional)',
          status: 'string (optional)'
        }
      },
      {
        method: 'POST',
        path: '/api/community/questions',
        description: '创建问题',
        headers: {
          Authorization: 'Bearer <access_token>'
        },
        body: {
          title: 'string (required)',
          content: 'string (required)',
          tags: 'array (optional)',
          subject: 'string (optional)'
        }
      },
      {
        method: 'GET',
        path: '/api/community/questions/:questionId',
        description: '获取问题详情'
      },
      {
        method: 'PUT',
        path: '/api/community/questions/:questionId',
        description: '更新问题',
        headers: {
          Authorization: 'Bearer <access_token>'
        }
      },
      {
        method: 'DELETE',
        path: '/api/community/questions/:questionId',
        description: '删除问题',
        headers: {
          Authorization: 'Bearer <access_token>'
        }
      },
      {
        method: 'GET',
        path: '/api/community/answers',
        description: '获取回答列表',
        query: {
          question_id: 'string (required)',
          page: 'number (optional)',
          limit: 'number (optional)',
          sort: 'string (optional)'
        }
      },
      {
        method: 'POST',
        path: '/api/community/answers',
        description: '创建回答',
        headers: {
          Authorization: 'Bearer <access_token>'
        },
        body: {
          question_id: 'string (required)',
          content: 'string (required)'
        }
      },
      {
        method: 'PUT',
        path: '/api/community/answers/:answerId',
        description: '更新回答',
        headers: {
          Authorization: 'Bearer <access_token>'
        }
      },
      {
        method: 'DELETE',
        path: '/api/community/answers/:answerId',
        description: '删除回答',
        headers: {
          Authorization: 'Bearer <access_token>'
        }
      },
      {
        method: 'GET',
        path: '/api/community/interactions',
        description: '获取用户互动记录',
        headers: {
          Authorization: 'Bearer <access_token>'
        }
      },
      {
        method: 'POST',
        path: '/api/community/interactions',
        description: '创建互动（点赞、收藏等）',
        headers: {
          Authorization: 'Bearer <access_token>'
        },
        body: {
          content_type: 'string (required)',
          content_id: 'string (required)',
          interaction_type: 'string (required)',
          vote_type: 'string (optional)'
        }
      },
      {
        method: 'DELETE',
        path: '/api/community/interactions/:interactionId',
        description: '删除互动',
        headers: {
          Authorization: 'Bearer <access_token>'
        }
      }
    ]
  }
}

/**
 * 生成Markdown格式的API文档
 */
function generateMarkdownDocs() {
  let markdown = '# CIE Copilot API 文档\n\n'
  markdown += '本文档描述了 CIE Copilot 后端 API 的所有可用端点。\n\n'
  markdown += '## 基础信息\n\n'
  markdown += '- **基础URL**: `http://localhost:3000` (开发环境)\n'
  markdown += '- **认证方式**: Bearer Token (JWT)\n'
  markdown += '- **内容类型**: `application/json`\n\n'
  
  // 认证说明
  markdown += '## 认证\n\n'
  markdown += '大部分API端点需要认证。在请求头中包含访问令牌：\n\n'
  markdown += '```\n'
  markdown += 'Authorization: Bearer <access_token>\n'
  markdown += '```\n\n'
  
  // 错误响应格式
  markdown += '## 错误响应格式\n\n'
  markdown += '所有错误响应都遵循以下格式：\n\n'
  markdown += '```json\n'
  markdown += '{\n'
  markdown += '  "success": false,\n'
  markdown += '  "message": "错误描述",\n'
  markdown += '  "errors": ["详细错误信息"]\n'
  markdown += '}\n'
  markdown += '```\n\n'
  
  // HTTP状态码
  markdown += '## HTTP 状态码\n\n'
  markdown += '- `200` - 成功\n'
  markdown += '- `201` - 创建成功\n'
  markdown += '- `400` - 请求参数错误\n'
  markdown += '- `401` - 未认证\n'
  markdown += '- `403` - 权限不足\n'
  markdown += '- `404` - 资源不存在\n'
  markdown += '- `429` - 请求过于频繁\n'
  markdown += '- `500` - 服务器内部错误\n\n'
  
  // 生成各模块文档
  Object.entries(apiEndpoints).forEach(([module, moduleInfo]) => {
    markdown += `## ${moduleInfo.title}\n\n`
    markdown += `${moduleInfo.description}\n\n`
    
    moduleInfo.endpoints.forEach((endpoint, index) => {
      markdown += `### ${index + 1}. ${endpoint.description}\n\n`
      markdown += `**${endpoint.method}** \`${endpoint.path}\`\n\n`
      
      if (endpoint.headers) {
        markdown += '**请求头:**\n\n'
        Object.entries(endpoint.headers).forEach(([key, value]) => {
          markdown += `- \`${key}\`: ${value}\n`
        })
        markdown += '\n'
      }
      
      if (endpoint.query) {
        markdown += '**查询参数:**\n\n'
        Object.entries(endpoint.query).forEach(([key, value]) => {
          markdown += `- \`${key}\`: ${value}\n`
        })
        markdown += '\n'
      }
      
      if (endpoint.body) {
        markdown += '**请求体:**\n\n'
        markdown += '```json\n'
        markdown += '{\n'
        Object.entries(endpoint.body).forEach(([key, value]) => {
          markdown += `  "${key}": "${value}",\n`
        })
        markdown = markdown.slice(0, -2) + '\n' // 移除最后的逗号
        markdown += '}\n'
        markdown += '```\n\n'
      }
      
      if (endpoint.response) {
        markdown += '**响应示例:**\n\n'
        if (endpoint.response.success) {
          markdown += '成功响应:\n'
          markdown += '```json\n'
          markdown += JSON.stringify(endpoint.response.success, null, 2)
          markdown += '\n```\n\n'
        }
        if (endpoint.response.error) {
          markdown += '错误响应:\n'
          markdown += '```json\n'
          markdown += JSON.stringify(endpoint.response.error, null, 2)
          markdown += '\n```\n\n'
        }
      }
      
      markdown += '---\n\n'
    })
  })
  
  return markdown
}

/**
 * 生成Postman集合
 */
function generatePostmanCollection() {
  const collection = {
    info: {
      name: 'CIE Copilot API',
      description: 'CIE Copilot 后端 API 集合',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3000',
        type: 'string'
      },
      {
        key: 'accessToken',
        value: '',
        type: 'string'
      }
    ],
    item: []
  }
  
  Object.entries(apiEndpoints).forEach(([module, moduleInfo]) => {
    const moduleItem = {
      name: moduleInfo.title,
      description: moduleInfo.description,
      item: []
    }
    
    moduleInfo.endpoints.forEach(endpoint => {
      const request = {
        method: endpoint.method,
        header: [
          {
            key: 'Content-Type',
            value: 'application/json'
          }
        ],
        url: {
          raw: `{{baseUrl}}${endpoint.path}`,
          host: ['{{baseUrl}}'],
          path: endpoint.path.split('/').filter(p => p)
        }
      }
      
      if (endpoint.headers && endpoint.headers.Authorization) {
        request.header.push({
          key: 'Authorization',
          value: 'Bearer {{accessToken}}'
        })
      }
      
      if (endpoint.body) {
        request.body = {
          mode: 'raw',
          raw: JSON.stringify(endpoint.body, null, 2)
        }
      }
      
      if (endpoint.query) {
        request.url.query = Object.entries(endpoint.query).map(([key, value]) => ({
          key,
          value: '',
          description: value
        }))
      }
      
      moduleItem.item.push({
        name: endpoint.description,
        request
      })
    })
    
    collection.item.push(moduleItem)
  })
  
  return JSON.stringify(collection, null, 2)
}

/**
 * 主函数
 */
function generateDocs() {
  console.log('🚀 开始生成API文档...')
  
  // 确保docs目录存在
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true })
  }
  
  try {
    // 生成Markdown文档
    const markdownDocs = generateMarkdownDocs()
    const markdownPath = path.join(docsDir, 'API_DOCUMENTATION.md')
    fs.writeFileSync(markdownPath, markdownDocs, 'utf8')
    console.log(`✅ Markdown文档已生成: ${markdownPath}`)
    
    // 生成Postman集合
    const postmanCollection = generatePostmanCollection()
    const postmanPath = path.join(docsDir, 'CIE_Copilot_API.postman_collection.json')
    fs.writeFileSync(postmanPath, postmanCollection, 'utf8')
    console.log(`✅ Postman集合已生成: ${postmanPath}`)
    
    console.log('\n📚 API文档生成完成！')
    console.log('\n使用方法:')
    console.log('1. 查看Markdown文档: docs/API_DOCUMENTATION.md')
    console.log('2. 导入Postman集合: docs/CIE_Copilot_API.postman_collection.json')
    
  } catch (error) {
    console.error('❌ 生成文档时发生错误:', error.message)
    process.exit(1)
  }
}

// 运行文档生成
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDocs()
}

export { generateDocs, apiEndpoints }