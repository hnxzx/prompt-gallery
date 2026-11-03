#!/usr/bin/env python3
"""
飞书多维表格 → catalog.json 同步脚本

使用前需要配置以下环境变量：
  FEISHU_APP_ID      — 飞书自建应用的 App ID
  FEISHU_APP_SECRET  — 飞书自建应用的 App Secret
  FEISHU_BASE_TOKEN  — 多维表格的 Base Token（从表格 URL 中获取）
  FEISHU_TABLE_ID    — 多维表格的数据表 ID

表格字段名需要和下面的 FIELD_MAP 对应。
"""

import json
import os
import sys
import requests

# ========== 配置区 ==========

# 飞书 API 基础地址
FEISHU_BASE = "https://open.feishu.cn/open-apis"

# 表格字段映射：飞书表格列名 → 输出 JSON 字段名
# 按照你的表格实际列名修改这里
FIELD_MAP = {
    "作品名称": "title",
    "提示词": "prompt",
    "效果说明": "description",
    "模型": "model",
    "来源": "source",
    "生成方式": "method",
    "风格标签": "tags",
    "封面": "cover",
    "视频": "video",
    "作者": "author",
    "原帖链接": "sourceUrl",
    "类型": "kind",
}

# 输出文件路径
OUTPUT_PATH = "data/catalog.json"


# ========== 核心逻辑 ==========

def get_tenant_token(app_id: str, app_secret: str) -> str:
    """获取飞书租户访问 token"""
    resp = requests.post(
        f"{FEISHU_BASE}/auth/v3/tenant_access_token/internal",
        json={"app_id": app_id, "app_secret": app_secret},
    )
    data = resp.json()
    if data.get("code") != 0:
        raise RuntimeError(f"获取 token 失败: {data}")
    return data["tenant_access_token"]


def list_records(token: str, base_token: str, table_id: str) -> list:
    """读取多维表格所有记录"""
    records = []
    page_token = ""

    while True:
        params = {"page_size": 100}
        if page_token:
            params["page_token"] = page_token

        resp = requests.get(
            f"{FEISHU_BASE}/bitable/v1/apps/{base_token}/tables/{table_id}/records",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
        )
        data = resp.json()
        if data.get("code") != 0:
            raise RuntimeError(f"读取记录失败: {data}")

        records.extend(data["data"]["items"])
        if not data["data"].get("has_more"):
            break
        page_token = data["data"].get("page_token", "")

    return records


def get_file_temp_url(token: str, file_token: str) -> str:
    """把飞书附件 file_token 换成临时下载链接"""
    resp = requests.get(
        f"{FEISHU_BASE}/drive/v1/medias/{file_token}/download",
        headers={"Authorization": f"Bearer {token}"},
        allow_redirects=False,
    )
    # 飞书会返回 302 重定向到实际文件地址
    if resp.status_code in (301, 302, 303, 307, 308):
        return resp.headers.get("Location", "")
    return ""


def parse_record(token: str, record: dict) -> dict:
    """把飞书记录转成我们的 JSON 格式"""
    fields = record.get("fields", {})
    result = {"id": record.get("record_id", "")}

    for feishu_name, json_name in FIELD_MAP.items():
        value = fields.get(feishu_name)
        if value is None:
            continue

        # 多选字段：飞书返回 list
        if isinstance(value, list):
            if json_name == "tags":
                result[json_name] = [str(v) for v in value]
            elif value and isinstance(value[0], dict) and "text" in value[0]:
                result[json_name] = "".join(v.get("text", "") for v in value)
            else:
                result[json_name] = str(value[0]) if value else ""

        # 附件字段：飞书返回 dict 列表
        elif isinstance(value, dict) and value.get("file_token"):
            url = get_file_temp_url(token, value["file_token"])
            result[json_name] = url

        # 普通文本
        else:
            result[json_name] = str(value)

    # 默认值
    result.setdefault("kind", "prompt")
    result.setdefault("width", 16)
    result.setdefault("height", 9)

    return result


def main():
    app_id = os.environ.get("FEISHU_APP_ID")
    app_secret = os.environ.get("FEISHU_APP_SECRET")
    base_token = os.environ.get("FEISHU_BASE_TOKEN")
    table_id = os.environ.get("FEISHU_TABLE_ID")

    if not all([app_id, app_secret, base_token, table_id]):
        print("⚠️  未配置飞书环境变量，跳过同步，使用本地示例数据")
        sys.exit(0)

    print("🔑 获取飞书访问 token...")
    token = get_tenant_token(app_id, app_secret)

    print(f"📖 读取多维表格数据 (base={base_token[:10]}..., table={table_id})...")
    records = list_records(token, base_token, table_id)
    print(f"   共 {len(records)} 条记录")

    print("🔄 转换数据格式...")
    items = [parse_record(token, r) for r in records]

    output = {
        "schemaVersion": 1,
        "updatedAt": __import__("datetime").datetime.now().isoformat(),
        "count": len(items),
        "items": items,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✅ 同步完成，已写入 {OUTPUT_PATH}（{len(items)} 条）")


if __name__ == "__main__":
    main()
