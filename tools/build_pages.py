"""Package the web application and explicitly authorized STR delivery assets."""
import argparse
from pathlib import Path
import shutil
from public_assets import ASSET_NAMES, verify_assets

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = {'.html', '.css', '.js', '.json', '.geojson', '.md', '.txt'}


def build(destination):
    destination = Path(destination).resolve()
    if destination.exists():
        raise ValueError('Output must be a new directory; refusing to overwrite existing files')
    source = ROOT / 'web'
    if destination == source or destination.is_relative_to(source):
        raise ValueError('Output must be outside web/')
    files = list(source.rglob('*'))
    if any(path.is_symlink() for path in files):
        raise ValueError('Symbolic links are not allowed in the public package')
    summary = verify_assets(source / 'assets')
    destination.mkdir(parents=True)
    for path in files:
        relative = path.relative_to(source)
        approved_asset = relative.parts[0] == 'assets' and relative.as_posix() in {
            'assets/' + name for name in ASSET_NAMES | {'manifest.json'}}
        if relative.parts[0] == 'assets' and not approved_asset:
            continue
        if not path.is_file() or (not approved_asset and path.suffix.lower() not in ALLOWED) or path.name == 'package.json':
            continue
        target = destination / path.relative_to(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
    (destination / 'site-config.js').write_text('export const PUBLIC_DEMO = true;\n', encoding='utf-8')
    (destination / '.nojekyll').touch()
    print(f'Public demo packaged: {destination}')
    print(f'STR assets verified: {summary}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'artifacts/pages-site')
    build(parser.parse_args().output)
