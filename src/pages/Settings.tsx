import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function Settings() {
  return (
    <div className="flex flex-col h-full">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 p-4 border-b border-border">
        <Link to="/" className="p-2 rounded-md hover:bg-accent transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-semibold">设置</h1>
      </div>

      {/* 设置内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* 通用设置 */}
          <section>
            <h2 className="text-lg font-semibold mb-4">通用</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <div className="font-medium">主题</div>
                  <div className="text-sm text-muted-foreground">选择应用主题</div>
                </div>
                <select className="px-3 py-2 rounded-md border border-input bg-background">
                  <option value="system">跟随系统</option>
                  <option value="light">浅色</option>
                  <option value="dark">深色</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                <div>
                  <div className="font-medium">语言</div>
                  <div className="text-sm text-muted-foreground">选择界面语言</div>
                </div>
                <select className="px-3 py-2 rounded-md border border-input bg-background">
                  <option value="zh-CN">简体中文</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </section>

          {/* 模型设置 */}
          <section>
            <h2 className="text-lg font-semibold mb-4">模型配置</h2>
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-medium">OpenAI</div>
                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    已配置
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="API Key"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  />
                  <input
                    type="text"
                    placeholder="API 端点（可选）"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="font-medium">Ollama</div>
                  <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                    未配置
                  </span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="端点地址（默认 http://localhost:11434）"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 关于 */}
          <section>
            <h2 className="text-lg font-semibold mb-4">关于</h2>
            <div className="p-4 rounded-lg border border-border">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">版本</span>
                  <span>0.1.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Electron</span>
                  <span>33.x</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
