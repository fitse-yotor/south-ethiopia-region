from pathlib import Path
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER
import fitz

root = Path(__file__).resolve().parents[1]
out = root / 'public' / 'samples'
out.mkdir(parents=True, exist_ok=True)
qa = root / 'build' / 'pdf-qa'
qa.mkdir(parents=True, exist_ok=True)
docs = {
 'citizens-charter': ('Citizens Charter', 'A sample framework for respectful, transparent and accessible public service.', [('Our service commitment','Clear information, equal treatment, respectful communication and an explanation of the next step.'), ('Before visiting','Prepare a summary of your request. Keep copies of relevant correspondence. Confirm requirements with the responsible office.'), ('Processing times and fees','Official service standards, deadlines and fees have not been supplied. This sample does not establish any entitlement or deadline.'), ('Raising a concern','Use verified institutional channels for real concerns. The portal prototype accepts fictional examples only.')]),
 'legal-awareness': ('Public Legal Awareness Material','A sample preparation guide for asking questions about public justice services.', [('Prepare your question','Write a brief description of the issue and list the information you need.'), ('Organize your documents','Keep originals safe. Bring copies where possible and avoid sharing unrelated personal information.'), ('Ask about the next step','Confirm which office is responsible, what documents are needed and how to follow up.'), ('Scope','Educational demonstration only. This is not legislation or legal advice.')]),
 'crime-prevention': ('Crime Prevention Strategy','Sample discussion outline for institutional review.', [('Public awareness','Consider accessible public information and communication in languages used by the community.'), ('Coordination','Document responsibilities and referral channels between authorized offices.'), ('Reporting','Explain how people can communicate concerns and what privacy safeguards apply.'), ('Review','Targets, legal basis, institutional responsibilities and evidence must be approved before publication.')]),
 'administrative-justice': ('Administrative Justice Guideline','Sample complaint-handling checklist; not an official directive.', [('Receive','Acknowledge the concern and record a reference without collecting unnecessary information.'), ('Review and assign','Identify the responsible office and apply approved case-handling procedures.'), ('Communicate','Provide appropriate progress updates without disclosing internal notes or protected information.'), ('Respond and close','Explain the outcome and available next steps under the applicable approved procedure.')]),
 'complaint-form': ('Complaint Preparation Form','Sample worksheet. Do not use this demonstration form for official submission.', [('Complaint title','________________________________________________________'), ('Office and location','________________________________________________________'), ('Incident date','________________________________________________________'), ('Description and requested assistance','________________________________________________________\n________________________________________________________\n________________________________________________________'), ('Previous action','________________________________________________________'), ('Privacy reminder','Do not include real personal information in the digital prototype. Anonymous reporting must not require identity fields.')]),
 'information-request': ('Public Information Request','Sample worksheet for preparing a request.', [('Information requested','________________________________________________________\n________________________________________________________'), ('Relevant dates or reference','________________________________________________________'), ('Preferred format','________________________________________________________'), ('Responsible office','________________________________________________________'), ('Next step','Confirm the official request procedure and contact channel with the responsible office.')])
}
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='Brand',fontSize=11,textColor=HexColor('#164a39'),spaceAfter=18))
styles.add(ParagraphStyle(name='TitleCustom',fontName='Times-Roman',fontSize=27,leading=33,textColor=HexColor('#164a39'),spaceAfter=17))
styles.add(ParagraphStyle(name='WarningCustom',fontSize=9,leading=13,textColor=HexColor('#765b17'),backColor=HexColor('#f4eedc'),borderPadding=10,spaceAfter=24))
styles['BodyText'].fontSize=11
styles['BodyText'].leading=17
styles['Heading2'].textColor=HexColor('#164a39')
styles['Heading2'].spaceBefore=18
def footer(canvas,doc):
 canvas.setStrokeColor(HexColor('#d5dccf')); canvas.line(48,48,547,48)
 canvas.setFillColor(HexColor('#5a6753'));canvas.setFont('Helvetica',8)
 canvas.drawString(48,34,'SOUTH OMO JUSTICE PORTAL | DESIGN SAMPLE | SEPTEMBER 2026')
 canvas.drawRightString(547,34,str(doc.page))
for slug,(title,intro,sections) in docs.items():
 path=out/(slug+'.pdf')
 flow=[Paragraph('SOUTH OMO ZONE JUSTICE DEPARTMENT',styles['Brand']),Paragraph(title,styles['TitleCustom']),Paragraph('SAMPLE - NOT AN OFFICIAL GOVERNMENT DOCUMENT',styles['WarningCustom']),Paragraph(intro,styles['BodyText'])]
 for heading,body in sections:
  flow.extend([Paragraph(heading,styles['Heading2']),Paragraph(body.replace('\n','<br/>'),styles['BodyText'])])
 SimpleDocTemplate(str(path),pagesize=(595,842),leftMargin=48,rightMargin=48,topMargin=48,bottomMargin=64).build(flow,onFirstPage=footer,onLaterPages=footer)
 pdf=fitz.open(path)
 assert len(pdf)==1, (slug,len(pdf))
 assert 'SAMPLE' in pdf[0].get_text()
 pdf[0].get_pixmap(matrix=fitz.Matrix(1,1)).save(qa/(slug+'.png'))
 print(slug, 'verified',len(pdf),'page')
