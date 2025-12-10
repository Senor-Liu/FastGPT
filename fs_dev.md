## FS 定制化修改说明

所有定制化修改都在 `fs/custom` 分支下进行
``` sh
git checkout -b fs/custom
git add .
git commit -m "custom modify"
git push -u origin fs/custom
```
不定期同步上游更新，先更新 `main` 分支，再合并到 `fs/custom` 分支，确保 `main` 始终可以干净地同步 `upstream`
``` sh
# 1. 更新 main 分支
git checkout main
git fetch upstream
git merge upstream/main      # 或 pull，但 fetch+merge 更明确
git push origin main         # 同步到 fork 仓库

# 2. 将更新合并到 fs/custom 分支
git checkout fs/custom
git merge main
```

**除以下修改，其它代码与 [fastgpt官方仓库](https://github.com/labring/FastGPT) `main` 分支完全一样，若有其它修改请及时更新此文档**

### 单点登录
增加环境变量：共享密钥 SSO_SHARED_SECRET
外部平台发起方式（示例）：
后端生成 
``` javascript
const payload = { userId, teamId, tmbId, iat, exp, resourceApi };
const code = base64url(JSON.stringify(payload));
const token = HMAC_SHA256(code, SSO_SHARED_SECRET);
```
浏览器 iframe src 指向：
https://your-fastgpt.cn/login/fastlogin?code={code}&token={token}&callbackUrl=${encodeURIComponent('/app/detail?appId=xxx')}
/login/fastlogin 页面会清理旧 Cookie，调用上面接口设置新 Cookie，并 302 到目标地址。
在payload中传入resourceApi，获取当前用户可访问的资源列表，并存入redis用户session中。
修改文件：
- `/projects/app/next.config.js` // 允许 iframe
- `/packages/service/support/permission/auth/commin.ts` // 允许跨站 Cookie；设置 session
- `/projects/app/src/web/support/user/api.ts` // 预留的fastLogin路由去掉proApi前缀
- `/projects/app/src/pages/api/support/user/account/login/fastLogin.ts` // 实现fastlogin功能
- `/packages/service/support/user/session.ts` // 设置 session

### 去除单用户客户端登录限制
修改文件：
- `/packages/service/support/user/session.ts`

### 去除退出登录删除所有token的限制，只删除当前会话token
修改文件：
- `/packages/service/support/user/session.ts`
- `/projects/app/src/pages/api/support/user/account/loginout.ts`

### 应用列表接口、知识库列表接口修改
从redis用户session中获取可访问的资源列表，并过滤
修改文件：
- `/projects/app/src/pages/api/core/app/list.ts` // 应用接口过滤
- `/projects/app/src/pages/api/core/dataset/list.ts` // 知识库接口过滤

### 创建应用文件夹、知识库文件夹接口返回新建的文件夹ID
修改文件：
- `/projects/app/src/pages/api/core/app/folder/create.ts`
- `/projects/app/src/pages/api/core/dataset/folder/create.ts`

### 隐藏不需要的页面组件
TODO
