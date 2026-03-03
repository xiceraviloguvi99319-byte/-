# H5 + CI + 阿里云部署说明

## 当前已完成

- H5 构建脚本：`scripts/build-h5.js`
- 构建命令：`npm run build:h5`
- 构建产物目录：`dist/`
- GitHub Actions 自动部署：
  - `.github/workflows/h5-deploy-aliyun.yml`
- 服务器初始化脚本：
  - `deploy/server/bootstrap_nginx.sh`
  - `deploy/server/nginx.turtle-talents.conf`

## 本地构建

```bash
npm run build:h5
```

完成后检查：

- `dist/index.html`
- `dist/icons/*`
- `dist/build-meta.json`

## 服务器一次性初始化（阿里云轻量）

在服务器执行（Ubuntu）：

```bash
bash deploy/server/bootstrap_nginx.sh
```

默认站点根目录：`/var/www/turtle-talents/current`

## GitHub Secrets（CI 必填）

在仓库 `Settings -> Secrets and variables -> Actions` 增加：

- `ALIYUN_HOST`：服务器公网 IP
- `ALIYUN_PORT`：SSH 端口（默认 `22`）
- `ALIYUN_USER`：SSH 用户（例如 `root` 或部署用户）
- `ALIYUN_SSH_KEY`：私钥全文（建议专用部署密钥）
- `ALIYUN_TARGET_DIR`：部署根目录（例如 `/var/www/turtle-talents`）

可选：

- `ALIYUN_POST_DEPLOY_CMD`：部署后执行命令
  - 示例：`sudo systemctl reload nginx`

## 你需要提供/授权给我的信息

1. 你的代码仓库地址（GitHub）。
2. 服务器 SSH 信息：
   - IP
   - 端口
   - 用户名
3. 允许用于 CI 的 SSH 私钥（建议新建专用 deploy key，不用主账号密码）。
4. 服务器是否允许我执行一次 `bootstrap_nginx.sh`（需要 sudo 权限）。

## 安全建议

- 不要提供微信或其他平台账号密码。
- 部署请使用独立 SSH Key。
- 完成部署后可限制该 Key 仅允许来源于 GitHub Actions 出口 IP（如你有安全组策略）。
