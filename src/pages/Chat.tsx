export function Chat() {
  return (
    <div className="flex flex-col h-full">
      {/* 消息列表区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h1 className="text-2xl font-bold mb-2">欢迎使用 PrismaX-Desktop</h1>
            <p className="text-muted-foreground">开始一段新的对话吧</p>
          </div>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <textarea
              placeholder="输入消息..."
              className="flex-1 min-h-[80px] max-h-[200px] p-3 rounded-lg border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={1}
            />
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors self-end">
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
