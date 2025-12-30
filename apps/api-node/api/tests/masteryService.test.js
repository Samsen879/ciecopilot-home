// MasteryService单元测试套件
// 测试ELO风格掌握度评估算法的所有功能

import { jest } from '@jest/globals';
import { MasteryService } from '../services/masteryService.js';

describe('MasteryService', () => {
  let masteryService;
  
  beforeEach(() => {
    masteryService = new MasteryService();
  });
  
  describe('构造函数和初始化', () => {
    test('应该使用默认配置初始化', () => {
      expect(masteryService.config).toEqual({
        mastery_init: 0.3,
        K_base: 0.08,
        difficulty: {
          easy: 0.3,
          medium: 0.5,
          hard: 0.7
        },
        confidence: {
          time_weight: 0.3,
          switch_weight: 0.7,
          max_time: 30000,
          max_switches: 10
        },
        review: {
          base_interval: 24 * 60 * 60 * 1000,
          mastery_threshold: 0.7,
          decay_rate: 0.1
        }
      });
    });
    
    test('应该接受自定义配置', () => {
      const customConfig = {
        mastery_init: 0.4,
        K_base: 0.1
      };
      const service = new MasteryService(customConfig);
      expect(service.config.mastery_init).toBe(0.4);
      expect(service.config.K_base).toBe(0.1);
      expect(service.config.difficulty.easy).toBe(0.3); // 默认值保持
    });
  });
  
  describe('calculateExpectedScore', () => {
    test('应该正确计算期望分数', () => {
      const mastery = 0.5;
      const difficulty = 0.3;
      const expected = masteryService.calculateExpectedScore(mastery, difficulty);
      
      // 使用ELO公式: 1 / (1 + 10^((difficulty - mastery) / 0.4))
      const expectedValue = 1 / (1 + Math.pow(10, (difficulty - mastery) / 0.4));
      expect(expected).toBeCloseTo(expectedValue, 5);
    });
    
    test('边界条件测试', () => {
      expect(masteryService.calculateExpectedScore(0, 0)).toBeCloseTo(0.5, 5);
      expect(masteryService.calculateExpectedScore(1, 0)).toBeCloseTo(1, 2);
      expect(masteryService.calculateExpectedScore(0, 1)).toBeCloseTo(0, 2);
    });
  });
  
  describe('calculateConfidenceCoefficient', () => {
    test('应该基于响应时间和切换次数计算置信度', () => {
      const responseTime = 5000; // 5秒
      const switchCount = 2;
      
      const confidence = masteryService.calculateConfidenceCoefficient(responseTime, switchCount);
      
      // 验证置信度在0-1范围内
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
    
    test('快速响应和少切换应该有高置信度', () => {
      const fastResponse = masteryService.calculateConfidenceCoefficient(1000, 0);
      const slowResponse = masteryService.calculateConfidenceCoefficient(20000, 5);
      
      expect(fastResponse).toBeGreaterThan(slowResponse);
    });
    
    test('边界条件测试', () => {
      // 最快响应，无切换
      const maxConfidence = masteryService.calculateConfidenceCoefficient(0, 0);
      expect(maxConfidence).toBe(1);
      
      // 超时响应，最大切换
      const minConfidence = masteryService.calculateConfidenceCoefficient(50000, 20);
      expect(minConfidence).toBeGreaterThan(0);
    });
  });
  
  describe('calculateKFactor', () => {
    test('应该基于难度和置信度计算K因子', () => {
      const difficulty = 0.5;
      const confidence = 0.8;
      
      const kFactor = masteryService.calculateKFactor(difficulty, confidence);
      
      // K因子应该在合理范围内
      expect(kFactor).toBeGreaterThan(0);
      expect(kFactor).toBeLessThan(1);
    });
    
    test('高难度和低置信度应该有更高的K因子', () => {
      const highDiffLowConf = masteryService.calculateKFactor(0.8, 0.3);
      const lowDiffHighConf = masteryService.calculateKFactor(0.2, 0.9);
      
      expect(highDiffLowConf).toBeGreaterThan(lowDiffHighConf);
    });
  });
  
  describe('calculateNewMastery', () => {
    test('应该正确计算新的掌握度分数', () => {
      const currentMastery = 0.5;
      const difficulty = 0.4;
      const result = 1; // 正确答案
      const responseTime = 3000;
      const switchCount = 1;
      
      const newMastery = masteryService.calculateNewMastery(
        currentMastery,
        difficulty,
        result,
        responseTime,
        switchCount
      );
      
      // 正确答案应该提高掌握度
      expect(newMastery).toBeGreaterThan(currentMastery);
      expect(newMastery).toBeGreaterThanOrEqual(0);
      expect(newMastery).toBeLessThanOrEqual(1);
    });
    
    test('错误答案应该降低掌握度', () => {
      const currentMastery = 0.6;
      const difficulty = 0.4;
      const result = 0; // 错误答案
      
      const newMastery = masteryService.calculateNewMastery(
        currentMastery,
        difficulty,
        result,
        5000,
        2
      );
      
      expect(newMastery).toBeLessThan(currentMastery);
    });
    
    test('边界条件测试', () => {
      // 最低掌握度，错误答案
      const minMastery = masteryService.calculateNewMastery(0, 0.5, 0, 10000, 5);
      expect(minMastery).toBeGreaterThanOrEqual(0);
      
      // 最高掌握度，正确答案
      const maxMastery = masteryService.calculateNewMastery(1, 0.5, 1, 1000, 0);
      expect(maxMastery).toBeLessThanOrEqual(1);
    });
  });
  
  describe('calculateTimeDecayWeight', () => {
    test('应该基于时间间隔计算衰减权重', () => {
      const lastReview = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7天前
      const weight = masteryService.calculateTimeDecayWeight(lastReview);
      
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThanOrEqual(1);
    });
    
    test('更长时间间隔应该有更低的权重', () => {
      const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1天前
      const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30天前
      
      const recentWeight = masteryService.calculateTimeDecayWeight(recent);
      const oldWeight = masteryService.calculateTimeDecayWeight(old);
      
      expect(recentWeight).toBeGreaterThan(oldWeight);
    });
  });
  
  describe('calculateReviewWeight', () => {
    test('应该综合考虑掌握度和时间衰减计算复习权重', () => {
      const mastery = 0.4;
      const lastReview = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3天前
      
      const weight = masteryService.calculateReviewWeight(mastery, lastReview);
      
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThanOrEqual(2); // 最大权重为2
    });
    
    test('低掌握度应该有更高的复习权重', () => {
      const lastReview = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const lowMasteryWeight = masteryService.calculateReviewWeight(0.2, lastReview);
      const highMasteryWeight = masteryService.calculateReviewWeight(0.8, lastReview);
      
      expect(lowMasteryWeight).toBeGreaterThan(highMasteryWeight);
    });
  });
  
  describe('calculateNextReviewTime', () => {
    test('应该基于掌握度计算下次复习时间', () => {
      const mastery = 0.6;
      const nextReview = masteryService.calculateNextReviewTime(mastery);
      
      expect(nextReview).toBeInstanceOf(Date);
      expect(nextReview.getTime()).toBeGreaterThan(Date.now());
    });
    
    test('高掌握度应该有更长的复习间隔', () => {
      const lowMasteryTime = masteryService.calculateNextReviewTime(0.3);
      const highMasteryTime = masteryService.calculateNextReviewTime(0.8);
      
      expect(highMasteryTime.getTime()).toBeGreaterThan(lowMasteryTime.getTime());
    });
  });
  
  describe('批量计算功能', () => {
    test('calculateBatchMastery应该处理多个计算', () => {
      const calculations = [
        {
          currentMastery: 0.5,
          difficulty: 0.4,
          result: 1,
          responseTime: 3000,
          switchCount: 1
        },
        {
          currentMastery: 0.3,
          difficulty: 0.6,
          result: 0,
          responseTime: 8000,
          switchCount: 3
        }
      ];
      
      const results = masteryService.calculateBatchMastery(calculations);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('newMastery');
      expect(results[0]).toHaveProperty('kFactor');
      expect(results[0]).toHaveProperty('confidence');
      expect(results[1]).toHaveProperty('newMastery');
    });
    
    test('空数组应该返回空结果', () => {
      const results = masteryService.calculateBatchMastery([]);
      expect(results).toEqual([]);
    });
  });
  
  describe('性能测试', () => {
    test('单次计算应该在10ms内完成', () => {
      const start = performance.now();
      
      masteryService.calculateNewMastery(0.5, 0.4, 1, 3000, 1);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(duration).toBeLessThan(10);
    });
    
    test('批量计算100次应该在合理时间内完成', () => {
      const calculations = Array(100).fill({
        currentMastery: 0.5,
        difficulty: 0.4,
        result: 1,
        responseTime: 3000,
        switchCount: 1
      });
      
      const start = performance.now();
      masteryService.calculateBatchMastery(calculations);
      const end = performance.now();
      
      const duration = end - start;
      expect(duration).toBeLessThan(100); // 100ms内完成100次计算
    });
  });
  
  describe('算法正确性验证', () => {
    test('ELO算法应该符合数学期望', () => {
      const mastery = 0.5;
      const difficulty = 0.5;
      const result = 1;
      
      const expected = masteryService.calculateExpectedScore(mastery, difficulty);
      const kFactor = masteryService.calculateKFactor(difficulty, 0.8);
      const newMastery = masteryService.calculateNewMastery(mastery, difficulty, result, 3000, 1);
      
      // 验证ELO公式: newMastery = mastery + K * (result - expected)
      const calculatedMastery = mastery + kFactor * (result - expected);
      expect(newMastery).toBeCloseTo(calculatedMastery, 3);
    });
    
    test('连续正确答案应该逐步提高掌握度', () => {
      let currentMastery = 0.3;
      const difficulty = 0.5;
      
      for (let i = 0; i < 5; i++) {
        const newMastery = masteryService.calculateNewMastery(
          currentMastery,
          difficulty,
          1, // 正确答案
          2000,
          0
        );
        expect(newMastery).toBeGreaterThan(currentMastery);
        currentMastery = newMastery;
      }
    });
    
    test('连续错误答案应该逐步降低掌握度', () => {
      let currentMastery = 0.8;
      const difficulty = 0.5;
      
      for (let i = 0; i < 5; i++) {
        const newMastery = masteryService.calculateNewMastery(
          currentMastery,
          difficulty,
          0, // 错误答案
          8000,
          3
        );
        expect(newMastery).toBeLessThan(currentMastery);
        currentMastery = newMastery;
      }
    });
  });
  
  describe('边界条件和异常处理', () => {
    test('应该处理无效输入', () => {
      expect(() => {
        masteryService.calculateNewMastery(-1, 0.5, 1, 3000, 1);
      }).not.toThrow();
      
      expect(() => {
        masteryService.calculateNewMastery(2, 0.5, 1, 3000, 1);
      }).not.toThrow();
    });
    
    test('应该处理极端值', () => {
      const result1 = masteryService.calculateNewMastery(0, 1, 0, 100000, 50);
      const result2 = masteryService.calculateNewMastery(1, 0, 1, 0, 0);
      
      expect(result1).toBeGreaterThanOrEqual(0);
      expect(result1).toBeLessThanOrEqual(1);
      expect(result2).toBeGreaterThanOrEqual(0);
      expect(result2).toBeLessThanOrEqual(1);
    });
    
    test('应该处理NaN和undefined输入', () => {
      const result = masteryService.calculateNewMastery(
        NaN,
        undefined,
        null,
        'invalid',
        {}
      );
      
      expect(typeof result).toBe('number');
      expect(isNaN(result)).toBe(false);
    });
  });
});

// 集成测试
describe('MasteryService集成测试', () => {
  let masteryService;
  
  beforeEach(() => {
    masteryService = new MasteryService();
  });
  
  test('完整的学习会话模拟', () => {
    // 模拟一个完整的学习会话
    let mastery = 0.3; // 初始掌握度
    const difficulty = 0.5;
    const session = [
      { result: 1, time: 2000, switches: 0 }, // 快速正确
      { result: 0, time: 8000, switches: 3 }, // 慢速错误
      { result: 1, time: 3000, switches: 1 }, // 中等正确
      { result: 1, time: 2500, switches: 0 }, // 快速正确
      { result: 1, time: 2200, switches: 0 }  // 快速正确
    ];
    
    const masteryHistory = [mastery];
    
    session.forEach(answer => {
      mastery = masteryService.calculateNewMastery(
        mastery,
        difficulty,
        answer.result,
        answer.time,
        answer.switches
      );
      masteryHistory.push(mastery);
    });
    
    // 验证掌握度总体上升趋势（4个正确，1个错误）
    expect(masteryHistory[masteryHistory.length - 1]).toBeGreaterThan(masteryHistory[0]);
    
    // 验证每次计算都在有效范围内
    masteryHistory.forEach(m => {
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1);
    });
  });
});