/**
 * SuperMemo算法单元测试
 * 测试质量评分计算和SuperMemo参数更新
 */

const { calculateQuality, updateSuperMemo, initializeSuperMemo, isDueForReview, calculateReviewPriority } = require('../unified-core/supermemo-engine');

describe('SuperMemo引擎测试', () => {
  describe('calculateQuality', () => {
    test('错误答案应该返回0-2分', () => {
      // 完全忘记（快速答错）
      expect(calculateQuality({ isCorrect: false, timeSpent: 5, isUncertain: false })).toBe(0);

      // 几乎忘记
      expect(calculateQuality({ isCorrect: false, timeSpent: 15, isUncertain: false })).toBe(1);

      // 模糊记忆（慢速答错）
      expect(calculateQuality({ isCorrect: false, timeSpent: 45, isUncertain: false })).toBe(2);
    });

    test('正确但不确定应该返回3分', () => {
      expect(calculateQuality({ isCorrect: true, timeSpent: 10, isUncertain: true })).toBe(3);
      expect(calculateQuality({ isCorrect: true, timeSpent: 100, isUncertain: true })).toBe(3);
    });

    test('正确且快速应该返回5分', () => {
      expect(calculateQuality({ isCorrect: true, timeSpent: 5, isUncertain: false, averageTime: 30 })).toBe(5);
    });

    test('正确但慢应该返回3-4分', () => {
      expect(calculateQuality({ isCorrect: true, timeSpent: 50, isUncertain: false, averageTime: 30 })).toBe(3);
      expect(calculateQuality({ isCorrect: true, timeSpent: 35, isUncertain: false, averageTime: 30 })).toBe(4);
    });
  });

  describe('updateSuperMemo', () => {
    test('首次复习（review_count=0）应该设置间隔为1天', () => {
      const wrongAnswer = {
        ease_factor: 2.5,
        review_count: 0,
        review_interval: 1
      };

      const result = updateSuperMemo(wrongAnswer, 3);

      expect(result.review_interval).toBe(1);
      expect(result.ease_factor).toBeGreaterThan(0);
      expect(result.review_count).toBe(1);
    });

    test('第二次复习（review_count=1）应该设置间隔为6天', () => {
      const wrongAnswer = {
        ease_factor: 2.5,
        review_count: 1,
        review_interval: 1
      };

      const result = updateSuperMemo(wrongAnswer, 3);

      expect(result.review_interval).toBe(6);
      expect(result.review_count).toBe(2);
    });

    test('高质量评分（>=4）应该增加难度因子', () => {
      const wrongAnswer = {
        ease_factor: 2.5,
        review_count: 2,
        review_interval: 6,
        mastery_level: 0.3
      };

      const result = updateSuperMemo(wrongAnswer, 5);

      expect(result.ease_factor).toBeGreaterThan(2.5);
      expect(result.mastery_level).toBeGreaterThan(0.3);
    });

    test('低质量评分（<=2）应该减少难度因子', () => {
      const wrongAnswer = {
        ease_factor: 2.5,
        review_count: 2,
        review_interval: 6,
        mastery_level: 0.5
      };

      const result = updateSuperMemo(wrongAnswer, 1);

      expect(result.ease_factor).toBeLessThan(2.5);
      expect(result.mastery_level).toBeLessThan(0.5);
    });

    test('难度因子最小值应该是1.3', () => {
      const wrongAnswer = {
        ease_factor: 1.4,
        review_count: 5,
        review_interval: 10,
        mastery_level: 0.1
      };

      const result = updateSuperMemo(wrongAnswer, 0);

      expect(result.ease_factor).toBeGreaterThanOrEqual(1.3);
    });

    test('掌握度应该在0-1之间', () => {
      const wrongAnswer = {
        ease_factor: 2.5,
        review_count: 5,
        review_interval: 10,
        mastery_level: 0.5
      };

      const result = updateSuperMemo(wrongAnswer, 5);

      expect(result.mastery_level).toBeGreaterThanOrEqual(0);
      expect(result.mastery_level).toBeLessThanOrEqual(1);
    });

    test('next_review_time应该正确计算', () => {
      const wrongAnswer = {
        ease_factor: 2.5,
        review_count: 2,
        review_interval: 6
      };

      const result = updateSuperMemo(wrongAnswer, 3);
      const expectedTime = new Date();
      expectedTime.setDate(expectedTime.getDate() + 6);

      expect(result.next_review_time).toBeInstanceOf(Date);
      expect(result.next_review_time.getTime()).toBeCloseTo(expectedTime.getTime(), -10000); // 10秒误差
    });
  });

  describe('initializeSuperMemo', () => {
    test('应该返回正确的初始值', () => {
      const result = initializeSuperMemo();

      expect(result.ease_factor).toBe(2.5);
      expect(result.review_interval).toBe(1);
      expect(result.review_count).toBe(0);
      expect(result.mastery_level).toBe(0);
      expect(result.next_review_time).toBeInstanceOf(Date);
    });

    test('next_review_time应该是明天', () => {
      const result = initializeSuperMemo();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(result.next_review_time.getDate()).toBe(tomorrow.getDate());
    });
  });

  describe('isDueForReview', () => {
    test('过期时间应该返回true', () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 1);

      expect(isDueForReview(pastTime)).toBe(true);
    });

    test('当前时间应该返回true', () => {
      const now = new Date();

      expect(isDueForReview(now)).toBe(true);
    });

    test('未来时间应该返回false', () => {
      const futureTime = new Date();
      futureTime.setHours(futureTime.getHours() + 1);

      expect(isDueForReview(futureTime)).toBe(false);
    });

    test('null时间应该返回false', () => {
      expect(isDueForReview(null)).toBe(false);
    });
  });

  describe('calculateReviewPriority', () => {
    test('低掌握度+已过期应该返回最高优先级(5)', () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 1);

      const priority = calculateReviewPriority({
        mastery_level: 0.2,
        next_review_time: pastTime
      });

      expect(priority).toBe(5);
    });

    test('高掌握度+已过期应该返回中等优先级(3)', () => {
      const pastTime = new Date();
      pastTime.setHours(pastTime.getHours() - 1);

      const priority = calculateReviewPriority({
        mastery_level: 0.9,
        next_review_time: pastTime
      });

      expect(priority).toBe(3);
    });

    test('低掌握度+未来复习应该返回高优先级(4)', () => {
      const futureTime = new Date();
      futureTime.setDate(futureTime.getDate() + 1);

      const priority = calculateReviewPriority({
        mastery_level: 0.3,
        next_review_time: futureTime
      });

      expect(priority).toBe(4);
    });

    test('高掌握度+远期复习应该返回低优先级(1)', () => {
      const futureTime = new Date();
      futureTime.setDate(futureTime.getDate() + 10);

      const priority = calculateReviewPriority({
        mastery_level: 0.9,
        next_review_time: futureTime
      });

      expect(priority).toBe(1);
    });

    test('无复习时间+低掌握度应该返回高优先级(4)', () => {
      const priority = calculateReviewPriority({
        mastery_level: 0.3,
        next_review_time: null
      });

      expect(priority).toBe(4);
    });

    test('无复习时间+高掌握度应该返回低优先级(1)', () => {
      const priority = calculateReviewPriority({
        mastery_level: 0.9,
        next_review_time: null
      });

      expect(priority).toBe(1);
    });
  });
});
