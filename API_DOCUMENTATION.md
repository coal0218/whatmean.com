# API 调用文档

本文档详细描述了heyiwei-web项目的数据接口规范。

## 基础信息

- 项目类型：静态前端应用
- 技术栈：Vue 3 + Vite
- 数据来源：`entry` 目录下的 JSON 文件
- 数据提供：通过下载聚合文件 `all-entrys.json` 获取

## 项目架构

本项目采用静态单页应用（SPA）架构，词条内容以静态 JSON 文件形式组织在 `entry` 目录。项目构建时会将所有词条合并生成 `all-entrys.json`，供前端和外部应用使用。

## 数据接口

### 获取所有词条

项目构建后会生成一个聚合的 JSON 文件，可通过以下 URL 访问：

#### 线上地址
```
https://xn--vqqq8jxym.com/all-entrys.json
```

#### 返回格式
```json
[
  {
    "_source": "entry/simple.json",
    "词条名": "示例词条",
    "词条介绍": "这是词条的简要介绍，通常是一句话概括。",
    "详细介绍": "这里是词条的详细解释和背景信息...",
    "词条年份": 2025,
    "提交时间": "2025-12-17 10:00:00",
    "标签": "示例,网络用语,流行文化"
  }
]
```

#### 字段说明
- `_source`: 词条来源文件路径
- `词条名`: 词条名称
- `词条介绍`: 词条简要介绍
- `详细介绍`: 词条详细内容
- `词条年份`: 词条对应年份
- `提交时间`: 词条提交时间
- `标签`: 标签列表（逗号分隔）

## 数据格式

### 词条文件格式

`entry` 目录下的 JSON 文件应包含以下字段：

```json
{
  "词条名": "示例词条",
  "词条介绍": "这是词条的简要介绍，通常是一句话概括。",
  "详细介绍": "这里是词条的详细解释和背景信息...",
  "词条年份": 2025,
  "提交时间": "2025-12-17 10:00:00",
  "标签": "示例,网络用语,流行文化"
}
```

## Python 示例代码

以下是一个完整的 Python 桌面应用程序示例，演示如何下载 `all-entrys.json` 获取词条数据，并实现本地缓存、自动更新和随机抽取功能：

```python
import tkinter as tk
from tkinter import ttk, messagebox
import urllib.request
import json
import os
import hashlib
import threading
import time
from datetime import datetime

DATA_URL = "https://xn--vqqq8jxym.com/all-entrys.json"
LOCAL_FILE = "all-entrys.json"
CHECK_INTERVAL = 3600

class DailyMeaningApp:
    def __init__(self, root):
        self.root = root
        self.root.title("每日何意味")
        self.root.geometry("600x450")
        self.root.resizable(False, False)

        self.entries = []
        self.current_entry = None
        self.check_thread = None
        self.running = True

        self.setup_ui()
        self.load_local_data()
        self.start_auto_check()

    def setup_ui(self):
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)

        title_label = ttk.Label(main_frame, text="每日何意味", font=("Microsoft YaHei", 24, "bold"))
        title_label.pack(pady=(0, 20))

        self.entry_name_label = ttk.Label(main_frame, text="点击按钮开始", font=("Microsoft YaHei", 18))
        self.entry_name_label.pack(pady=20)

        button_frame = ttk.Frame(main_frame)
        button_frame.pack(pady=10)

        self.draw_button = ttk.Button(button_frame, text="抽取词条", command=self.draw_random_entry, width=15)
        self.draw_button.pack(side=tk.LEFT, padx=5)

        self.details_button = ttk.Button(button_frame, text="显示详情", command=self.show_details, state=tk.DISABLED, width=15)
        self.details_button.pack(side=tk.LEFT, padx=5)

        self.details_frame = ttk.LabelFrame(main_frame, text="详情信息", padding="10")
        self.details_frame.pack(fill=tk.BOTH, expand=True, pady=(20, 0))

        self.details_text = tk.Text(self.details_frame, wrap=tk.WORD, height=10, font=("Microsoft YaHei", 10))
        self.details_text.pack(fill=tk.BOTH, expand=True)

        status_frame = ttk.Frame(main_frame)
        status_frame.pack(side=tk.BOTTOM, fill=tk.X, pady=(10, 0))

        self.status_label = ttk.Label(status_frame, text="状态: 准备就绪", foreground="green")
        self.status_label.pack(side=tk.LEFT)

        self.update_label = ttk.Label(status_frame, text="")
        self.update_label.pack(side=tk.RIGHT)

    def get_file_hash(self, filepath):
        """计算文件的MD5哈希值，用于检测文件变化"""
        if not os.path.exists(filepath):
            return None
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            return hashlib.md5(content.encode('utf-8')).hexdigest()

    def download_json(self):
        """从远程服务器下载JSON数据"""
        try:
            self.update_status("正在下载数据...", "orange")
            urllib.request.urlretrieve(DATA_URL, LOCAL_FILE)
            return True
        except Exception as e:
            self.update_status(f"下载失败: {e}", "red")
            return False

    def load_local_data(self):
        """从本地文件加载词条数据"""
        if not os.path.exists(LOCAL_FILE):
            if not self.download_json():
                self.update_status("无法加载数据，请检查网络连接", "red")
                return
        try:
            with open(LOCAL_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # 支持多种数据格式
                if isinstance(data, list):
                    self.entries = data
                elif isinstance(data, dict) and 'entries' in data:
                    self.entries = data['entries']
                else:
                    self.entries = list(data.values()) if data else []
            self.update_status(f"已加载 {len(self.entries)} 个词条", "green")
        except Exception as e:
            self.update_status(f"加载失败: {e}", "red")

    def check_for_updates(self):
        """检查远程数据是否有更新"""
        try:
            self.update_status("正在检查更新...", "orange")
            urllib.request.urlretrieve(DATA_URL, LOCAL_FILE + ".tmp")

            if os.path.exists(LOCAL_FILE):
                local_hash = self.get_file_hash(LOCAL_FILE)
                online_hash = self.get_file_hash(LOCAL_FILE + ".tmp")

                if local_hash != online_hash:
                    os.replace(LOCAL_FILE + ".tmp", LOCAL_FILE)
                    self.load_local_data()
                    self.update_status("数据已更新!", "green")
                    return True
                else:
                    os.remove(LOCAL_FILE + ".tmp")
                    self.update_status("数据已是最新", "green")
                    return False
            else:
                os.replace(LOCAL_FILE + ".tmp", LOCAL_FILE)
                self.load_local_data()
                self.update_status("数据下载完成", "green")
                return True
        except Exception as e:
            if os.path.exists(LOCAL_FILE + ".tmp"):
                os.remove(LOCAL_FILE + ".tmp")
            self.update_status(f"检查更新失败: {e}", "red")
            return False

    def start_auto_check(self):
        """启动自动检查更新线程"""
        self.check_thread = threading.Thread(target=self.auto_check_loop, daemon=True)
        self.check_thread.start()

    def auto_check_loop(self):
        """自动检查更新循环，每3600秒（1小时）检查一次"""
        while self.running:
            time.sleep(CHECK_INTERVAL)
            if self.running:
                self.check_for_updates()

    def update_status(self, message, color="black"):
        """线程安全的UI状态更新"""
        self.root.after(0, lambda: self._update_status(message, color))

    def _update_status(self, message, color):
        """更新状态标签"""
        self.status_label.config(text=f"状态: {message}", foreground=color)

    def draw_random_entry(self):
        """随机抽取一个词条"""
        if not self.entries:
            messagebox.showwarning("警告", "没有可用的词条数据")
            return

        import random
        self.current_entry = random.choice(self.entries)
        entry_name = self.current_entry.get('词条名') or self.current_entry.get('name') or self.current_entry.get('title', '未知')

        self.entry_name_label.config(text=entry_name)
        self.details_button.config(state=tk.NORMAL)
        self.details_text.delete(1.0, tk.END)

    def show_details(self):
        """显示当前词条的详细信息"""
        if not self.current_entry:
            return

        self.details_text.delete(1.0, tk.END)

        for key, value in self.current_entry.items():
            # 跳过来源字段
            if key == '_source':
                continue
            # 格式化复杂数据结构
            if isinstance(value, (list, dict)):
                value = json.dumps(value, ensure_ascii=False, indent=2)
            self.details_text.insert(tk.END, f"{key}: {value}\n\n")

    def on_closing(self):
        """窗口关闭事件处理"""
        self.running = False
        self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = DailyMeaningApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()
```

### 示例代码功能说明

1. **远程数据获取**：通过 `urllib.request.urlretrieve` 从 `https://xn--vqqq8jxym.com/all-entrys.json` 下载聚合数据
2. **本地缓存**：将下载的数据保存到 `all-entrys.json` 本地文件
3. **增量更新检测**：使用 MD5 哈希对比本地文件和远程文件，仅在内容变化时重新加载
4. **自动更新**：启动后台线程每 3600 秒（1小时）自动检查一次更新
5. **线程安全UI更新**：使用 `root.after()` 方法确保从非主线程安全地更新UI
6. **词条抽取**：随机从本地加载的词条列表中抽取一条显示
7. **详情展示**：以键值对形式展示词条的完整信息，跳过 `_source` 字段

### 运行示例代码

确保已安装 Python 3.x，然后直接运行：

```bash
python api-demo.py
```

程序启动后会：
- 自动下载最新词条数据
- 显示主界面
- 后台启动自动更新检查线程
- 用户点击"抽取词条"随机显示一个词条
- 点击"显示详情"查看词条完整信息

## 克隆优化

由于词条数据存储在 `entry` 目录下，当词条数量增加时，仓库可能会变得非常大。为了优化克隆速度和减少磁盘占用，您可以使用 Git 的 Partial Clone 和 Sparse Checkout 功能：

### 方法一：使用Partial Clone
```
git clone --filter=blob:none https://github.com/Nico6719/whatmean.com.git
```

### 方法二：使用Sparse Checkout
```
git clone --no-checkout https://github.com/Nico6719/whatmean.com.git
cd whatmean.com
git sparse-checkout init
git config core.sparseCheckout true
echo "/*" >> .git/info/sparse-checkout
echo "!/entry/" >> .git/info/sparse-checkout
git checkout
```

使用这些技术，您可以避免下载大量的词条文件，从而显著减少克隆时间和磁盘占用。
