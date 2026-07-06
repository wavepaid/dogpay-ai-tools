# DogPay AI Tooling 发布流程

这套东西分三条线发布：

1. `@dogpay/dogpay-ai-plugins` npm 包：给 Claude Code、Cursor、Skills(npx) 用。
2. Codex plugin marketplace：给 Codex 插件安装用。
3. `dogpay-ai-setup/index.html`：放到 DogPay 文档站或官网。

## 1. 发布 npm 包

目录：

```bash
npm/dogpay-ai-plugins
```

发布前已设置，发布前可按 DogPay 法务/仓库实际情况调整：

- `license`: `MIT`
- `repository`: `git+https://github.com/wavepaid/dogpay-ai-tools.git`
- `homepage`: `https://docs.dogpay.com/ai`
- npm organization `@dogpay` 权限

发布命令：

```bash
cd npm/dogpay-ai-plugins
npm login
npm publish --access public
```

验证：

```bash
npx -y @dogpay/dogpay-ai-plugins --print cursor
npx -y @dogpay/dogpay-ai-plugins --print claude
```

## 2. 发布 Codex marketplace

Codex marketplace 是一个 Git 或本地目录源。公开发布时，建议新建一个 GitHub 仓库，例如：

```text
wavepaid/dogpay-ai-tools
```

仓库根目录需要保留这两个路径：

```text
.agents/plugins/marketplace.json
plugins/dogpay/
```

`.agents/plugins/marketplace.json` 使用正式 marketplace 名称：

```json
{
  "name": "dogpay",
  "interface": {
    "displayName": "DogPay"
  }
}
```

然后推到 GitHub：

```bash
cd dogpay-ai-tools
git init
git add .
git commit -m "Publish DogPay AI tooling"
git branch -M main
git remote add origin git@github.com:wavepaid/dogpay-ai-tools.git
git push -u origin main
```

用户安装 marketplace：

```bash
codex plugin marketplace add wavepaid/dogpay-ai-tools
codex plugin add dogpay@dogpay
```

如果使用 HTTPS Git URL：

```bash
codex plugin marketplace add https://github.com/wavepaid/dogpay-ai-tools.git
codex plugin add dogpay@dogpay
```

如果你们以后进入 OpenAI curated marketplace，才可能做到用户无需先添加 marketplace 的一行安装命令。

## 3. 发布官网安装页

页面文件：

```bash
dogpay-ai-setup/index.html
```

建议放到：

```text
https://docs.dogpay.com/ai
```

或：

```text
https://docs.dogpay.com/docs/ai-tools
```

上线前把 Codex tab 里的命令改成正式两步：

```bash
codex plugin marketplace add wavepaid/dogpay-ai-tools
codex plugin add dogpay@dogpay
```

如果 DogPay 插件进入 OpenAI curated marketplace，再改成单行：

```bash
codex plugin add dogpay@openai-curated
```

## 4. ChatGPT Action/OpenAPI

文件：

```bash
openapi/dogpay-payments.openapi.json
```

用法：

1. 打开 GPT Builder。
2. 添加 Action。
3. 导入这个 OpenAPI JSON。
4. 设置 DogPay access token 获取逻辑或让后端代理处理认证。

建议生产环境不要让 GPT 直接持有 DogPay API Secret。更安全的做法是让 GPT 调你们自己的后端代理，由后端完成 DogPay token 缓存和请求转发。

## 5. 发布后验收

用全新环境测试：

```bash
codex plugin marketplace add wavepaid/dogpay-ai-tools
codex plugin add dogpay@dogpay
```

然后新开 Codex 线程测试：

```text
帮我在这个项目里接入 DogPay hosted checkout
帮我实现 DogPay webhook HMAC-SHA512 验签
帮我写一个 DogPay access token 缓存客户端
```

再测试 MCP：

```bash
npx -y @dogpay/dogpay-ai-plugins --print cursor
```

最后检查 docs 页面上每个 tab 的复制命令是否与正式发布源一致。
