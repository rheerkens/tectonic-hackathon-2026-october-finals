"""Embed full editable Manrope faces using the documented EOT font part format.

References:
https://www.w3.org/submissions/EOT/ (section 3.2)
https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/1663dabc-5d98-463f-889e-bcd9b77c3d34
https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.embeddedfont
"""
from pathlib import Path
import sys, struct, zipfile
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'.local/presentation/vendor'))
from fontTools.ttLib import TTFont
from lxml import etree as E

def eot(path):
    f=TTFont(path); o=f['OS/2']; data=path.read_bytes()
    assert o.fsType == 0, 'Embedding rights must permit the full editable font'
    panose=bytes(getattr(o.panose,k) for k in ['bFamilyType','bSerifStyle','bWeight','bProportion','bContrast','bStrokeVariation','bArmStyle','bLetterForm','bMidline','bXHeight'])
    names=b''
    for nid in [1,2,5,4]:
        value=f['name'].getDebugName(nid).encode('utf-16-le')
        names += struct.pack('<HH',0,len(value))+value
    header=struct.pack('<4I',0,len(data),0x20001,0)+panose+struct.pack('<BBIHH',1,int(bool(o.fsSelection&1)),o.usWeightClass,o.fsType,0x504c)
    header+=struct.pack('<11I',o.ulUnicodeRange1,o.ulUnicodeRange2,o.ulUnicodeRange3,o.ulUnicodeRange4,o.ulCodePageRange1,o.ulCodePageRange2,f['head'].checkSumAdjustment,0,0,0,0)
    result=header+names+struct.pack('<HH',0,0)+data
    return struct.pack('<I',len(result))+result[4:]

path=ROOT/'docs/presentation/SDtrust_Finals_Draft_v1.pptx'
with zipfile.ZipFile(path) as z: parts={n:z.read(n) for n in z.namelist()}
p='http://schemas.openxmlformats.org/presentationml/2006/main'
r='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
rel='http://schemas.openxmlformats.org/package/2006/relationships'
ct='http://schemas.openxmlformats.org/package/2006/content-types'
pres=E.fromstring(parts['ppt/presentation.xml'])
pres.set('embedTrueTypeFonts','1'); pres.set('saveSubsetFonts','0')
lst=pres.find('{'+p+'}embeddedFontLst')
if lst is not None: pres.remove(lst)
lst=E.Element('{'+p+'}embeddedFontLst')
after=pres.find('{'+p+'}notesSz')
pres.insert(list(pres).index(after)+1,lst)
font=E.SubElement(lst,'{'+p+'}embeddedFont')
E.SubElement(font,'{'+p+'}font',typeface='Manrope',pitchFamily='34',charset='0')
rels=E.fromstring(parts['ppt/_rels/presentation.xml.rels'])
types=E.fromstring(parts['[Content_Types].xml'])
if not any(t.get('Extension')=='fntdata' for t in types):
    E.SubElement(types,'{'+ct+'}Default',Extension='fntdata',ContentType='application/x-fontdata')
for style,tag in [('Regular','regular'),('Bold','bold')]:
    rid='rIdManrope'+style
    for prior in list(rels):
        if prior.get('Id')==rid: rels.remove(prior)
    target='fonts/Manrope'+style+'.fntdata'
    parts['ppt/'+target]=eot(ROOT/('docs/presentation/assets/Manrope-'+style+'.ttf'))
    E.SubElement(rels,'{'+rel+'}Relationship',Id=rid,Type=r+'/font',Target=target)
    E.SubElement(font,'{'+p+'}'+tag,{'{'+r+'}id':rid})
for name,node in [('ppt/presentation.xml',pres),('ppt/_rels/presentation.xml.rels',rels),('[Content_Types].xml',types)]:
    parts[name]=E.tostring(node,encoding='UTF-8',xml_declaration=True,standalone=True)
temp=ROOT/'.local/presentation/embedded.pptx'
with zipfile.ZipFile(temp,'w',zipfile.ZIP_DEFLATED) as z:
    for name,data in parts.items(): z.writestr(name,data)
temp.replace(path)
print('Embedded full Manrope Regular and Bold font parts.')
