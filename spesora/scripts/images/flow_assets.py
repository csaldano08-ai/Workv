"""Local intake/audit for assets generated through the Google Flow browser UI.

No image generation API, credentials, cookies or background service is used.
Only import an image after opening it and reviewing it individually in Flow.
"""
import argparse
import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
PROGRESS = ROOT / 'docs/IMAGE_GENERATION_PROGRESS.json'

def read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def save_json(path, data):
    temp = path.with_suffix(path.suffix+'.tmp')
    temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temp.replace(path)

def audit(progress):
    # This production order covers the original 156 recipes at b351a68.
    # The shared app catalog can grow independently without invalidating this audit.
    catalog_path=ROOT/'docs/ricette_immagini_156_flow.csv'
    with catalog_path.open(encoding='utf-8-sig') as f:
        catalog=list(csv.DictReader(f,delimiter=';'))
    assert len(catalog)==156 and len({r['nome_file'] for r in catalog})==156
    expected={r['nome_file'] for r in catalog}
    assert {r['filename'] for r in progress['recipes']}==expected
    valid=[]; missing=[]; errors=[]; hashes={}
    for r in progress['recipes']:
        file=ROOT/'assets/recipes'/r['filename']
        if r['status']!='validated' or not file.exists():
            missing.append(r['filename']); continue
        try:
            with Image.open(file) as im: im.verify()
            with Image.open(file) as im:
                assert im.format=='PNG' and im.size==(1200,900),'Expected PNG 1200 x 900'
            digest=hashlib.sha256(file.read_bytes()).hexdigest()
            assert digest==r['sha256'],'File changed since visual validation'
            assert digest not in hashes,'Duplicate image: '+hashes.get(digest,'')
            assert r.get('review'),'Missing individual review'
            hashes[digest]=r['filename']; valid.append(r)
        except Exception as exc: errors.append({'filename':r['filename'],'error':str(exc)})
    report={'catalog_count':156,'validated_count':len(valid),'missing':missing,'errors':errors,
            'unexpected_pngs':sorted(p.name for p in (ROOT/'assets/recipes').glob('*.png') if p.name not in expected),
            'total_bytes':sum((ROOT/'assets/recipes'/r['filename']).stat().st_size for r in valid),
            'complete':len(valid)==156 and not errors and not missing}
    save_json(ROOT/'docs/IMAGE_COVERAGE_REPORT.json',report)
    return valid,report

def checkpoint(progress):
    valid,report=audit(progress)
    mapping={r['id']:'assets/recipes/'+r['filename'] for r in sorted(valid,key=lambda r:r['id'])}
    save_json(ROOT/'docs/RECIPE_IMAGE_PATHS.json',mapping)
    lines=["/* Generated from individually validated Google Flow PNGs. */",
           "import type { ImageSourcePropType } from 'react-native';",'',
           'export const RECIPE_IMAGES: Readonly<Record<string, ImageSourcePropType>> = {']
    lines += [f"  '{r['id']}': require('../../assets/recipes/{r['filename']}')," for r in sorted(valid,key=lambda r:r['id'])]
    lines += ['};','',f'export const RECIPE_IMAGE_COUNT = {len(valid)};','']
    (ROOT/'src/data/recipe-images.ts').write_text('\n'.join(lines),encoding='utf-8')
    manifest_path=ROOT/'assets/recipes/manifest.json'
    manifest=read_json(manifest_path)
    manifest['style']['reference']='docs/IMAGE_STYLE_REFERENCE.json'
    for r in valid:
        m=manifest['recipes'][r['id']]
        m.update(status='validated',file='assets/recipes/'+r['filename'],attempts=r['attempts'],
                 model='Google Flow / Nano Banana 2.1 (browser UI)',updatedAt=r.get('updated_at'),
                 qc={'width':1200,'height':900,'bytes':r['bytes'],'semantic':None,
                     'notes':[r['review'],'Individually visually reviewed; no automated semantic score claimed.']})
    save_json(manifest_path,manifest)
    return report

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    sub=parser.add_subparsers(dest='command',required=True)
    sub.add_parser('status');sub.add_parser('audit');sub.add_parser('checkpoint')
    imp=sub.add_parser('import')
    imp.add_argument('--filename',required=True);imp.add_argument('--source',required=True)
    imp.add_argument('--review',required=True,help='Actual individual visual review, including ingredients and style.')
    imp.add_argument('--flow-url',default='')
    args=parser.parse_args(); progress=read_json(PROGRESS)
    if args.command=='import':
        r=next(r for r in progress['recipes'] if r['filename']==args.filename)
        if r['status']=='validated': raise ValueError('Already validated; preserve the approved asset.')
        with Image.open(args.source) as im:
            im.load(); original_size=im.size
            assert min(im.size)>=600,'Source resolution too low'
            image=ImageOps.fit(im.convert('RGB'),(1200,900),method=Image.Resampling.LANCZOS)
        dest=ROOT/'assets/recipes'/r['filename']; image.save(dest,format='PNG',optimize=True,compress_level=9)
        with Image.open(dest) as im: im.verify()
        r.update(status='validated',review=args.review,flow_asset_url=args.flow_url,
                 source_size=list(original_size),width=1200,height=900,bytes=dest.stat().st_size,
                 sha256=hashlib.sha256(dest.read_bytes()).hexdigest(),
                 attempts=max(1,r['attempts']),updated_at=datetime.now(timezone.utc).isoformat())
        save_json(PROGRESS,progress)
    if args.command=='status':
        for state in ('pending','generating','generated','validated','failed'):
            print(state,sum(r['status']==state for r in progress['recipes']))
        return
    valid,report=audit(progress) if args.command!='checkpoint' else (None,checkpoint(progress))
    print(json.dumps({k:v for k,v in report.items() if k not in ('missing','errors')},ensure_ascii=False))
    if report['errors']: raise SystemExit(1)

if __name__=='__main__': main()


