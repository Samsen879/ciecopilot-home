// /api/user-profile.js
// Vercel serverless function for user profile management

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extract authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or invalid authorization header',
        userMessage: '请先登录后再操作。'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify user token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid token',
        userMessage: '登录已过期，请重新登录。'
      });
    }

    const userId = user.id;

    switch (req.method) {
      case 'GET':
        return await handleGetProfile(req, res, userId);
      case 'PUT':
        return await handleUpdateProfile(req, res, userId);
      case 'POST':
        return await handleCreateProfile(req, res, userId);
      default:
        return res.status(405).json({ 
          error: 'Method not allowed', 
          message: `Method ${req.method} not supported`,
          userMessage: '请求方法不支持。'
        });
    }
  } catch (error) {
    console.error('User profile API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      userMessage: '服务器内部错误，请稍后重试。'
    });
  }
}

// Get user profile
async function handleGetProfile(req, res, userId) {
  try {
    // Get basic profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    // Get learning preferences from user_profiles.preferences
    const learningPreferences = profile?.preferences || {};

    // Get study statistics
    const { data: stats, error: statsError } = await supabase
      .from('study_statistics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.warn('Failed to fetch study statistics:', statsError);
    }

    // Get learning goals
    const { data: goals, error: goalsError } = await supabase
      .from('learning_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (goalsError) {
      console.warn('Failed to fetch learning goals:', goalsError);
    }

    return res.status(200).json({
      success: true,
      data: {
        profile: profile || {
          id: userId,
          name: null,
          avatar_url: null,
          school: null,
          grade_level: null,
          subjects: [],
          preferences: {}
        },
        learningPreferences,
        statistics: stats || {
          total_study_time: 0,
          topics_completed: 0,
          average_accuracy: 0,
          streak_days: 0
        },
        goals: goals || []
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch profile', 
      message: error.message,
      userMessage: '获取用户档案失败，请稍后重试。'
    });
  }
}

// Update user profile
async function handleUpdateProfile(req, res, userId) {
  try {
    const { 
      name, 
      avatar_url, 
      school, 
      grade_level, 
      subjects, 
      learningPreferences,
      goals 
    } = req.body;

    // Update basic profile
    const profileUpdates = {};
    if (name !== undefined) profileUpdates.name = name;
    if (avatar_url !== undefined) profileUpdates.avatar_url = avatar_url;
    if (school !== undefined) profileUpdates.school = school;
    if (grade_level !== undefined) profileUpdates.grade_level = grade_level;
    if (subjects !== undefined) profileUpdates.subjects = subjects;
    if (learningPreferences !== undefined) {
      profileUpdates.preferences = learningPreferences;
    }

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          ...profileUpdates,
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        throw profileError;
      }
    }

    // Update learning goals if provided
    if (goals && Array.isArray(goals)) {
      // Delete existing goals
      await supabase
        .from('learning_goals')
        .delete()
        .eq('user_id', userId);

      // Insert new goals
      if (goals.length > 0) {
        const goalsToInsert = goals.map(goal => ({
          user_id: userId,
          subject_code: goal.subject_code,
          target_grade: goal.target_grade,
          target_date: goal.target_date,
          description: goal.description,
          is_active: goal.is_active !== false
        }));

        const { error: goalsError } = await supabase
          .from('learning_goals')
          .insert(goalsToInsert);

        if (goalsError) {
          console.warn('Failed to update learning goals:', goalsError);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      userMessage: '用户档案更新成功。'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ 
      error: 'Failed to update profile', 
      message: error.message,
      userMessage: '更新用户档案失败，请稍后重试。'
    });
  }
}

// Create user profile (for new users)
async function handleCreateProfile(req, res, userId) {
  try {
    const { 
      name, 
      avatar_url, 
      school, 
      grade_level, 
      subjects, 
      learningPreferences 
    } = req.body;

    // Create profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        name: name || null,
        avatar_url: avatar_url || null,
        school: school || null,
        grade_level: grade_level || null,
        subjects: subjects || [],
        preferences: learningPreferences || {}
      });

    if (profileError) {
      throw profileError;
    }

    // Initialize study statistics
    const { error: statsError } = await supabase
      .from('study_statistics')
      .insert({
        user_id: userId,
        total_study_time: 0,
        topics_completed: 0,
        average_accuracy: 0,
        streak_days: 0,
        last_study_date: null,
        weekly_goals: {},
        monthly_summary: {}
      });

    if (statsError) {
      console.warn('Failed to initialize study statistics:', statsError);
    }

    return res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      userMessage: '用户档案创建成功。'
    });
  } catch (error) {
    console.error('Create profile error:', error);
    return res.status(500).json({ 
      error: 'Failed to create profile', 
      message: error.message,
      userMessage: '创建用户档案失败，请稍后重试。'
    });
  }
}