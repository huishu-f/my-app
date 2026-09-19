/**
 * @file shared 包 ESLint 配置
 * @description 基于 typescript-eslint 的扁平配置：开启 JS/TS 推荐规则，接入 Prettier 兼容配置，并对 TS 文件放宽 no-explicit-any、豁免下划线前缀未用变量
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    /** 忽略目录：依赖与构建产物 */
    ignores: ['node_modules/**', 'dist/**'],
  },

  /** ESLint JS 推荐规则集 */
  js.configs.recommended,

  /** typescript-eslint 推荐规则集 */
  ...tseslint.configs.recommended,

  /** 关闭与 Prettier 格式化冲突的 ESLint 规则（须放在最后） */
  prettierConfig,

  {
    /** 仅对 TS 文件生效的自定义规则 */
    files: ['**/*.ts'],
    rules: {
      /** 显式 any 降级为警告（类型迁移期容忍） */
      '@typescript-eslint/no-explicit-any': 'warn',
      /** 未用变量报错，但豁免下划线前缀命名的参数与变量 */
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
