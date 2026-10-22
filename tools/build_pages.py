"""Package only the public web application; never copy local BIM artifacts."""
import argparse
from pathlib import Path
import shutil

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
    destination.mkdir(parents=True)
    for path in files:
        if not path.is_file() or path.suffix.lower() not in ALLOWED or path.name == 'package.json':
            continue
        target = destination / path.relative_to(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, target)
    (destination / 'site-config.js').write_text('export const PUBLIC_DEMO = true;\n', encoding='utf-8')
    (destination / '.nojekyll').touch()
    print(f'Public demo packaged: {destination}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'artifacts/pages-site')
    build(parser.parse_args().output)
