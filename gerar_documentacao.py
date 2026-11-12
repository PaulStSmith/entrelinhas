# =============================================================================
# Projeto: Arquitetura Reativa - Entrelinhas
# Trabalho acadêmico desenvolvido individualmente.
# Autor: Paulo Santos
#
# Copyright (c) 2026 Paulo Santos
#
# -----------------------------------------------------------------------------
#
# SPDX-License-Identifier: MIT
#
# Licenciado sob a licença MIT. Consulte o arquivo LICENSE na raiz do projeto
# para o texto completo da licença e o aviso de copyright.
#
# São permitidos o uso, a cópia, a modificação e a redistribuição, inclusive
# para fins comerciais, mediante a preservação dos avisos exigidos pela MIT.
# Software fornecido "COMO ESTÁ", sem garantias, nos termos da licença.
#
# Nota sobre copyleft: a MIT é uma licença permissiva; trabalhos derivados
# não precisam adotar a mesma licença.
#
# =============================================================================

from pathlib import Path
import re
from docx import Document
from docx.shared import Cm, Pt, RGBColor, Inches
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
QA = ROOT / '.docx-qa'
QA.mkdir(exist_ok=True)

# Diagrama estático da arquitetura implementada, sem dependência de imagens remotas.
im = Image.new('RGB', (1600, 720), 'white')
draw = ImageDraw.Draw(im)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 29)
small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 25)
def box(rect, text):
    draw.rounded_rectangle(rect, radius=14, fill='#F3F5F7', outline='#444444', width=2)
    draw.multiline_text(((rect[0]+rect[2])/2,(rect[1]+rect[3])/2), text, fill='black', font=font, anchor='mm', align='center', spacing=8)
def arrow(a,b,color='#555555'):
    import math
    draw.line([a,b], fill=color, width=3)
    angle=math.atan2(b[1]-a[1],b[0]-a[0])
    pts=[b,(b[0]-17*math.cos(angle-.45),b[1]-17*math.sin(angle-.45)),(b[0]-17*math.cos(angle+.45),b[1]-17*math.sin(angle+.45))]
    draw.polygon(pts, fill=color)
box((555,20,1045,135),'Azure Static Web Apps\nHTML CSS e JavaScript')
box((90,260,620,415),'Navegador A\nCRDT e armazenamento local')
box((980,260,1510,415),'Navegador B\nCRDT e armazenamento local')
box((555,560,1045,695),'Azure App Service F1\nSinalização WebSocket')
arrow((590,135),(360,260)); arrow((1010,135),(1240,260))
draw.text((800,190),'Entrega da interface',font=small,fill='black',anchor='mm')
arrow((630,345),(970,345));arrow((970,325),(630,325))
draw.text((800,290),'WebRTC',font=font,fill='black',anchor='mm')
arrow((590,560),(360,415));arrow((1010,560),(1240,415))
draw.text((800,475),'Cada navegador mantém sua réplica',font=small,fill='black',anchor='mm')
im.save(QA/'arquitetura.png')

doc=Document()
sec=doc.sections[0]
sec.page_width=Cm(21);sec.page_height=Cm(29.7)
sec.top_margin=Cm(2);sec.bottom_margin=Cm(2)
sec.left_margin=Cm(2.3);sec.right_margin=Cm(2.3)
normal=doc.styles['Normal']
normal.font.name='Arial';normal.font.size=Pt(10.5)
normal.font.color.rgb=RGBColor(0,0,0)
normal.paragraph_format.space_after=Pt(6)
normal.paragraph_format.line_spacing=1.12
normal.paragraph_format.widow_control=True
for name,size in [('Title',23),('Subtitle',12),('Heading 1',15),('Heading 2',12)]:
    s=doc.styles[name];s.font.name='Arial';s.font.size=Pt(size);s.font.color.rgb=RGBColor(0,0,0)
    s.paragraph_format.space_before=Pt(13 if name.startswith('Heading') else 0)
    s.paragraph_format.space_after=Pt(7)
    s.font.italic=False
# Remove bordas herdadas do modelo padrão, inclusive a linha azul do título.
for el in list(doc.styles.element.iter(qn('w:pBdr'))):
    el.getparent().remove(el)
for name in ['List Bullet','List Number']:
    doc.styles[name].font.name='Arial';doc.styles[name].font.size=Pt(10.5)
    doc.styles[name].paragraph_format.space_after=Pt(5)
doc.core_properties.title='Editor colaborativo distribuído com CRDT'
doc.core_properties.subject='Arquitetura implementada para edição colaborativa em JavaScript com hospedagem no Azure Static Web Apps'
doc.core_properties.author='Paulo Santos'
doc.core_properties.keywords='CRDT, Yjs, WebRTC, Azure Static Web Apps, sistemas distribuídos'
doc.add_paragraph('Editor colaborativo distribuído com CRDT','Title')
doc.add_paragraph('Sistema distribuído em JavaScript com hospedagem no Azure Static Web Apps','Subtitle')
doc.add_paragraph('Arquitetura Reativa  |  Entrelinhas no Azure')
doc.add_paragraph('O projeto implementa um editor público em que os participantes alteram o mesmo documento a partir de navegadores independentes. A escolha de CRDT permite edição local durante desconexões e convergência após a sincronização. O Azure Static Web Apps hospeda a interface; a comunicação entre participantes utiliza WebRTC com sinalização no Azure App Service F1.')

def add_text(p,text):
    # Mantém links utilizáveis no Word e formatação de ênfase do texto de origem.
    for part in re.split(r'(\[[^\]]+\]\(https?://[^)]+\)|\*\*.+?\*\*)',text):
        m=re.fullmatch(r'\[([^\]]+)\]\((https?://[^)]+)\)',part)
        if m:
            from docx.opc.constants import RELATIONSHIP_TYPE as RT
            link=OxmlElement('w:hyperlink');link.set(qn('r:id'),p.part.relate_to(m[2],RT.HYPERLINK,is_external=True))
            r=OxmlElement('w:r');rp=OxmlElement('w:rPr');color=OxmlElement('w:color');color.set(qn('w:val'),'154A7E');rp.append(color);r.append(rp)
            t=OxmlElement('w:t');t.text=m[1];r.append(t);link.append(r);p._p.append(link)
        elif part.startswith('**'):
            p.add_run(part[2:-2]).bold=True
        else:p.add_run(part)

def table(rows):
    t=doc.add_table(rows=0, cols=len(rows[0]));t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
    widths=[5.1,11.3]
    for i,row in enumerate(rows):
        cells=t.add_row().cells
        for j,text in enumerate(row):
            cells[j].width=Cm(widths[j]);cells[j].vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p=cells[j].paragraphs[0];p.paragraph_format.space_after=Pt(4);p.paragraph_format.space_before=Pt(4)
            add_text(p,text)
            for r in p.runs:r.font.size=Pt(10)
            pr=cells[j]._tc.get_or_add_tcPr()
            shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'E5EAF0' if i==0 else ('F6F7F8' if i%2==0 else 'FFFFFF'));pr.append(shade)
            borders=OxmlElement('w:tcBorders')
            for edge in ['top','left','bottom','right']:
                el=OxmlElement('w:'+edge);el.set(qn('w:val'),'single');el.set(qn('w:sz'),'4');el.set(qn('w:color'),'D9D9D9');borders.append(el)
            pr.append(borders)
            mar=OxmlElement('w:tcMar')
            for edge in ['top','left','bottom','right']:
                el=OxmlElement('w:'+edge);el.set(qn('w:w'),'100');el.set(qn('w:type'),'dxa');mar.append(el)
            pr.append(mar)
            if i==0:
                for r in p.runs:r.bold=True
        if i==0:
            repeat=OxmlElement('w:tblHeader');t.rows[-1]._tr.get_or_add_trPr().append(repeat)
        no_split=OxmlElement('w:cantSplit');t.rows[-1]._tr.get_or_add_trPr().append(no_split)
    doc.add_paragraph().paragraph_format.space_after=Pt(0)

lines=(ROOT/'docs'/'ARQUITETURA.md').read_text(encoding='utf-8').splitlines()
i=1
while i<len(lines):
    line=lines[i].strip();i+=1
    if not line:continue
    if line.startswith('Este documento descreve'):
        line='O documento apresenta o cenário, a justificativa da estratégia, os riscos das alternativas e o fluxo de uma operação, além da arquitetura e dos critérios de validação da implementação.'
    if line.startswith('```'):
        while i<len(lines) and not lines[i].startswith('```'):i+=1
        i+=1
        p=doc.add_paragraph();p.paragraph_format.keep_with_next=True
        p.add_run().add_picture(str(QA/'arquitetura.png'),width=Cm(16.1))
        cap=doc.add_paragraph('Figura 1  Hospedagem da interface e comunicação entre réplicas')
        cap.alignment=WD_ALIGN_PARAGRAPH.CENTER
        for r in cap.runs:r.font.size=Pt(9)
    elif line.startswith('|'):
        rows=[line]
        while i<len(lines) and lines[i].strip().startswith('|'):rows.append(lines[i].strip());i+=1
        table([[x.strip() for x in row.strip('|').split('|')] for row in rows if not re.fullmatch(r'[| :\-]+',row)])
    elif line.startswith('#'):
        level=1 if line.startswith('## ') else 2
        text=re.sub(r'^#+\s*','',line)
        text=re.sub(r'^(\d+)\.\s*',r'\1 ',text).replace(':','')
        heading=doc.add_heading(text,level)
        if text.startswith('6 Exemplo'):
            heading.paragraph_format.page_break_before=True
    elif line.startswith('- '):add_text(doc.add_paragraph(style='List Bullet'),line[2:])
    elif re.match(r'^\d+\. ',line):
        # Números explícitos preservam a sequência de cada procedimento.
        p=doc.add_paragraph();p.paragraph_format.left_indent=Cm(.55);p.paragraph_format.first_line_indent=Cm(-.55)
        add_text(p,line)
    else:add_text(doc.add_paragraph(),line)

footer=sec.footer.paragraphs[0];footer.alignment=WD_ALIGN_PARAGRAPH.RIGHT
r=footer.add_run();r.font.size=Pt(9)
field=OxmlElement('w:fldSimple');field.set(qn('w:instr'),'PAGE');r._r.addnext(field)
doc.save(ROOT/'Documentacao_Editor_Colaborativo_CRDT.docx')
print(ROOT/'Documentacao_Editor_Colaborativo_CRDT.docx')
