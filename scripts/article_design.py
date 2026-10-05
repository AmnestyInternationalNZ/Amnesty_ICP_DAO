"""Client-facing Amnesty article design, using unmodified application captures."""
from pathlib import Path
import html
import shutil
import zipfile

from PIL import Image
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

GREEN = colors.HexColor("#153d32")
YELLOW = colors.HexColor("#ffe500")
CREAM = colors.HexColor("#f5f4ec")
PALE = colors.HexColor("#e8efea")
GRAY = colors.HexColor("#51665d")
LINE = colors.HexColor("#c8d6cc")
WHITE = colors.white
STAGES = ["Sense-Making", "Inquiry", "Co-Design", "Synthesis", "Deliver"]

# Reader annotations sit outside the original application screenshot.
FIGURES = {
    "00-configurable-roles.png": ("MC", "Maya Chen", "Working Group lead", "Internal settings"),
    "00-configurable-formats.png": ("MC", "Maya Chen", "Working Group lead", "Internal settings"),
    "01-sense-making.png": ("WG", "Maya Chen + Ruth Okafor", "Working Group lead + member", "Internal discussion"),
    "02-inquiry-samira.png": ("SA", "Samira Ali", "Public contributor", "Own submission"),
    "03-inquiry-discussion.png": ("WG", "Maya, Samira + Ruth", "Lead, contributor + member", "Private thread"),
    "03-inquiry-collective.png": ("AD", "Amina Diallo", "Community contributor", "Own submission"),
    "03-inquiry-document.png": ("RO", "Ruth Okafor", "Working Group member", "Internal evidence"),
    "03-inquiry-roundtable.png": ("TS", "Tomas Silva", "Facilitator", "Internal evidence"),
    "04-co-design-advisor.png": ("LM", "Dr Leo Mensah", "Advisor", "Shared with Advisors"),
    "04-co-design-selected-copy.png": ("AD", "Amina Diallo", "Community contributor", "Selected public copy"),
    "05-co-design-community-feedback.png": ("AD", "Amina Diallo + Ruth Okafor", "Community contributor + member", "Private thread"),
    "05-process-suggestion.png": ("AD", "Amina Diallo + Maya Chen", "Community contributor + lead", "Private thread"),
    "05-process-filter.png": ("RO", "Ruth Okafor", "Working Group member", "Internal review"),
    "03-inquiry-custom-format.png": ("AD", "Amina Diallo + Ruth Okafor", "Community contributor + member", "Private thread"),
    "07-synthesis-findings.png": ("RO", "Ruth Okafor", "Working Group member", "Internal synthesis"),
    "07-synthesis-source-selection.png": ("RO", "Ruth Okafor", "Working Group member", "Internal evidence"),
    "08-synthesis-draft.png": ("RO", "Ruth Okafor", "Working Group member", "Internal draft"),
    "09-deliver.png": ("MC", "Maya Chen", "Working Group lead", "Delivery workspace"),
    "10-deliver-publication.png": ("AD", "Amina Diallo", "Community contributor", "Public snapshot"),
    "11-deliver-public-feedback.png": ("AD", "Amina Diallo + Maya Chen", "Community contributor + lead", "Private thread"),
    "12-withdrawn-original.png": ("ID", "Withdrawn contribution", "Original contributor's source record", "Minimal record"),
    "12-withdrawal-review.png": ("MC", "Maya Chen", "Working Group lead", "Internal review"),
    "12-withheld-publication.png": ("MC", "Maya Chen", "Working Group lead", "Withheld snapshot"),
    "13-reviewed-publication.png": ("MC", "Maya Chen", "Working Group lead", "Public snapshot"),
}

CALLOUTS = {
    0: ("A different responsibility, a different role", "Tomas can record a roundtable and discuss its input. Editing recommendations and publishing remain separate capabilities. Maya can revise these defaults in the existing settings."),
    1: ("More than one way to contribute", "Written submission / Collective input / Facilitated discussion / Roundtable / Consultation harvest / Document reference / Other. Maya's Community circle reuses the collective layout with guidance suited to this group."),
    2: ("A shared framework with room to return", "The five stages organise the work. A member can browse any stage without moving the group forward. Maya changes the recorded stage explicitly, and earlier consultations stay available."),
    3: ("Three choices, kept separate", "Samira agrees to internal use and selected quotation. Publishing her pseudonym is a separate choice. Her private return link gives her access to her own input and discussion without an account."),
    4: ("A clarification is part of the evidence", "Maya asks how the proposal works; Samira responds; Ruth checks the interpretation. The source-linked discussion remains available when the group develops findings."),
    8: ("The community can change the emerging proposal", "Maya shares a selected copy. Amina proposes a revision in her own thread. Ruth explains what changes in the recommendation. Sharing the copy never opens the internal working draft or other contributors' conversations."),
    9: ("Change the consultation, then explain the change", "Amina's suggestion is recorded with the other input. Maya adjusts the guidance, and Ruth can find process suggestions through the filter. The outcome remains visible in the contributor's thread."),
    10: ("Collective input need not erase different views", "The circle can bring several perspectives. Ruth records how disagreement will be handled, instead of treating one collective contribution as proof of a single shared position."),
    12: ("A recommendation carries its evidence and uncertainty", "Selected findings support the draft. Disagreement and unresolved questions remain alongside it, while publication is a separate approval step."),
    13: ("Deliver opens the next exchange", "Approved snapshot > public response > discussion > return to an earlier stage. Publishing does not automatically close the consultations or end community participation."),
    15: ("Withdrawal starts a review", "Original content removed > dependencies flagged > affected publication withheld. The minimal reference stays in the evidence trail; members decide which derived conclusions still have support."),
    16: ("Use this POC to test the experience", "Does it work now? Does it look coherent and trustworthy? Can the Commission change its mind? Testers can respond through the existing board and POC feedback consultation."),
}


def plain(text):
    return text.replace("\u2014", " - ").replace("\u2013", "-").replace("\u2011", "-").replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')


class Layout:
    def __init__(self, pdf, root, shots):
        self.root, self.shots = root, shots
        for name, file in [("Trade", "AmnestyTradeGothic.ttf"), ("TradeBold", "AmnestyTradeGothic-Bd2.ttf"), ("TradeCond", "AmnestyTradeGothic-Cn18.ttf")]:
            pdfmetrics.registerFont(TTFont(name, str(root / "frontend/src/assets/fonts" / file)))
        self.c = canvas.Canvas(str(pdf), pagesize=A4)
        self.c.setTitle("Working Group 2: Accountability mechanisms for a new world")
        self.c.setAuthor("2048 consultation rehearsal")
        self.w, self.h = A4
        self.x, self.width = 40, self.w - 80
        self.logo = ImageReader(str(root / "frontend/src/assets/branding/amnesty-logo-yellow.png"))
        self.page = 0
        self.bounds = []

    def para(self, text, x, top, width, size=11, leading=15, font="Trade", color=GREEN, measure=False):
        style = ParagraphStyle("text", fontName=font, fontSize=size, leading=leading, textColor=color)
        p = Paragraph(html.escape(plain(text)), style)
        _, height = p.wrap(width, 2000)
        if not measure:
            if top - height < 48:
                raise ValueError(f"Page {self.page}: text would cross the footer ({top-height:.1f}).")
            p.drawOn(self.c, x, top - height)
        return top - height

    def fill(self, color, x, y, width, height, radius=0):
        self.c.setFillColor(color)
        if radius:
            self.c.roundRect(x, y, width, height, radius, fill=1, stroke=0)
        else:
            self.c.rect(x, y, width, height, fill=1, stroke=0)

    def text(self, text, x, y, size=10, font="Trade", color=GREEN):
        self.c.setFont(font, size)
        self.c.setFillColor(color)
        self.c.drawString(x, y, plain(text))

    def footer(self, cover=False):
        self.c.setStrokeColor(LINE)
        self.c.setLineWidth(.5)
        self.c.line(40, 39, self.w - 40, 39)
        self.text("2048 COMMISSION  /  FICTIONAL CONSULTATION REHEARSAL", 40, 24, 8, "TradeBold", GRAY)
        self.c.setFont("TradeBold", 9)
        self.c.setFillColor(GREEN)
        self.c.drawRightString(self.w - 40, 24, f"{self.page:02}")

    def start(self, label, stage=0):
        if self.page:
            self.c.showPage()
        self.page += 1
        self.fill(CREAM, 0, 0, self.w, self.h)
        self.fill(GREEN, 0, self.h - 59, self.w, 59)
        self.c.drawImage(self.logo, 40, self.h - 47, width=88, height=37.3)
        self.text("2048", 145, self.h - 36, 26, "TradeCond", WHITE)
        self.c.setFont("TradeBold", 9)
        self.c.setFillColor(YELLOW)
        self.c.drawRightString(self.w - 40, self.h - 28, label.upper())
        self.ribbon(self.h - 92, stage)
        self.footer()
        return self.h - 113

    def ribbon(self, top, stage):
        gap = 5
        width = (self.width - gap * 4) / 5
        for i, name in enumerate(STAGES, 1):
            x = self.x + (i - 1) * (width + gap)
            active = i == stage
            self.fill(YELLOW if active else PALE, x, top - 23, width, 23, 3)
            self.text(f"{i}  {name}", x + 7, top - 15, 8.5, "TradeBold", GREEN if active else GRAY)

    def callout(self, title, text, top, minimum=96):
        body_height = top - self.para(text, 0, top, self.width - 30, size=10.5, leading=14, measure=True)
        height = max(minimum, 34 + body_height + 13)
        if top - height < 53:
            return False
        self.fill(PALE, self.x, top - height, self.width, height, 5)
        self.fill(YELLOW, self.x, top - height, 5, height)
        self.text(title, self.x + 16, top - 22, 13, "TradeBold")
        self.para(text, self.x + 16, top - 34, self.width - 30, size=10.5, leading=14)
        return True

    def figure_height(self, filename, caption, scale=1):
        w, h = Image.open(self.shots / filename).size
        image_height = h * (self.width - 12) / w * scale
        caption_height = 1000 - self.para(caption, 0, 1000, self.width - 2, size=9.5, leading=12.5, measure=True)
        return 45 + image_height + 10 + caption_height + 18

    def figure(self, filename, caption, top, scale=1):
        initials, name, role, visibility = FIGURES[filename]
        w, h = Image.open(self.shots / filename).size
        image_width = (self.width - 12) * scale
        image_height = h * image_width / w
        frame_height = 39 + image_height + 6
        if top - self.figure_height(filename, caption, scale) < 48:
            raise ValueError(f"Page {self.page}: figure exceeds available space: {filename}")
        self.fill(WHITE, self.x, top - frame_height, self.width, frame_height, 4)
        self.fill(GREEN, self.x, top - 36, self.width, 36)
        self.fill(YELLOW, self.x + 10, top - 28, 22, 22, 11)
        self.text(initials, self.x + 14, top - 20, 8, "TradeBold")
        self.text(name, self.x + 41, top - 14, 12, "TradeBold", WHITE)
        self.text(role, self.x + 41, top - 28, 9, "Trade", WHITE)
        badge_width = pdfmetrics.stringWidth(visibility.upper(), "TradeBold", 7.2) + 14
        badge_x = self.x + self.width - badge_width - 10
        self.fill(PALE, badge_x, top - 26, badge_width, 16, 3)
        self.text(visibility.upper(), badge_x + 7, top - 21, 7.2, "TradeBold")
        image_x = self.x + (self.width - image_width) / 2
        self.c.drawImage(str(self.shots / filename), image_x, top - 39 - image_height, width=image_width, height=image_height)
        self.c.setStrokeColor(LINE)
        self.c.setLineWidth(.6)
        self.c.roundRect(self.x, top - frame_height, self.width, frame_height, 4, stroke=1, fill=0)
        bottom = self.para(caption, self.x + 1, top - frame_height - 10, self.width - 2, size=9.5, leading=12.5)
        self.bounds.append((self.page, filename, round(image_width / w * 16, 1), round(bottom, 1)))
        return bottom - 18

    def cover(self, title, intro, opening):
        self.page = 1
        self.fill(CREAM, 0, 0, self.w, self.h)
        self.fill(GREEN, 0, self.h - 281, self.w, 281)
        self.c.drawImage(self.logo, 40, self.h - 83, width=132, height=56)
        self.text("2048 COMMISSION", self.w - 180, self.h - 44, 12, "TradeBold", YELLOW)
        self.text("PROPOSED POC WALKTHROUGH", self.w - 180, self.h - 61, 8.5, "Trade", WHITE)
        self.text("Working Group 2", 40, self.h - 126, 27, "TradeCond", YELLOW)
        self.para("Accountability mechanisms", 40, self.h - 148, self.width - 15, size=39, leading=42, font="TradeCond", color=WHITE)
        self.para("for a new world", 40, self.h - 190, self.width - 15, size=39, leading=42, font="TradeCond", color=WHITE)
        self.text("A consultation journey that communities can help shape", 40, self.h - 260, 13, "Trade", WHITE)
        top = self.h - 304
        top = self.para("An Amnesty DAO for 2048", 40, top, self.width, size=24, leading=29, font="TradeCond") - 9
        top = self.para("A working rehearsal of contribution, deliberation, recommendation and public feedback. Three connected scenarios show a credible default journey and practical ways to adapt it.", 40, top, self.width, size=11.5, leading=15.5) - 17
        shot = self.shots / "00-working-group-context.png"
        w, h = Image.open(shot).size
        available = top - 111
        image_width = min(self.width, available * w / h)
        image_height = h * image_width / w
        self.fill(WHITE, self.x - 4, top - image_height - 4, self.width + 8, image_height + 8, 5)
        self.c.drawImage(str(shot), self.x + (self.width - image_width) / 2, top - image_height, width=image_width, height=image_height)
        self.para("Maya Chen, Working Group lead, opens the group's workspace. The purpose, participant context and all five stages are visible in the local application.", 40, top - image_height - 14, self.width, size=9.5, leading=12.5)
        self.text("6 OCTOBER 2026  /  FICTIONAL PEOPLE AND MATERIAL", 40, 57, 8.5, "TradeBold", GRAY)
        self.footer(True)

    def guide(self, cast, scenarios):
        top = self.start("People and participation")
        top = self.para("People, perspectives and a shared journey", self.x, top, self.width, size=27, leading=30, font="TradeCond") - 7
        top = self.para("Six fictional participants bring different responsibilities and perspectives. The labels on every application view identify who is acting and what material they can see.", self.x, top, self.width, size=11, leading=15) - 18
        card_width = (self.width - 14) / 2
        card_height = 106
        initials = ["MC", "RO", "LM", "SA", "AD", "TS"]
        for i, (name, role, action) in enumerate(cast):
            x = self.x + (i % 2) * (card_width + 14)
            y = top - (i // 2) * (card_height + 12)
            self.fill(WHITE, x, y - card_height, card_width, card_height, 5)
            self.fill(YELLOW, x + 12, y - 39, 27, 27, 13.5)
            self.text(initials[i], x + 17, y - 30, 9, "TradeBold")
            self.text(name, x + 49, y - 24, 15, "TradeCond")
            self.text(role, x + 49, y - 40, 9, "TradeBold", GRAY)
            self.para(action, x + 12, y - 53, card_width - 24, size=10.5, leading=13.5)
        top -= 3 * (card_height + 12) + 5
        top = self.para("Three connected scenarios", self.x, top, self.width, size=22, leading=26, font="TradeCond") - 11
        scenario_titles = ["01  The consultation journey", "02  Adapting participation", "03  Withdrawal and evidence review"]
        for title, text in zip(scenario_titles, scenarios):
            self.text(title, self.x, top - 10, 12, "TradeBold")
            top = self.para(text.split(": ", 1)[1], self.x, top - 20, self.width, size=10.5, leading=14) - 12

    def chapter(self, index, heading, subtitle, body, figures):
        stage = int(heading[0]) if heading[:1].isdigit() else (3 if index == 10 else 0)
        label = "Prepare the workspace" if index < 2 else ("Evidence review scenario" if index >= 15 else f"Stage {stage} / {STAGES[stage-1]}")
        top = self.start(label, stage)
        top = self.para(subtitle, self.x, top, self.width, size=27, leading=30, font="TradeCond") - 9
        top = self.para(body, self.x, top, self.width, size=11, leading=15) - 16
        remaining = top - 52
        total = sum(self.figure_height(f, c) for f, c in figures)
        image_total = sum(Image.open(self.shots / f).height * (self.width - 12) / Image.open(self.shots / f).width for f, _ in figures)
        overhead = total - image_total
        scale = min(1, (remaining - overhead) / image_total)
        callout_placed = False
        # Keep the application text readable; use another page when necessary.
        minimum_scale = max(7 * Image.open(self.shots / f).width / (16 * (self.width - 12)) for f, _ in figures)
        if scale >= minimum_scale:
            for filename, caption in figures:
                top = self.figure(filename, caption, top, scale)
        else:
            for i, (filename, caption) in enumerate(figures):
                if i:
                    if index == 8 and top > 161:
                        callout_placed = self.callout(*CALLOUTS[8], top - 7)
                    top = self.start(label + " / continued", stage)
                    continuation = {5: ("Ruth adds documentary evidence", "The document contribution joins the collective input in the group's evidence trail."), 8: ("Amina proposes a change; Ruth responds", "The community's private exchange records the proposed revision, the member's response and the remaining concern about review time."), 16: ("Maya publishes the reviewed outcome", "The new public snapshot reflects explicit review of the remaining evidence. The earlier withheld record is retained.")}
                    next_title, next_body = continuation.get(index, (subtitle, "The next view continues this consultation and its discussion."))
                    top = self.para(next_title, self.x, top, self.width, size=27, leading=30, font="TradeCond") - 10
                    top = self.para(next_body, self.x, top, self.width, size=11, leading=15) - 16
                natural = self.figure_height(filename, caption)
                w, h = Image.open(self.shots / filename).size
                image_height = h * (self.width - 12) / w
                own_scale = min(1, (top - 52 - (natural - image_height)) / image_height)
                if own_scale < .86:
                    raise ValueError(f"Screenshot requires a clearer capture: {filename}")
                top = self.figure(filename, caption, top, own_scale)
        if not callout_placed and index in CALLOUTS and top > 161:
            self.callout(*CALLOUTS[index], top - 7)

    def finish(self):
        self.c.save()
        return self.bounds


def build_article(root, article, shots, title, intro, opening, scenarios, cast, chapters):
    pdf = root / "output/pdf/2048-working-group-2-article.pdf"
    temporary_pdf = root / "tmp/pdfs/client-article-build.pdf"
    design = Layout(temporary_pdf, root, shots)
    design.cover(title, intro, opening)
    design.guide(cast, scenarios)
    for i, chapter in enumerate(chapters):
        design.chapter(i, *chapter)
    bounds = design.finish()
    temporary_pdf.replace(pdf)
    shutil.copy2(pdf, article / "working-group-2-article.pdf")

    assets = article / "assets"
    assets.mkdir(exist_ok=True)
    shutil.copy2(root / "frontend/src/assets/branding/amnesty-logo-yellow.png", assets / "amnesty-logo.png")
    for target, source in [("trade.ttf", "AmnestyTradeGothic.ttf"), ("trade-bold.ttf", "AmnestyTradeGothic-Bd2.ttf"), ("trade-condensed.ttf", "AmnestyTradeGothic-Cn18.ttf")]:
        shutil.copy2(root / "frontend/src/assets/fonts" / source, assets / target)
    escape = html.escape
    css = """@font-face{font-family:Trade;src:url('assets/trade.ttf')}@font-face{font-family:Trade;src:url('assets/trade-bold.ttf');font-weight:700}@font-face{font-family:TradeCond;src:url('assets/trade-condensed.ttf')}*{box-sizing:border-box}body{margin:0;background:#f5f4ec;color:#153d32;font:19px/1.5 Trade,Arial,sans-serif}main{max-width:1100px;margin:auto}h1,h2,h3{font-family:TradeCond,Arial,sans-serif;font-weight:normal;line-height:1.08}.hero{background:#153d32;color:white;padding:40px 56px 46px}.brand{display:flex;align-items:center;justify-content:space-between;gap:24px}.brand img{width:168px;height:auto}.label{font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.yellow{color:#ffe500}.hero h1{font-size:60px;margin:28px 0 16px;max-width:850px}.hero .group{display:block;color:#ffe500;font-size:35px;margin-bottom:12px}.hero .dek{font-size:24px}.hero .download{margin:26px 0 0}.download a{display:inline-block;padding:10px 18px;background:#ffe500;color:#153d32;font-weight:700;text-decoration:none;margin:0 10px 8px 0;border-radius:3px}.intro,.guide,section{padding:38px 56px}.intro h2,.guide h2{font-size:36px;margin:0 0 18px}.context{width:100%;border:8px solid white;border-radius:5px}.caption{font-size:16px;color:#51665d}.cast{display:grid;grid-template-columns:1fr 1fr;gap:16px}.person{background:white;border-radius:5px;padding:20px;display:grid;grid-template-columns:38px 1fr;gap:14px}.avatar{height:34px;width:34px;border-radius:50%;background:#ffe500;color:#153d32;font-size:13px;display:flex;align-items:center;justify-content:center;font-weight:700}.person strong{font:26px TradeCond,sans-serif}.person .role{font-size:15px;font-weight:700;color:#51665d;margin:4px 0}.person p{font-size:17px;margin:10px 0 0}.scenario{border-top:1px solid #c8d6cc;padding:18px 0}.scenario strong{font:25px TradeCond,sans-serif}.ribbon{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:22px}.ribbon span{background:#e8efea;padding:9px 7px;font-size:15px;font-weight:700;border-radius:3px}.ribbon .active{background:#ffe500}section{border-top:1px solid #c8d6cc}section h2{font-size:38px;margin:20px 0 16px}.chapter-label{font-size:14px;text-transform:uppercase;font-weight:700;letter-spacing:.06em;color:#51665d}figure{margin:25px 0 30px;break-inside:avoid}.screen{background:white;border:1px solid #c8d6cc;border-radius:5px;overflow:hidden}.screen-bar{display:flex;align-items:center;gap:12px;background:#153d32;color:white;padding:12px 15px}.screen-name{font-size:20px;font-weight:700}.screen-role{font-size:15px}.visibility{margin-left:auto;background:#e8efea;color:#153d32;font-size:12px;font-weight:700;text-transform:uppercase;border-radius:3px;padding:5px 9px}.screen img{display:block;width:100%;height:auto}.screen img.context{border:0}figcaption{font-size:16px;line-height:1.4;color:#51665d;margin-top:12px}.callout{background:#e8efea;border-left:6px solid #ffe500;border-radius:4px;padding:20px 24px;margin:24px 0}.callout strong{font:27px TradeCond,sans-serif}.callout p{font-size:18px;margin:9px 0 0}footer{padding:25px 56px;border-top:1px solid #c8d6cc;font-size:14px;color:#51665d}a{color:#176047}@media(max-width:600px){.hero,.intro,.guide,section,footer{padding:25px 18px}.hero h1{font-size:40px}.hero .group{font-size:28px}.brand{align-items:flex-start}.brand img{width:118px}.brand .label{font-size:11px;text-align:right}.hero .dek{font-size:21px}.cast{grid-template-columns:1fr}.ribbon span{font-size:11px;padding:8px 3px}.screen-bar{flex-wrap:wrap}.visibility{margin-left:46px}.screen-name{font-size:18px}.screen-role{font-size:13px}section h2{font-size:31px}}@media print{@page{size:A4;margin:15mm}body{background:white;font-size:11pt}main{max-width:none}.hero{padding:22px;background:#153d32;print-color-adjust:exact;-webkit-print-color-adjust:exact}.hero h1{font-size:30pt}.hero .group{font-size:20pt}.hero .dek{font-size:13pt}.download{display:none}.intro,.guide,section{padding:15px 0;break-before:page}.ribbon span{font-size:8pt;print-color-adjust:exact}.cast{grid-template-columns:1fr 1fr}.person{padding:12px;border:1px solid #c8d6cc}.person strong{font-size:16pt}.person p{font-size:10pt}.person .role{font-size:9pt}section h2{font-size:23pt}.screen-bar,.avatar{print-color-adjust:exact;-webkit-print-color-adjust:exact}.screen-name{font-size:12pt}.screen-role{font-size:9pt}.visibility{font-size:7pt}figcaption{font-size:9pt}.callout p{font-size:10pt}footer{font-size:8pt;padding:15px 0}}"""

    md = [f"# {title}", intro, opening, "## Three connected scenarios", *scenarios, "## People in this example"]
    cast_html = ""
    for initials, (name, role, action) in zip(["MC", "RO", "LM", "SA", "AD", "TS"], cast):
        md.append(f"**{name} - {role}.** {action}")
        cast_html += f'<div class="person"><span class="avatar">{initials}</span><div><strong>{escape(name)}</strong><p class="role">{escape(role)}</p><p>{escape(action)}</p></div></div>'
    body = ""
    used = ["00-working-group-context.png"]
    for i, (heading, subtitle, text, figures) in enumerate(chapters):
        stage = int(heading[0]) if heading[:1].isdigit() else (3 if i == 10 else 0)
        ribbon = ''.join(f'<span class="{"active" if j == stage else ""}">{j} {name}</span>' for j, name in enumerate(STAGES, 1))
        body += f'<section><div class="ribbon">{ribbon}</div><p class="chapter-label">{escape(heading)}</p><h2>{escape(subtitle)}</h2><p>{escape(text)}</p>'
        md.extend([f"## {heading}", f"### {subtitle}", text])
        for filename, caption in figures:
            assert (shots / filename).is_file(), filename
            used.append(filename)
            initials, name, role, visibility = FIGURES[filename]
            body += f'<figure><div class="screen"><div class="screen-bar"><span class="avatar">{initials}</span><div><div class="screen-name">{escape(name)}</div><div class="screen-role">{escape(role)}</div></div><span class="visibility">{escape(visibility)}</span></div><img src="screenshots-live/{filename}" alt="{escape(caption)}"></div><figcaption>{escape(caption)}</figcaption></figure>'
            md.extend([f"![{caption}](screenshots-live/{filename})", f"*{caption}*"])
        if i in CALLOUTS:
            call_title, call_body = CALLOUTS[i]
            body += f'<aside class="callout"><strong>{escape(call_title)}</strong><p>{escape(call_body)}</p></aside>'
        body += '</section>'
    scenario_html = ''.join(f'<div class="scenario"><strong>{j:02} {escape(s.split(": ",1)[0])}</strong><p>{escape(s.split(": ",1)[1])}</p></div>' for j, s in enumerate(scenarios, 1))
    document = f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="data:,"><title>{escape(title)}</title><style>{css}</style><body><main><header class="hero"><div class="brand"><img src="assets/amnesty-logo.png" alt="Amnesty International"><div class="label yellow">2048 Commission<br>Proposed POC walkthrough</div></div><h1><span class="group">Working Group 2</span>Accountability mechanisms for a new world</h1><p class="dek">{escape(intro)}</p><div class="download"><a href="working-group-2-article.pdf">Download PDF</a><a href="article.md">Editable article</a></div></header><div class="intro"><h2>A consultation journey that communities can help shape</h2><p>{escape(opening)}</p><img class="context" src="screenshots-live/00-working-group-context.png" alt="Maya Chen opens the Working Group workspace with its purpose and five stages"><p class="caption">Maya Chen, Working Group lead, opens the workspace. The screenshots show the working local application and fictional participants.</p></div><div class="guide"><h2>People in this example</h2><div class="cast">{cast_html}</div><h2 style="margin-top:32px">Three connected scenarios</h2>{scenario_html}</div>{body}<footer>6 October 2026 / The people, contributions and recommendations are fictional rehearsal material.</footer></main></body></html>'
    (article / "index.html").write_text(document)
    (article / "article.md").write_text("\n\n".join(md) + "\n")
    with zipfile.ZipFile(root / "output/2048-article.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        files = [article / "index.html", article / "article.md", article / "working-group-2-article.pdf", *assets.iterdir(), *(shots / n for n in dict.fromkeys(used))]
        for file in files:
            archive.write(file, Path("2048-article") / file.relative_to(article))
    page_count = len(PdfReader(pdf).pages)
    print(f"Built client article and PDF: {page_count} pages, {len(used)} captioned application captures.")
    print(f"Smallest application-text scale: {min(b[2] for b in bounds):.1f}pt for 16px source text; all figure captions above the footer.")
