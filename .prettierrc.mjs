/**
 * Prettier 配置（应用根）
 *
 * 原先拆成两层：仓库根放基础规则，本文件 import 上一层再叠 tailwind 插件。
 * monorepo 拆除后 frontend 即项目根，无法再 import 上一层，故把基础规则内联到这里。
 *
 * @type {import("prettier").Config}
 */
export default {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  tabWidth: 2,
  printWidth: 100,
  arrowParens: "always",
  endOfLine: "lf",
  plugins: ["prettier-plugin-tailwindcss"],
};
