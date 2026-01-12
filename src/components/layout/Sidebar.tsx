import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MessageSquare, Settings, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-muted/30 transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* 顶部区域 */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && <span className="font-semibold text-lg">PrismaX-Desktop</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-accent transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* 新建会话按钮 */}
      <div className="p-2">
        <button
          className={cn(
            "flex items-center gap-2 w-full p-3 rounded-lg",
            "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
            collapsed && "justify-center",
          )}
        >
          <Plus size={18} />
          {!collapsed && <span>新建会话</span>}
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {/* 示例会话项 */}
          <div
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg cursor-pointer",
              "hover:bg-accent transition-colors",
              collapsed && "justify-center",
            )}
          >
            <MessageSquare size={18} />
            {!collapsed && <span className="truncate">新对话</span>}
          </div>
        </div>
      </div>

      {/* 底部导航 */}
      <div className="p-2 border-t border-border">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg transition-colors",
            location.pathname === "/settings" ? "bg-accent" : "hover:bg-accent",
            collapsed && "justify-center",
          )}
        >
          <Settings size={18} />
          {!collapsed && <span>设置</span>}
        </Link>
      </div>
    </aside>
  );
}
