#!/usr/bin/env python3
"""Generate software copyright registration PDF materials for this project."""

from __future__ import annotations

import os
import re
from datetime import date
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    Flowable,
    Image as RLImage,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
MATERIALS_DIR = ROOT / "copyright-materials"
OUT_DIR = MATERIALS_DIR / "补正上传"
SCREENSHOT_DIR = MATERIALS_DIR / "screenshots"
SOURCE_PDF = OUT_DIR / "猫咪的符咒学院游戏软件_程序鉴别材料_源码前30页后30页.pdf"
MANUAL_PDF = OUT_DIR / "猫咪的符咒学院游戏软件_文档鉴别材料_软件说明书.pdf"

FONT_REGULAR = "CN-Regular"
FONT_BOLD = "CN-Bold"
FONT_MONO = "CN-Mono"

SOFTWARE_NAME = "猫咪的符咒学院游戏软件"
VERSION = "V1.0"
TODAY = date.today().isoformat()

SOURCE_FILES = [
    "game.js",
    "game.json",
    "project.config.json",
    "src/main.js",
    "src/core/GameState.js",
    "src/input/InputManager.js",
    "src/input/GestureRecognizer.js",
    "src/render/Renderer.js",
    "src/levels/LevelDirector.js",
    "src/levels/Themes.js",
    "src/entities/Enemy.js",
    "src/assets/AssetManager.js",
    "src/audio/SoundManager.js",
    "src/ui/AudioToggle.js",
    "src/ui/DifficultySelector.js",
    "src/ui/ItemBar.js",
    "src/utils/math.js",
]


def register_fonts() -> None:
    regular_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Light.ttc",
    ]
    bold_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/System/Library/Fonts/PingFang.ttc",
    ]
    mono_candidates = [
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/System/Library/Fonts/STHeiti Light.ttc",
    ]

    def first_existing(paths: Sequence[str]) -> str:
        for item in paths:
            if Path(item).exists():
                return item
        raise FileNotFoundError("No Chinese-capable font found on this system.")

    pdfmetrics.registerFont(TTFont(FONT_REGULAR, first_existing(regular_candidates)))
    pdfmetrics.registerFont(TTFont(FONT_BOLD, first_existing(bold_candidates)))
    pdfmetrics.registerFont(TTFont(FONT_MONO, first_existing(mono_candidates)))


def read_source_lines() -> List[Tuple[str, int, str]]:
    lines: List[Tuple[str, int, str]] = []
    for rel in SOURCE_FILES:
        path = ROOT / rel
        if not path.exists():
            continue
        lines.append((rel, 0, f"// ===== 文件：{rel} ====="))
        with path.open("r", encoding="utf-8", errors="replace") as handle:
            for idx, raw in enumerate(handle, start=1):
                lines.append((rel, idx, raw.rstrip("\n\r")))
        lines.append((rel, 0, ""))
    return lines


def clean_code_line(text: str) -> str:
    text = text.expandtabs(2)
    return "".join(ch if ch >= " " else " " for ch in text)


def truncate_to_width(text: str, max_width: float, font_name: str, font_size: float) -> str:
    if pdfmetrics.stringWidth(text, font_name, font_size) <= max_width:
        return text
    ellipsis = " ..."
    available = max_width - pdfmetrics.stringWidth(ellipsis, font_name, font_size)
    out = []
    width = 0.0
    for ch in text:
        ch_width = pdfmetrics.stringWidth(ch, font_name, font_size)
        if width + ch_width > available:
            break
        out.append(ch)
        width += ch_width
    return "".join(out) + ellipsis


def draw_footer(c: canvas.Canvas, page_num: int, title: str) -> None:
    width, _ = A4
    c.setStrokeColor(colors.HexColor("#D9DEE7"))
    c.setLineWidth(0.4)
    c.line(18 * mm, 15 * mm, width - 18 * mm, 15 * mm)
    c.setFont(FONT_REGULAR, 8)
    c.setFillColor(colors.HexColor("#586174"))
    c.drawString(18 * mm, 9.5 * mm, f"{title} | {SOFTWARE_NAME} {VERSION}")
    c.drawRightString(width - 18 * mm, 9.5 * mm, f"第 {page_num} 页")


def generate_source_pdf() -> int:
    """Keep submitted source unchanged and replace only registration headers."""
    import io
    import pymupdf

    original = MATERIALS_DIR / "符咒学院游戏软件_程序鉴别材料_源码前30页后30页.pdf"
    source = pymupdf.open(original)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for index, page in enumerate(source):
        # These bands contain only the old document header and footer.
        page.add_redact_annot(pymupdf.Rect(40, 14, 365, 34), fill=(1, 1, 1))
        page.add_redact_annot(pymupdf.Rect(45, 803, 450, 825), fill=(1, 1, 1))
        page.apply_redactions(images=0)
        overlay_bytes = io.BytesIO()
        overlay = canvas.Canvas(overlay_bytes, pagesize=A4)
        overlay.setFont(FONT_BOLD, 10)
        overlay.drawString(15 * mm, A4[1] - 10 * mm, f"{SOFTWARE_NAME} {VERSION} 源程序")
        overlay.setFont(FONT_REGULAR, 8)
        overlay.setFillColor(colors.HexColor("#586174"))
        overlay.drawString(18 * mm, 9.5 * mm, f"程序鉴别材料 | {SOFTWARE_NAME} {VERSION}")
        overlay.save()
        overlay_pdf = pymupdf.open(stream=overlay_bytes.getvalue(), filetype="pdf")
        page.show_pdf_page(page.rect, overlay_pdf, 0)
        overlay_pdf.close()
    source.set_metadata({"title": f"{SOFTWARE_NAME} {VERSION} 源程序", "author": "",
                         "subject": "程序鉴别材料：一般交存"})
    source.save(str(SOURCE_PDF), garbage=4, deflate=True)
    total_pages = len(source)
    source.close()
    return total_pages


class CheckBox(Flowable):
    def __init__(self, size: float = 8, checked: bool = False):
        super().__init__()
        self.size = size
        self.checked = checked
        self.width = size
        self.height = size

    def draw(self) -> None:
        self.canv.setStrokeColor(colors.HexColor("#4B5563"))
        self.canv.rect(0, 0, self.size, self.size, stroke=1, fill=0)
        if self.checked:
            self.canv.setStrokeColor(colors.HexColor("#176FC1"))
            self.canv.setLineWidth(1.4)
            self.canv.line(1.5, self.size * 0.45, self.size * 0.4, 1.5)
            self.canv.line(self.size * 0.4, 1.5, self.size - 1.4, self.size - 1.4)


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


def bullets(items: Iterable[str], style: ParagraphStyle) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=8) for item in items],
        bulletType="bullet",
        leftIndent=16,
        bulletFontName=FONT_REGULAR,
        bulletFontSize=9,
    )


def number_list(items: Iterable[str], style: ParagraphStyle) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(item, style), leftIndent=12) for item in items],
        bulletType="1",
        leftIndent=18,
        bulletFontName=FONT_REGULAR,
        bulletFontSize=9,
    )


def image_flowable(path: Path, max_width: float, max_height: float) -> RLImage | None:
    if not path.exists():
        return None
    with Image.open(path) as img:
        width, height = img.size
    ratio = min(max_width / width, max_height / height)
    return RLImage(str(path), width=width * ratio, height=height * ratio)


def screenshot_grid(
    items: Sequence[Tuple[str, str]],
    styles: dict[str, ParagraphStyle],
) -> Table:
    cells = []
    for filename, caption in items:
        screenshot = image_flowable(SCREENSHOT_DIR / filename, 56 * mm, 100 * mm)
        if screenshot is None:
            raise FileNotFoundError(f"Screenshot is required: {SCREENSHOT_DIR / filename}")
        cells.append(
            [
                screenshot,
                Spacer(1, 3),
                p(caption, styles["small"]),
            ]
        )

    while len(cells) < 2:
        cells.append("")

    grid = Table([cells], colWidths=[76 * mm, 76 * mm], hAlign="LEFT")
    grid.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("BOX", (0, 0), (-1, -1), 0.45, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#E2E8F0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return grid


def build_styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "CNTitle",
            parent=base["Title"],
            fontName=FONT_BOLD,
            fontSize=24,
            leading=31,
            alignment=TA_CENTER,
            spaceAfter=14,
            textColor=colors.HexColor("#111827"),
        ),
        "subtitle": ParagraphStyle(
            "CNSubtitle",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=11,
            leading=17,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#4B5563"),
            spaceAfter=8,
        ),
        "h1": ParagraphStyle(
            "CNHeading1",
            parent=base["Heading1"],
            fontName=FONT_BOLD,
            fontSize=15,
            leading=21,
            spaceBefore=10,
            spaceAfter=8,
            textColor=colors.HexColor("#111827"),
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "CNHeading2",
            parent=base["Heading2"],
            fontName=FONT_BOLD,
            fontSize=12,
            leading=17,
            spaceBefore=7,
            spaceAfter=5,
            textColor=colors.HexColor("#1F2937"),
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "CNBody",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=10,
            leading=16,
            spaceAfter=6,
            alignment=TA_LEFT,
            firstLineIndent=0,
        ),
        "small": ParagraphStyle(
            "CNSmall",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=8.5,
            leading=13,
            spaceAfter=4,
            textColor=colors.HexColor("#4B5563"),
        ),
        "cell": ParagraphStyle(
            "CNCell",
            parent=base["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=8.4,
            leading=12.2,
            spaceAfter=0,
        ),
        "cell_bold": ParagraphStyle(
            "CNCellBold",
            parent=base["BodyText"],
            fontName=FONT_BOLD,
            fontSize=8.4,
            leading=12.2,
            spaceAfter=0,
        ),
        "cover_meta": ParagraphStyle(
            "CNCoverMeta",
            parent=base["Normal"],
            fontName=FONT_REGULAR,
            fontSize=11,
            leading=18,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#374151"),
        ),
    }
    return styles


def table(data: Sequence[Sequence[object]], widths: Sequence[float], header: bool = True) -> Table:
    tbl = Table(data, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        commands.extend(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EEF4FF")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
            ]
        )
    tbl.setStyle(TableStyle(commands))
    return tbl


def manual_footer(c: canvas.Canvas, doc: SimpleDocTemplate) -> None:
    draw_footer(c, doc.page, "文档鉴别材料")


def add_cover(story: list, styles: dict[str, ParagraphStyle]) -> None:
    story.extend(
        [
            Spacer(1, 48 * mm),
            p(f"{SOFTWARE_NAME}", styles["title"]),
            p("软件说明书", styles["title"]),
            Spacer(1, 8 * mm),
            p(f"版本号：{VERSION}", styles["cover_meta"]),
            p("软件分类：微信小游戏 / 休闲益智游戏软件", styles["cover_meta"]),
            p("编程语言：JavaScript", styles["cover_meta"]),
            p("运行平台：微信小游戏平台，iOS、Android", styles["cover_meta"]),
            Spacer(1, 36 * mm),
            p("文档鉴别材料：一般交存", styles["subtitle"]),
            p(f"生成日期：{TODAY}", styles["subtitle"]),
            PageBreak(),
        ]
    )


def add_compliance_visuals(story: list, styles: dict[str, ParagraphStyle]) -> None:
    story.append(p("补正重点：游戏完整流程与界面图示", styles["h1"]))
    story.append(
        p(
            "本软件登记全称为“猫咪的符咒学院游戏软件”，界面沿用“符咒学院”标题。本节使用项目渲染器生成的界面截图，完整说明玩家从启动软件、阅读健康游戏忠告、进入主界面、"
            "选择难度、绘制符咒、击退敌人、切换关卡，直至通关或失败后重新开始的全过程。"
            "截图同时覆盖软件内全部六套场景、主角动作、敌方角色及可体验系统。",
            styles["body"],
        )
    )
    story.append(p("1. 游戏方法与完整游玩流程", styles["h2"]))
    story.append(
        number_list(
            [
                "启动软件后首先显示“健康游戏忠告”，玩家阅读后点击屏幕进入游戏。",
                "主界面显示游戏标题“符咒学院”、当前主题、声音开关及普通难度、+1 难度选项。",
                "玩家选择难度进入关卡；+1 难度会提高敌人移动、出怪和场景滚动速度。",
                "敌人从场景远端向主角靠近，敌人上方显示当前需绘制的方向、字母或图形符咒。",
                "玩家在触摸屏上按提示绘制符咒，系统实时识别轨迹并匹配敌人符号队列。",
                "匹配成功会攻击敌人；清空符号队列后消灭敌人并计分，连续命中可累积 Combo 和倍率。",
                "达到指定连击数后获得紫色闪电或血瓶，点击道具可攻击敌人或恢复一颗生命。",
                "敌人接触主角时扣除生命；当前关卡全部敌人和 Boss 被清除后进入下一关难度选择。",
                "完成六关后显示通关界面；生命归零则显示失败界面。",
                "玩家在通关或失败界面点击屏幕返回主界面，可重新选择难度并开始新一局。",
            ],
            styles["body"],
        )
    )
    story.append(
        screenshot_grid(
            [
                (
                    "01-health-warning.png",
                    "图 1  健康游戏忠告。内容包括抵制不良游戏、注意自我保护、适度游戏和合理安排时间。",
                ),
                (
                    "02-main-title.png",
                    "图 2  游戏主界面。清晰显示界面标题“符咒学院”、玩法提示、难度选择和声音开关。",
                ),
            ],
            styles,
        )
    )
    story.append(PageBreak())

    story.append(p("2. 全部场景与敌方角色", styles["h2"]))
    story.append(
        p(
            "软件共包含六套可进入场景。每张图均为项目渲染器生成的游戏进行界面，显示场景名称、主角、"
            "该主题全部敌方角色、符咒提示、分数、关卡、连击、道具、生命和声音开关。",
            styles["body"],
        )
    )
    story.append(
        screenshot_grid(
            [
                (
                    "03-gameplay-castle.png",
                    "图 3  幽光古堡场景。角色：小法师猫、幽灵；展示基础符咒队列和完整战斗界面。",
                ),
                (
                    "04-gameplay-ocean.png",
                    "图 4  深海飞船长廊。角色：小法师猫、水母、河豚、鲨鱼、巨齿鲨 Boss。",
                ),
            ],
            styles,
        )
    )
    story.append(PageBreak())
    story.append(
        screenshot_grid(
            [
                (
                    "05-gameplay-penguin.png",
                    "图 5  极光企鹅酒店。角色：小法师猫、企鹅门童、企鹅厨师、帝企鹅 Boss。",
                ),
                (
                    "06-gameplay-dinosaur.png",
                    "图 6  恐龙乐园。角色：小法师猫、翼龙、三角龙、腕龙、霸王龙 Boss。",
                ),
            ],
            styles,
        )
    )
    story.append(PageBreak())
    story.append(
        screenshot_grid(
            [
                (
                    "07-gameplay-sky-city.png",
                    "图 7  天空之城。角色：小法师猫、云灵、翼卫、圣殿狮鹫 Boss。",
                ),
                (
                    "08-gameplay-sea-train.png",
                    "图 8  海上列车。角色：小法师猫、纸灵、浪灯、列车长 Boss。",
                ),
            ],
            styles,
        )
    )
    story.append(PageBreak())

    story.append(p("3. 主角形象与主要战斗系统", styles["h2"]))
    story.append(
        screenshot_grid(
            [
                (
                    "09-hero-actions.png",
                    "图 9  主角小法师猫的全部动作形象：行走、施法和受击。",
                ),
                (
                    "10-combat-systems.png",
                    "图 10  触摸画符、符咒队列、连击倍率、紫色闪电、血瓶、生命值、得分及声音控制系统。",
                ),
            ],
            styles,
        )
    )
    story.append(Spacer(1, 7))
    systems = [
        [p("系统", styles["cell_bold"]), p("可体验内容", styles["cell_bold"])],
        [p("健康忠告与启动", styles["cell"]), p("启动时显示健康游戏忠告，点击后进入带游戏名称的主界面。", styles["cell"])],
        [p("难度系统", styles["cell"]), p("每关可选择普通难度或 +1 难度。", styles["cell"])],
        [p("手势识别系统", styles["cell"]), p("支持上、下、左、右、V、L、圆形、Z、M、S 十类符咒。", styles["cell"])],
        [p("敌人与 Boss 系统", styles["cell"]), p("普通敌人和 Boss 携带不同长度的符号队列，并按关卡逐步增强。", styles["cell"])],
        [p("连击计分系统", styles["cell"]), p("连续有效施法累积 Combo，并按档位获得消除分数倍率。", styles["cell"])],
        [p("道具系统", styles["cell"]), p("紫色闪电攻击当前敌人，血瓶恢复一颗生命。", styles["cell"])],
        [p("生命与反馈系统", styles["cell"]), p("五颗爱心、受击扣血、角色受击动画和移动端短震动反馈。", styles["cell"])],
        [p("场景与关卡系统", styles["cell"]), p("六套随机主题、关卡时间轴、阶段过渡和符咒逐步解锁。", styles["cell"])],
        [p("音频系统", styles["cell"]), p("各主题循环背景音乐、消灭音效和声音开关。", styles["cell"])],
        [p("结算与重开系统", styles["cell"]), p("六关通关、生命耗尽失败、得分展示及点击重新开始。", styles["cell"])],
    ]
    story.append(table(systems, [42 * mm, 112 * mm]))
    story.append(PageBreak())

    story.append(p("4. 关卡过渡与结束流程", styles["h2"]))
    story.append(
        screenshot_grid(
            [
                (
                    "11-level-transition.png",
                    "图 11  关卡过渡页。显示下一场景名称、新符咒提示，并允许重新选择本关难度。",
                ),
                (
                    "12-win.png",
                    "图 12  六关通关页。显示最终得分和“点击再来一局”入口。",
                ),
            ],
            styles,
        )
    )
    story.append(Spacer(1, 8))
    story.append(
        screenshot_grid(
            [
                (
                    "13-lose.png",
                    "图 13  生命耗尽失败页。显示本局得分和“点击重试”入口，完成从开始到结束的闭环。",
                ),
            ],
            styles,
        )
    )
    story.append(Spacer(1, 8))
    story.append(p("5. 主要特点", styles["h2"]))
    story.append(
        bullets(
            [
                "原创角色与六套主题场景结合，每局主题顺序随机且不重复。",
                "通过触摸轨迹识别十类符咒，将手势操作直接转化为施法攻击。",
                "敌人符号队列、逐关解锁符咒和 Boss 挑战共同形成由易到难的关卡体验。",
                "连击倍率与紫色闪电、血瓶道具联动，兼顾连续操作奖励和生存策略。",
                "采用 Canvas 全屏渲染，提供滚动背景、角色动画、敌人动画、攻击特效、音效和震动反馈。",
            ],
            styles["body"],
        )
    )
    story.append(PageBreak())


def add_overview(story: list, styles: dict[str, ParagraphStyle]) -> None:
    story.append(p("一、软件概述", styles["h1"]))
    story.append(
        p(
            "《猫咪的符咒学院游戏软件》是一款运行于微信小游戏平台的原创休闲益智游戏软件。"
            "软件以触摸手势绘制、符号识别、敌人消除和多关卡闯关为核心，玩家通过在"
            "移动设备屏幕上绘制符咒轨迹完成施法，击退不断靠近主角的敌人。软件使用"
            "原生 JavaScript 编写，采用 Canvas 完成图像渲染和动画表现，适用于支持"
            "微信小游戏运行环境的智能手机和平板设备。",
            styles["body"],
        )
    )
    metadata = [
        [p("项目", styles["cell_bold"]), p("内容", styles["cell_bold"])],
        [p("软件全称", styles["cell"]), p(SOFTWARE_NAME, styles["cell"])],
        [p("版本号", styles["cell"]), p(VERSION, styles["cell"])],
        [p("软件类型", styles["cell"]), p("游戏软件、微信小游戏、小程序", styles["cell"])],
        [p("编程语言", styles["cell"]), p("JavaScript", styles["cell"])],
        [p("开发工具", styles["cell"]), p("微信开发者工具、VS Code、Node.js", styles["cell"])],
        [p("支持软件", styles["cell"]), p("微信客户端、微信小游戏基础库", styles["cell"])],
    ]
    story.append(table(metadata, [32 * mm, 122 * mm]))
    story.append(Spacer(1, 6))
    story.append(p("二、开发目的", styles["h1"]))
    story.append(
        p(
            "本软件面向移动互联网休闲游戏用户，提供一款具有原创角色、原创主题场景和"
            "触摸画符玩法的小游戏。软件通过方向、字母、圆形等手势符号识别机制，引导"
            "玩家在轻量操作中完成反应判断、连续施法、道具使用和关卡挑战，满足用户在"
            "碎片化时间中的娱乐体验需求。",
            styles["body"],
        )
    )
    story.append(p("三、适用范围", styles["h1"]))
    story.append(
        bullets(
            [
                "适用用户：微信小游戏用户、休闲益智游戏玩家、轻量闯关游戏玩家。",
                "适用设备：支持微信客户端和微信小游戏运行环境的 iOS、Android 智能终端。",
                "适用场景：移动端休闲娱乐、手势反应训练、短时闯关体验。",
            ],
            styles["body"],
        )
    )


def add_environment(story: list, styles: dict[str, ParagraphStyle]) -> None:
    story.append(p("四、软硬件环境", styles["h1"]))
    env = [
        [p("类别", styles["cell_bold"]), p("说明", styles["cell_bold"])],
        [p("开发硬件环境", styles["cell"]), p("MacBook 或 PC 计算机，8GB 内存及以上。", styles["cell"])],
        [p("运行硬件环境", styles["cell"]), p("支持微信小游戏的智能手机和平板设备。", styles["cell"])],
        [p("开发操作系统", styles["cell"]), p("macOS、Windows。", styles["cell"])],
        [p("运行操作系统", styles["cell"]), p("iOS、Android。", styles["cell"])],
        [p("开发工具", styles["cell"]), p("微信开发者工具 3.7.12、VS Code、Node.js。", styles["cell"])],
        [p("运行支撑软件", styles["cell"]), p("微信客户端、微信小游戏基础库。", styles["cell"])],
    ]
    story.append(table(env, [40 * mm, 114 * mm]))


def add_structure(story: list, styles: dict[str, ParagraphStyle]) -> None:
    story.append(p("五、软件结构", styles["h1"]))
    story.append(
        p(
            "软件采用模块化结构组织代码，入口文件负责创建画布、初始化资源、绑定输入事件"
            "并启动游戏循环；核心状态模块负责玩家生命、得分、关卡、敌人、连击、道具和"
            "胜负状态；渲染模块负责界面绘制、背景滚动、角色动画、敌人动画和特效表现。",
            styles["body"],
        )
    )
    modules = [
        [p("模块", styles["cell_bold"]), p("文件", styles["cell_bold"]), p("职责", styles["cell_bold"])],
        [p("入口初始化", styles["cell"]), p("game.js、src/main.js", styles["cell"]), p("创建 Canvas、读取系统信息、初始化状态、输入、渲染和音频。", styles["cell"])],
        [p("游戏状态", styles["cell"]), p("src/core/GameState.js", styles["cell"]), p("管理关卡流程、生命值、分数、连击、道具、敌人和胜负状态。", styles["cell"])],
        [p("手势识别", styles["cell"]), p("src/input/GestureRecognizer.js", styles["cell"]), p("识别方向、V、L、圆形、Z、M、S 等符咒轨迹。", styles["cell"])],
        [p("输入管理", styles["cell"]), p("src/input/InputManager.js", styles["cell"]), p("绑定触摸事件，区分点击和绘制轨迹。", styles["cell"])],
        [p("关卡调度", styles["cell"]), p("src/levels/LevelDirector.js", styles["cell"]), p("按照时间轴生成敌人、控制关卡进度和 Boss。", styles["cell"])],
        [p("主题配置", styles["cell"]), p("src/levels/Themes.js", styles["cell"]), p("配置主题名称、背景、音乐、敌人种类和主题顺序。", styles["cell"])],
        [p("渲染表现", styles["cell"]), p("src/render/Renderer.js", styles["cell"]), p("绘制角色、场景、敌人、UI、符号提示和动画特效。", styles["cell"])],
        [p("音频管理", styles["cell"]), p("src/audio/SoundManager.js", styles["cell"]), p("播放主题背景音乐、消除音效和震动反馈。", styles["cell"])],
        [p("资源加载", styles["cell"]), p("src/assets/AssetManager.js", styles["cell"]), p("加载角色、敌人、符咒图标和背景资源。", styles["cell"])],
    ]
    story.append(table(modules, [25 * mm, 42 * mm, 87 * mm]))


def add_features(story: list, styles: dict[str, ParagraphStyle]) -> None:
    story.append(p("六、主要功能说明", styles["h1"]))
    feature_sections = [
        (
            "1. 游戏启动与画布初始化",
            "软件在微信小游戏环境中调用平台能力创建 Canvas 画布，读取窗口宽高和像素比，"
            "设置竖屏全屏显示区域，并初始化游戏状态、输入管理器、渲染器、资源管理器和音频管理器。",
        ),
        (
            "2. 手势输入识别",
            "用户在屏幕上绘制轨迹后，软件对触摸点进行简化和边界计算，并根据路径长度、"
            "方向、角度变化、闭合程度及关键拐点判断符咒类型。当前支持上、下、左、右、V、L、圆形、Z、M、S 等符号。",
        ),
        (
            "3. 符咒攻击与敌人消除",
            "敌人携带符号队列，玩家绘制匹配符号后可命中敌人。多符号敌人需要按队列顺序"
            "连续绘制，队列清空后敌人消失并获得分数。",
        ),
        (
            "4. 关卡流程控制",
            "软件内置多关卡时间轴，每个关卡按时间、轨道、速度、符号组合、敌人半径、分值"
            "和敌人类型生成普通敌人及 Boss。关卡完成后进入下一关难度选择。",
        ),
        (
            "5. 主题场景管理",
            "软件配置幽光古堡、深海飞船长廊、极光企鹅酒店、恐龙乐园、天空之城、海上列车等"
            "主题。每套主题可绑定背景、音乐、敌人种类和符咒颜色，并支持每局随机主题顺序。",
        ),
        (
            "6. 难度、连击和计分",
            "每关开始前用户可选择普通难度或增强难度。有效施法会累积 Combo，消除敌人时根据"
            "连击档位获得分数倍率；失误、掉心或切换关卡时连击清零。",
        ),
        (
            "7. 道具与生命系统",
            "达到指定连击数后用户可获得紫色闪电和血瓶道具。紫色闪电可攻击当前敌人，血瓶可"
            "恢复一颗生命。敌人接触主角时扣除生命并触发受击反馈，生命归零后游戏失败。",
        ),
        (
            "8. 音频与视觉表现",
            "软件支持主题背景音乐、消除音效、声音开关、短震动反馈、角色行走动画、施法动画、"
            "受击动画、敌人动画、滚动背景、闪电攻击、消除和道具飞入等视觉效果。",
        ),
    ]
    for title, body in feature_sections:
        story.append(KeepTogether([p(title, styles["h2"]), p(body, styles["body"])]))


def add_operations(story: list, styles: dict[str, ParagraphStyle]) -> None:
    story.append(p("七、操作流程", styles["h1"]))
    story.append(
        number_list(
            [
                "用户打开微信小游戏，进入标题界面。",
                "用户选择普通难度或增强难度后开始第一关。",
                "软件显示主角、场景、敌人、生命值、分数、声音开关和道具栏。",
                "敌人上方显示当前需要绘制的符咒或符号队列提示。",
                "用户根据提示在屏幕上绘制对应符号。",
                "软件识别触摸轨迹，并判断是否与敌人当前符号匹配。",
                "命中后敌人符号队列减少；队列清空后敌人消失并增加得分。",
                "连续有效施法累积 Combo，达到指定条件后获得道具。",
                "用户可点击紫色闪电攻击敌人，或点击血瓶恢复生命。",
                "敌人到达主角位置时扣除生命值，并播放受击反馈。",
                "当前关卡敌人全部清除后进入下一关难度选择。",
                "全部关卡完成后游戏胜利；生命归零则游戏失败，用户可重新开始。",
            ],
            styles["body"],
        )
    )


def add_ui_and_assets(story: list, styles: dict[str, ParagraphStyle]) -> None:
    story.append(p("八、界面与资源说明", styles["h1"]))
    story.append(
        p(
            "软件界面采用竖屏布局，主角固定在屏幕下方，敌人从远端沿多条轨道向主角靠近。"
            "界面显示关卡、分数、生命、连击、道具和声音开关。背景通过循环滚动形成角色持续前进的视觉效果。",
            styles["body"],
        )
    )
    symbol_paths = [
        ROOT / "assets/images/symbol-up.png",
        ROOT / "assets/images/symbol-down.png",
        ROOT / "assets/images/symbol-left.png",
        ROOT / "assets/images/symbol-right.png",
        ROOT / "assets/images/symbol-v.png",
        ROOT / "assets/images/symbol-l.png",
        ROOT / "assets/images/symbol-circle.png",
        ROOT / "assets/images/symbol-z.png",
        ROOT / "assets/images/symbol-m.png",
        ROOT / "assets/images/symbol-s.png",
    ]
    icon_row = []
    for path in symbol_paths:
        img = image_flowable(path, 11 * mm, 11 * mm)
        if img:
            icon_row.append(img)
    if icon_row:
        story.append(table([icon_row], [14 * mm] * len(icon_row), header=False))
        story.append(p("图 1 符咒提示图标示例", styles["small"]))
    story.append(
        bullets(
            [
                "角色资源：行走、施法、受击三类透明精灵图。",
                "敌人资源：幽灵、深海怪物、企鹅酒店怪物、恐龙怪物及 Boss 精灵图。",
                "场景资源：古堡长廊、深海飞船长廊、企鹅酒店长廊、恐龙乐园等循环背景。",
                "音频资源：不同主题的循环背景音乐及敌人消除音效。",
            ],
            styles["body"],
        )
    )


def add_rules(story: list, styles: dict[str, ParagraphStyle]) -> None:
    story.append(p("九、关卡与玩法规则", styles["h1"]))
    rules = [
        [p("规则类别", styles["cell_bold"]), p("说明", styles["cell_bold"])],
        [p("符咒解锁", styles["cell"]), p("基础方向符号从第一关开始使用，圆形、Z、M、S 等符号随关卡逐步加入。", styles["cell"])],
        [p("敌人队列", styles["cell"]), p("普通敌人与 Boss 均可携带多个符号，玩家需按当前符号提示依次绘制。", styles["cell"])],
        [p("隐藏提示", styles["cell"]), p("第二关起敌人主要展示当前符号，未揭示符号以圆点数量提示。", styles["cell"])],
        [p("Boss 挑战", styles["cell"]), p("每关末尾生成 Boss，Boss 符号队列更长、分值更高、移动速度较慢但挑战强度更高。", styles["cell"])],
        [p("连击奖励", styles["cell"]), p("Combo 达到 3、5、10、20、50、100 等档位后提升消除得分倍率。", styles["cell"])],
        [p("道具奖励", styles["cell"]), p("Combo 达到 10 的倍数获得紫色闪电，达到 15 的倍数获得血瓶。", styles["cell"])],
        [p("胜负判定", styles["cell"]), p("全部关卡完成为胜利，生命值归零为失败，胜利或失败后均可重新开始。", styles["cell"])],
    ]
    story.append(table(rules, [34 * mm, 120 * mm]))


def add_technical(story: list, styles: dict[str, ParagraphStyle]) -> None:
    story.append(p("十、技术特点", styles["h1"]))
    story.append(
        bullets(
            [
                "采用原生 JavaScript 和微信小游戏 Canvas API 实现，无需额外数据库。",
                "采用模块化文件结构，降低入口、状态、渲染、输入、关卡、音频和资源之间的耦合。",
                "手势识别算法基于触摸点简化、路径长度、边界比例、角度变化和关键拐点。",
                "关卡采用时间轴刷怪机制，便于配置敌人生成时间、轨道、速度、符号队列和分值。",
                "主题系统统一管理背景、音乐、敌人种类和符咒颜色，并支持随机主题顺序。",
                "计分系统结合命中、消除、连击倍率和道具奖励，形成持续反馈。",
                "资源管理模块加载位图素材，渲染模块在资源缺失时可提供 Canvas 绘制回退。",
                "音频模块支持循环背景音乐、短音效、声音开关和微信短震动反馈。",
            ],
            styles["body"],
        )
    )


def add_tests_and_maintenance(story: list, styles: dict[str, ParagraphStyle]) -> None:
    story.append(p("十一、测试与维护", styles["h1"]))
    story.append(
        p(
            "项目包含针对手势识别、游戏状态、资源管理、关卡调度、渲染逻辑和音频管理的"
            "本地测试文件。维护人员可在修改核心逻辑后运行测试，检查符号识别、关卡推进、"
            "道具获得、生命扣减、音频开关和渲染回退等行为是否符合预期。",
            styles["body"],
        )
    )
    tests = [
        [p("测试文件", styles["cell_bold"]), p("验证内容", styles["cell_bold"])],
        [p("test/gesture.test.js", styles["cell"]), p("验证方向、形状、圆形及复杂符号的手势识别逻辑。", styles["cell"])],
        [p("test/game-state.test.js", styles["cell"]), p("验证游戏状态、计分、生命、道具和胜负流程。", styles["cell"])],
        [p("test/level-director.test.js", styles["cell"]), p("验证关卡时间轴、刷怪和完成判定。", styles["cell"])],
        [p("test/renderer.test.js", styles["cell"]), p("验证渲染器绘制流程和资源回退逻辑。", styles["cell"])],
        [p("test/sound-manager.test.js", styles["cell"]), p("验证音频播放、切换和停止逻辑。", styles["cell"])],
        [p("test/asset-manager.test.js", styles["cell"]), p("验证图片资源加载与缓存行为。", styles["cell"])],
    ]
    story.append(table(tests, [48 * mm, 106 * mm]))


def add_appendix(story: list, styles: dict[str, ParagraphStyle]) -> None:
    story.append(p("十二、附录：登记信息摘要", styles["h1"]))
    items = [
        "软件运行支撑环境 / 支持软件：微信客户端、微信小游戏基础库。",
        "开发的硬件环境：MacBook 或 PC 计算机，8GB 内存及以上。",
        "运行的硬件环境：支持微信小游戏的智能手机和平板设备。",
        "开发该软件的操作系统：macOS、Windows。",
        "该软件的运行平台 / 操作系统：微信小游戏平台，iOS、Android。",
        "面向领域 / 行业：文化娱乐、休闲游戏、移动互联网应用。",
        "程序鉴别材料：一般交存，源程序前连续 30 页和后连续 30 页。",
        "文档鉴别材料：一般交存，提交本软件说明书 PDF。",
    ]
    story.append(bullets(items, styles["body"]))
    story.append(p("十三、结语", styles["h1"]))
    story.append(
        p(
            "本说明书依据当前项目文件、配置、资源和核心代码整理，用于描述《猫咪的符咒学院游戏软件》"
            "的开发目的、运行环境、软件结构、主要功能、操作流程和技术特点。文档内容与当前项目"
            "实现保持一致，可作为软件著作权登记的文档鉴别材料使用。",
            styles["body"],
        )
    )


def add_reference_appendices(story: list, styles: dict[str, ParagraphStyle]) -> None:
    appendix_pages = [
        (
            "附录 A：用户角色与使用场景",
            [
                "普通玩家：通过微信客户端进入小游戏，进行符咒绘制、敌人消除、关卡挑战和分数积累。",
                "首次体验用户：在标题界面选择难度后即可进入第一关，无需注册账号和外部配置。",
                "休闲游戏用户：可在短时间内完成单局闯关，通关或失败后可快速重新开始。",
                "维护人员：通过项目源码、测试脚本和资源目录维护关卡、素材、音频和玩法参数。",
                "登记材料使用者：可依据本说明书了解软件目的、结构、功能、流程和技术特点。",
            ],
        ),
        (
            "附录 B：启动流程详细说明",
            [
                "入口文件 game.js 加载 src/main.js，src/main.js 负责执行 bootstrap 初始化逻辑。",
                "初始化阶段读取微信小游戏系统信息，获得窗口宽度、窗口高度和设备像素比。",
                "软件创建 Canvas 对象，按像素比设置真实画布尺寸，并按逻辑尺寸设置显示区域。",
                "软件创建资源管理器、音频管理器、游戏状态对象、输入管理器和渲染器。",
                "软件绑定触摸输入回调，并通过 requestAnimationFrame 或兼容方式启动主循环。",
            ],
        ),
        (
            "附录 C：主循环处理说明",
            [
                "主循环计算本帧与上一帧之间的时间差，并限制单帧时间差，避免异常卡顿导致状态跳变。",
                "游戏状态对象根据当前界面判断是否需要推进关卡、敌人、碰撞、动画和胜负状态。",
                "渲染器在每一帧读取游戏状态和输入状态，绘制背景、敌人、主角、UI、手势轨迹和特效。",
                "当用户处于标题页、关卡过渡页、胜利页或失败页时，游戏不会继续推进敌人移动。",
                "循环逻辑独立于具体关卡配置，使关卡内容可通过时间轴数据维护。",
            ],
        ),
        (
            "附录 D：输入管理详细说明",
            [
                "输入管理器监听触摸开始、触摸移动和触摸结束事件，并记录触摸点坐标序列。",
                "当用户触摸移动形成轨迹时，输入管理器将点集提交给手势识别模块。",
                "当用户进行短触摸或点击时，输入管理器将点击位置提交给游戏状态对象。",
                "点击事件用于声音开关、难度选择、道具使用、通关失败后的重新开始等交互。",
                "绘制轨迹和点击交互分离处理，避免道具按钮与施法轨迹互相干扰。",
            ],
        ),
        (
            "附录 E：手势识别规则说明",
            [
                "识别前先对触摸点进行简化，过滤距离过近的点，降低抖动对判断结果的影响。",
                "方向符号通过起点、终点、横向位移、纵向位移和路径边界判断。",
                "圆形符号通过路径闭合距离、路径长度、宽高比例和角度累计变化判断。",
                "V、L、Z、M、S 等符号通过关键拐点、端点位置、宽高比例和轨迹方向判断。",
                "当轨迹长度不足或特征不满足任何符号条件时，识别结果为未知符号。",
            ],
        ),
        (
            "附录 F：符咒类型说明",
            [
                "方向类符咒：上、下、左、右，适合基础关卡中快速判断和绘制。",
                "折线类符咒：V、L、Z、M、S，要求玩家按形状绘制明显拐点。",
                "闭合类符咒：圆形，要求玩家完成接近闭合的环形轨迹。",
                "符咒提示通过敌人上方的图标展示，后续关卡会隐藏部分符号队列。",
                "符咒类型随关卡逐步增加，形成由易到难的学习和挑战过程。",
            ],
        ),
        (
            "附录 G：敌人对象说明",
            [
                "敌人对象包含位置、速度、半径、分值、类型、符号队列和展示方式等属性。",
                "每一帧敌人根据主角位置和速度向主角移动，接触主角后触发扣除生命。",
                "敌人可携带一个或多个符号，玩家每次绘制匹配符号后移除队列首项。",
                "队列清空后敌人进入死亡状态，并由游戏状态对象移除。",
                "Boss 敌人通常具有更长符号队列、更大半径和更高分值。",
            ],
        ),
        (
            "附录 H：关卡时间轴说明",
            [
                "关卡配置采用时间轴数据，每个生成项包含生成时间、轨道、符号、速度、半径和分值。",
                "关卡调度器根据游戏已进行时间逐项生成敌人，并记录当前生成索引。",
                "当时间轴生成完毕且场上敌人清空时，当前关卡判定为完成。",
                "每个关卡末尾配置 Boss 敌人，使关卡流程具有明显阶段目标。",
                "时间轴数据集中维护，便于后续调整关卡长度、节奏、敌人组合和难度。",
            ],
        ),
        (
            "附录 I：主题系统说明",
            [
                "主题系统统一配置主题编号、主题名称、背景资源、音乐资源、符咒颜色和敌人种类。",
                "当前项目包含幽光古堡、深海飞船长廊、极光企鹅酒店、恐龙乐园、天空之城和海上列车。",
                "每局游戏可生成随机主题顺序，避免固定主题顺序带来的重复感。",
                "主题内容不改变基础关卡规则，但会改变视觉表现、音乐氛围和敌人外观。",
                "主题配置与关卡时间轴分离，使玩法逻辑和美术表现可独立维护。",
            ],
        ),
        (
            "附录 J：难度系统说明",
            [
                "标题页和关卡过渡页均提供普通难度和增强难度选择。",
                "普通难度使用基础时间倍率，适合首次体验和常规闯关。",
                "增强难度提高敌人移动、刷怪节奏和场景滚动速度，适合追求挑战的玩家。",
                "难度选择会影响当前关卡节奏，但得分、生命和道具会在关卡之间延续。",
                "每关重新选择难度，既保留连续闯关体验，也提供阶段性调整空间。",
            ],
        ),
        (
            "附录 K：连击计分说明",
            [
                "玩家每次有效施法命中敌人后累积一次 Combo。",
                "Combo 达到 3、5、10、20、50、100 等档位时，消除得分倍率逐步提升。",
                "命中但未消除敌人时可获得部分命中分数，清空符号队列后获得消除分数。",
                "Miss、敌人碰到主角或切换关卡会清空当前连击。",
                "连击系统强化连续正确绘制的反馈，提升玩法节奏感和挑战性。",
            ],
        ),
        (
            "附录 L：道具系统说明",
            [
                "Combo 达到 10 的倍数时，玩家获得紫色闪电道具。",
                "Combo 达到 15 的倍数时，玩家获得血瓶道具。",
                "紫色闪电可攻击当前场上的敌人；没有目标时不会消耗道具。",
                "血瓶可恢复一颗生命；生命已满时不会消耗道具。",
                "道具库存显示在界面侧边，并通过点击触发使用逻辑。",
            ],
        ),
        (
            "附录 M：生命与胜负说明",
            [
                "玩家初始拥有固定数量生命，生命值通过界面爱心显示。",
                "敌人移动到主角位置后扣除生命，并触发受击动画、生命扣减反馈和短震动。",
                "生命值降为零时，软件停止关卡推进并进入失败界面。",
                "全部关卡完成且场上敌人清空后，软件进入胜利界面。",
                "胜利或失败后，用户点击屏幕可回到标题界面并重新开始。",
            ],
        ),
        (
            "附录 N：音频控制说明",
            [
                "音频管理器基于微信小游戏 InnerAudioContext 播放背景音乐和音效。",
                "不同主题可绑定不同循环背景音乐，切换关卡主题时切换对应曲目。",
                "敌人消除时播放短音效，增强操作反馈。",
                "用户可通过界面右上角声音开关随时开启或关闭音乐及音效。",
                "受到伤害时可调用微信短震动接口，提供移动端触觉反馈。",
            ],
        ),
        (
            "附录 O：渲染系统说明",
            [
                "渲染器负责绘制背景、敌人、主角、符咒提示、生命、分数、连击、道具和操作界面。",
                "背景采用循环滚动方式表现角色持续前进的效果。",
                "角色包含行走、施法和受击动画，施法与受击动画具有独立播放窗口。",
                "敌人可根据种类使用精灵图动画，也可在资源缺失时回退为 Canvas 绘制。",
                "特效包括施法、闪电、消除、道具飞入、生命扣减和连击徽章变化。",
            ],
        ),
        (
            "附录 P：资源加载说明",
            [
                "资源管理器负责加载图片资源，并以键值形式缓存资源对象。",
                "主角资源包括行走、施法和受击三类透明精灵图。",
                "符咒资源包括上、下、左、右、V、L、圆形、Z、M、S 等提示图标。",
                "场景资源包括多套主题背景图，音频资源包括主题背景音乐和消除音效。",
                "资源加载与渲染逻辑分离，便于替换美术资源和扩展主题内容。",
            ],
        ),
        (
            "附录 Q：界面控件说明",
            [
                "难度选择控件用于标题页和关卡过渡页，返回用户点击的难度模式。",
                "声音开关控件根据点击位置切换音频状态，并在界面中显示当前状态。",
                "道具栏控件根据当前库存绘制道具槽，并判断用户点击的道具类型。",
                "界面控件均以画布坐标计算命中区域，适配不同宽高的移动设备。",
                "控件逻辑与核心状态分离，使交互区域和业务处理职责清晰。",
            ],
        ),
        (
            "附录 R：异常与边界处理",
            [
                "当微信 API 不存在时，初始化逻辑可在浏览器预览环境中创建 DOM Canvas 作为回退。",
                "当 requestAnimationFrame 不存在时，软件使用定时器模拟帧循环。",
                "当 Canvas roundRect 不存在时，软件补充兼容实现。",
                "当图片资源未能加载时，渲染器可使用程序化绘制方式展示角色或敌人。",
                "当用户在无目标或生命已满时使用道具，软件提示状态但不消耗库存。",
            ],
        ),
        (
            "附录 S：项目文件清单",
            [
                "game.js：小游戏入口文件，加载主程序。",
                "game.json：小游戏全局配置，设置竖屏方向和网络超时时间。",
                "project.config.json：微信开发者工具项目配置，包含 AppID、编译类型和基础库版本。",
                "src/：核心源代码目录，包含状态、输入、渲染、关卡、音频、资源和 UI 模块。",
                "assets/：图片和音频资源目录，包含角色、敌人、背景、符咒图标和音频素材。",
                "test/：本地测试目录，包含核心模块的行为测试。",
            ],
        ),
        (
            "附录 T：测试用例摘要",
            [
                "手势测试：输入方向、圆形、折线和复杂符号轨迹，验证识别结果是否正确。",
                "状态测试：模拟命中、Miss、受击、道具获得和使用，验证得分与生命变化。",
                "关卡测试：推进时间轴，验证敌人生成顺序和关卡完成判定。",
                "资源测试：验证图片加载、缓存和缺失资源处理。",
                "音频测试：验证音乐切换、停止、声音开关和音效播放条件。",
                "渲染测试：验证主渲染流程和关键绘制方法在模拟上下文下可正常执行。",
            ],
        ),
        (
            "附录 U：部署与运行步骤",
            [
                "打开微信开发者工具，选择小游戏项目类型。",
                "导入当前项目目录，并使用项目配置中的 AppID 或测试号。",
                "点击编译，等待模拟器加载游戏标题界面。",
                "在模拟器中选择难度并进入游戏，检查角色、敌人、背景和声音开关是否正常。",
                "真机预览时，修改代码或资源后应重新编译并重新生成预览二维码。",
            ],
        ),
        (
            "附录 V：维护与扩展建议",
            [
                "新增符咒时，应同步更新手势识别模块、符号标签、符号图标、关卡配置和测试用例。",
                "新增主题时，应在主题配置中加入背景资源、音乐资源、敌人种类和符咒颜色。",
                "调整难度时，应优先修改时间倍率、敌人速度和时间轴节奏，而非直接改动主循环。",
                "替换资源时，应保持图片路径和资源键一致，或同步更新资源加载配置。",
                "发布前应运行本地测试，并在微信开发者工具和真机预览中进行交互验证。",
            ],
        ),
        (
            "附录 W：软著登记填报摘要",
            [
                "软件运行支撑环境 / 支持软件：微信客户端、微信小游戏基础库。",
                "编程语言：JavaScript。",
                "开发目的：提供原创手势符咒闯关休闲小游戏体验。",
                "面向领域 / 行业：文化娱乐、休闲游戏、移动互联网应用。",
                "技术特点分类：小程序；如支持多选，可同时选择游戏软件。",
            ],
        ),
        (
            "附录 X：材料交存说明",
            [
                "程序鉴别材料采用一般交存方式，提交源程序前连续三十页和后连续三十页。",
                "文档鉴别材料采用一般交存方式，提交本软件说明书 PDF。",
                "程序材料和文档材料均以 PDF 格式生成，可直接用于登记系统上传。",
                "如登记系统要求补充申请人、完成日期、首次发表日期等信息，应按真实情况填写。",
                "如项目后续代码发生较大变化，应重新统计源程序量并重新生成程序鉴别材料。",
            ],
        ),
    ]

    for title, points in appendix_pages:
        story.append(Spacer(1, 5))
        story.append(p(title, styles["h1"]))
        story.append(
            p(
                "本页用于补充说明软件实现细节，内容依据当前项目结构、配置文件、核心代码和资源目录整理。",
                styles["body"],
            )
        )
        story.append(bullets(points, styles["body"]))


def generate_manual_pdf() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(MANUAL_PDF),
        pagesize=A4,
        rightMargin=22 * mm,
        leftMargin=22 * mm,
        topMargin=18 * mm,
        bottomMargin=20 * mm,
        title=f"{SOFTWARE_NAME} 软件说明书",
        author="",
    )
    styles = build_styles()
    story: list = []
    add_cover(story, styles)
    add_compliance_visuals(story, styles)
    add_overview(story, styles)
    add_environment(story, styles)
    add_structure(story, styles)
    add_features(story, styles)
    add_operations(story, styles)
    add_ui_and_assets(story, styles)
    add_rules(story, styles)
    add_technical(story, styles)
    add_tests_and_maintenance(story, styles)
    add_appendix(story, styles)
    add_reference_appendices(story, styles)
    doc.build(story, onFirstPage=manual_footer, onLaterPages=manual_footer)
    return 0


def count_pdf_pages(path: Path) -> int:
    raw = path.read_bytes()
    return len(re.findall(rb"/Type\s*/Page\b", raw))


def main() -> None:
    register_fonts()
    source_pages = generate_source_pdf()
    generate_manual_pdf()
    manual_pages = count_pdf_pages(MANUAL_PDF)
    print(f"Generated: {SOURCE_PDF} ({source_pages} pages)")
    print(f"Generated: {MANUAL_PDF} ({manual_pages} pages)")


if __name__ == "__main__":
    main()
