#!/usr/bin/env python3
"""
飞书多维表格 → catalog.json 同步脚本

使用前需要配置以下环境变量：
  FEISHU_APP_ID      — 飞书自建应用的 App ID
  FEISHU_APP_SECRET  — 飞书自建应用的 App Secret
  FEISHU_BASE_TOKEN  — 多维表格的 Base Token（从表格 URL 中获取）
  FEISHU_TABLE_ID    — 多维表格的数据表 ID
"""

import json
import os
import sys
import datetime
import requests

# ========== 配置区 ==========

FEISHU_BASE = "https://open.feishu.cn/open-apis"

# 表格字段映射：飞书表格列名 → 输出 JSON 字段名
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

# 输出路径（放在 public/data/ 下，Vite 构建时会自动复制到 dist）
OUTPUT_PATH = "public/data/catalog.json"


# ========== 核心逻辑 ==========

def get_tenant_token(app_id: str, app_secret: str) -> str:
    resp = requests.post(
        f"{FEISHU_BASE}/auth/v3/tenant_access_token/internal",
        json={"app_id": app_id, "app_secret": app_secret},
    )
    data = resp.json()
    if data.get("code") != 0:
        raise RuntimeError(f"获取 token 失败: {data}")
    return data["tenant_access_token"]


def list_records(token: str, base_token: str, table_id: str) -> list:
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
    """把飞书附件 file_token 换成临时下载链接（302 重定向）"""
    resp = requests.get(
        f"{FEISHU_BASE}/drive/v1/medias/{file_token}/download",
        headers={"Authorization": f"Bearer {token}"},
        allow_redirects=False,
    )
    if resp.status_code in (301, 302, 303, 307, 308):
        return resp.headers.get("Location", "")
    return ""


def parse_text_value(value) -> str:
    """解析文本类字段（飞书富文本是 segment 数组）"""
    if isinstance(value, list):
        # 富文本：[{text: "xxx", type: "text"}, ...]
        parts = []
        for seg in value:
            if isinstance(seg, dict):
                parts.append(seg.get("text", ""))
            else:
                parts.append(str(seg))
        return "".join(parts)
    return str(value) if value else ""


def parse_single_select(value) -> str:
    """解析单选字段"""
    if isinstance(value, dict):
        return value.get("text", "") or value.get("name", "")
    return str(value) if value else ""


def parse_multi_select(value) -> list:
    """解析多选字段"""
    if isinstance(value, list):
        result = []
        for v in value:
            if isinstance(v, dict):
                result.append(v.get("text", "") or v.get("name", ""))
            else:
                result.append(str(v))
        return result
    if isinstance(value, str) and value:
        return [value]
    return []


def parse_url_field(value) -> str:
    """解析超链接字段"""
    if isinstance(value, dict):
        return value.get("link", "") or value.get("url", "")
    return str(value) if value else ""


def parse_attachment(token: str, value) -> str:
    """解析附件字段，返回第一个文件的临时下载链接"""
    if isinstance(value, list) and len(value) > 0:
        file_token = value[0].get("file_token") or value[0].get("fileToken")
        if file_token:
            return get_file_temp_url(token, file_token)
    elif isinstance(value, dict):
        file_token = value.get("file_token") or value.get("fileToken")
        if file_token:
            return get_file_temp_url(token, file_token)
    return ""


def parse_record(token: str, record: dict) -> dict:
    fields = record.get("fields", {})
    result = {"id": record.get("record_id", "")}

    for feishu_name, json_name in FIELD_MAP.items():
        value = fields.get(feishu_name)
        if value is None or value == "":
            continue

        # 标签字段：数组
        if json_name == "tags":
            result[json_name] = parse_multi_select(value)
        # 附件字段
        elif json_name in ("cover", "video"):
            result[json_name] = parse_attachment(token, value)
        # 超链接
        elif json_name == "sourceUrl":
            result[json_name] = parse_url_field(value)
        # 单选字段（模型、来源、生成方式、类型）
        elif json_name in ("model", "source", "method", "kind"):
            result[json_name] = parse_single_select(value)
        # 文本字段
        else:
            result[json_name] = parse_text_value(value)

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

    print(f"📖 读取多维表格数据...")
    records = list_records(token, base_token, table_id)
    print(f"   共 {len(records)} 条记录")

    print("🔄 转换数据格式...")
    items = [parse_record(token, r) for r in records]
    # 过滤掉空记录
    items = [item for item in items if item.get("title")]

    output = {
        "schemaVersion": 1,
        "updatedAt": datetime.datetime.now().isoformat(),
        "count": len(items),
        "items": items,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✅ 同步完成，已写入 {OUTPUT_PATH}（{len(items)} 条有效记录）")


if __name__ == "__main__":
    main()
