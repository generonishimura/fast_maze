import { describe, it, expect } from 'vitest'
import { calculateStageConfig, calculateScore } from '@/domain/stage'

describe('calculateStageConfig', () => {
  it('ステージ1の迷路サイズは21x21、速度は5.0である', () => {
    // Given: ステージ番号1
    // When: ステージ設定を計算する
    const config = calculateStageConfig(1)

    // Then: 迷路サイズ21x21、速度5.0
    expect(config.stageNumber).toBe(1)
    expect(config.mazeWidth).toBe(21)
    expect(config.mazeHeight).toBe(21)
    expect(config.tileSpeed).toBe(5.0)
  })

  it('ステージ2の迷路サイズは23x23、速度は5.5である', () => {
    // Given: ステージ番号2
    // When: ステージ設定を計算する
    const config = calculateStageConfig(2)

    // Then: 迷路サイズ23x23、速度5.5
    expect(config.stageNumber).toBe(2)
    expect(config.mazeWidth).toBe(23)
    expect(config.mazeHeight).toBe(23)
    expect(config.tileSpeed).toBe(5.5)
  })

  it('ステージ5の迷路サイズは29x29、速度は7.0である', () => {
    // Given: ステージ番号5
    // When: ステージ設定を計算する
    const config = calculateStageConfig(5)

    // Then: 迷路サイズ29x29、速度7.0
    expect(config.stageNumber).toBe(5)
    expect(config.mazeWidth).toBe(29)
    expect(config.mazeHeight).toBe(29)
    expect(config.tileSpeed).toBe(7.0)
  })

  it('ステージ10の迷路サイズは39x39、速度は9.5である', () => {
    // Given: ステージ番号10
    // When: ステージ設定を計算する
    const config = calculateStageConfig(10)

    // Then: 迷路サイズ39x39、速度9.5
    expect(config.stageNumber).toBe(10)
    expect(config.mazeWidth).toBe(39)
    expect(config.mazeHeight).toBe(39)
    expect(config.tileSpeed).toBe(9.5)
  })

  it('迷路の幅と高さは常に等しい', () => {
    // Given: 任意のステージ番号
    // When: ステージ設定を計算する
    const config = calculateStageConfig(3)

    // Then: 幅と高さが等しい
    expect(config.mazeWidth).toBe(config.mazeHeight)
  })

  it('迷路サイズは常に奇数である', () => {
    // Given: 複数のステージ番号
    // When: ステージ設定を計算する
    // Then: 全て奇数サイズ
    for (const stage of [1, 2, 3, 4, 5, 10]) {
      const config = calculateStageConfig(stage)
      expect(config.mazeWidth % 2).toBe(1)
      expect(config.mazeHeight % 2).toBe(1)
    }
  })

  it('stageNumberフィールドに入力値が保持される', () => {
    // Given: ステージ番号7
    // When: ステージ設定を計算する
    const config = calculateStageConfig(7)

    // Then: stageNumberが7
    expect(config.stageNumber).toBe(7)
  })
})

describe('calculateScore', () => {
  it('スコア0でステージ1クリアすると1000になる', () => {
    // Given: 現在スコア0、ステージ番号1
    // When: スコアを計算する
    const score = calculateScore(0, 1)

    // Then: 1000
    expect(score).toBe(1000)
  })

  it('スコア1000でステージ2クリアすると3000になる', () => {
    // Given: 現在スコア1000、ステージ番号2
    // When: スコアを計算する
    const score = calculateScore(1000, 2)

    // Then: 3000
    expect(score).toBe(3000)
  })

  it('スコア5000でステージ5クリアすると10000になる', () => {
    // Given: 現在スコア5000、ステージ番号5
    // When: スコアを計算する
    const score = calculateScore(5000, 5)

    // Then: 10000
    expect(score).toBe(10000)
  })

  it('スコア0でステージ10クリアすると10000になる', () => {
    // Given: 現在スコア0、ステージ番号10
    // When: スコアを計算する
    const score = calculateScore(0, 10)

    // Then: 10000
    expect(score).toBe(10000)
  })
})
