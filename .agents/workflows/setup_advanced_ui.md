---
description: 4つの高度なUIライブラリ（Lenis / GSAP / Embla Carousel / Three.js）のセットアップ
---

# 高度なUIライブラリ（Lenis / GSAP / Embla Carousel / Three.js）の実装ワークフロー

このワークフローは、プロジェクトにおいて高品質なアニメーションやUIを実現するための必須ライブラリ4つを標準構成でインストールし、実装のベストプラクティスを適用するためのものです。

## 1. パッケージのインストール

以下のコマンドを実行し、必要なパッケージをインストールします。
// turbo

```bash
npm install lenis gsap @gsap/react embla-carousel embla-carousel-react three @types/three
```

## 2. 各ライブラリの実装方針（エージェントへの指示）

本ワークフロー実行時、以下の設計方針に従って各モジュール・コンポーネントを実装してください。

### ① Lenis (スムーズスクロール)

- プロジェクト全体をラップする `LenisProvider` または初期化スクリプトを作成する。
- `requestAnimationFrame` を用いてLenisの `raf` メソッドを継続的に呼び出す。
- アンマウント時に必ず `destroy()` を呼び出し、メモリリークを防ぐ。

### ② GSAP (アニメーション・スクロール連動)

- スクロールアニメーションを利用するため、`ScrollTrigger` プラグインを登録する。
- React/Next.js環境の場合は `@gsap/react` の `useGSAP` を活用し、クリーンアップ処理を自動化する。
- フェードイン（FadeUp）やパララックスなど、汎用的なアニメーションは再利用可能なカスタムフックまたはラッパーコンポーネントとして共通化する。

### ③ Embla Carousel (カルーセル)

- 使い回しが容易な `<Carousel />` コンポーネントおよび必要なCSSモジュール（またはユーティリティクラス）を設計する。
- 要件に応じてオートプレイやナビゲーション（Next/Prevボタン、ドット）を備える実装とする。

### ④ Three.js (WebGL/3D表現)

- パーティクルや背景エフェクトの描画基盤となる `Canvas` ラッパーを用意する。
- `ResizeObserver` 等を用いて、ウインドウサイズ変更時にレンダラーとカメラを適切にリサイズする。
- アンマウント時には `geometry.dispose()`, `material.dispose()`, `renderer.dispose()` 等を呼び出し、厳密にWebGLのメモリ解放を行う。

## 3. SSR / Next.js 環境における絶対ルール

- Next.jsでのApp Router / Pages Router両方を想定し、これら4つのライブラリが `window` や `document` に依存している点を厳密に管理する。
- Reactコンポーネントで扱う場合は先頭に `'use client'` ディレクティブを付与し、非依存のSSR環境でクラッシュしないよう、`useEffect` の中でインスタンス化または動的インポート（`next/dynamic`）を行うこと。

## ワークフローの実行指示

対象プロジェクトのディレクトリ内でこのワークフローが呼び出された場合、上記の要件に沿ってパッケージのインストールと基盤コンポーネント（/components, /hooks 等）の作成、およびグローバルレイアウトへの統合を自律的に実施してください。
