import os
import glob
import re

def fix_imports():
    for ext in ['**/*.ts', '**/*.tsx']:
        for filepath in glob.glob(f'src/{ext}', recursive=True):
            with open(filepath, 'r') as f:
                content = f.read()
            
            lines = content.split('\n')
            changed = False
            for i, line in enumerate(lines):
                # match import/export paths
                match = re.search(r'''(?:from\s+|import\s+)['"](\.\.[/a-zA-Z0-9_.-]+)['"]''', line)
                if not match:
                    match = re.search(r'''(?:import\()(['"]\.\.[/a-zA-Z0-9_.-]+['"])''', line)
                if match:
                    import_path = match.group(1).strip('\'"')
                    if import_path.startswith('../'):
                        dir_path = os.path.dirname(filepath)
                        resolved_current = os.path.normpath(os.path.join(dir_path, import_path))
                        fixed_path = import_path.replace('../', '', 1)
                        resolved_fixed = os.path.normpath(os.path.join(dir_path, fixed_path))
                        
                        def exists(p):
                            if os.path.exists(p): return True
                            for e in ['.ts', '.tsx', '.js', '.jsx', '.json']:
                                if os.path.exists(p + e): return True
                            if os.path.isdir(p):
                                for e in ['/index.ts', '/index.tsx', '/index.js']:
                                    if os.path.exists(p + e): return True
                            return False
                        
                        if not exists(resolved_current) and exists(resolved_fixed):
                            lines[i] = line.replace(import_path, fixed_path)
                            changed = True
            if changed:
                with open(filepath, 'w') as f:
                    f.write('\n'.join(lines))
                print(f'Fixed imports in {filepath}')

fix_imports()
