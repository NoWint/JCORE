import { makeDiagnostic, type Diagnostic } from '../../validate/diagnostics';
import type { ImportManifest } from '../manifest';
import type { ImportSource } from '../types';

export interface LatexInspection {
  rootDocument?: string;
  diagnostics: Diagnostic[];
}

function isSafePath(path: string): boolean {
  return !path.startsWith('/') && !path.includes('\\') && !path.split('/').includes('..');
}

function fileText(source: ImportSource, path: string): string {
  const file = source.files.find((candidate) => candidate.path === path);
  return file ? new TextDecoder().decode(file.data) : '';
}

function extensions(base: string): string[] {
  return [base, `${base}.tex`, `${base}.svg`, `${base}.pdf`, `${base}.png`];
}

function splitBibliographyNames(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function bibliographyBases(paths: string[]): Set<string> {
  return new Set(
    paths
      .filter((path) => /\.(?:bib|bbl)$/i.test(path))
      .map((path) => path.replace(/\.(?:bib|bbl)$/i, ''))
  );
}

function figureCandidates(value: string): string[] {
  const explicitPaths = [...value.matchAll(/(?:^|[{\s])([^{}\s]+\.(?:pdf|png|jpe?g|gif|eps|svg))(?:$|[}\s])/gi)].map(
    (match) => match[1]
  );
  return explicitPaths.length > 0 ? explicitPaths : [value];
}

export function inspectLatexPackage(manifest: ImportManifest, source: ImportSource): LatexInspection {
  const diagnostics: Diagnostic[] = [];
  const paths = source.files.map((file) => file.path);

  for (const path of paths) {
    if (!isSafePath(path)) {
      diagnostics.push(
        makeDiagnostic(
          'unsafe-path',
          'error',
          'latex',
          source.packagePath,
          `Unsafe path in LaTeX package: ${path}`,
          'Remove absolute paths, traversal, and backslash paths from the package',
          path
        )
      );
    }
  }

  const texFiles = paths.filter((path) => path.endsWith('.tex'));
  const declaredRoot = manifest.rootDocument;
  let rootDocument: string | undefined = declaredRoot;

  if (declaredRoot) {
    if (!paths.includes(declaredRoot)) {
      diagnostics.push(
        makeDiagnostic(
          'missing-root-document',
          'error',
          'latex',
          source.packagePath,
          `Declared root document ${declaredRoot} is not in the package`,
          'Point rootDocument at a file that exists in the package',
          declaredRoot
        )
      );
    }
  } else if (texFiles.length === 1) {
    rootDocument = texFiles[0];
  } else if (texFiles.length === 0) {
    diagnostics.push(
      makeDiagnostic(
        'missing-latex-root',
        'error',
        'latex',
        source.packagePath,
        'No .tex root document found in the package',
        'Add a root .tex file or declare rootDocument in the manifest',
        'root'
      )
    );
  } else {
    diagnostics.push(
      makeDiagnostic(
        'multiple-latex-roots',
        'error',
        'latex',
        source.packagePath,
        `Multiple .tex files found: ${texFiles.join(', ')}`,
        'Declare rootDocument in the import manifest',
        'root'
      )
    );
  }

  if (!rootDocument) {
    return { rootDocument, diagnostics };
  }

  const text = fileText(source, rootDocument);

  if (/(?:\\immediate\s*)?\\write18|\\shellescape/.test(text)) {
    diagnostics.push(
      makeDiagnostic(
        'unsafe-tex-command',
        'error',
        'latex',
        `${source.packagePath}/${rootDocument}`,
        'TeX source requests shell escape or host command execution',
        'Remove write18 and shellescape from the source',
        rootDocument
      )
    );
  }

  if (/\\input\{(\/|\.\.\/)|\\include\{(\/|\.\.\/)/.test(text)) {
    diagnostics.push(
      makeDiagnostic(
        'unsafe-path',
        'error',
        'latex',
        `${source.packagePath}/${rootDocument}`,
        'TeX source includes an absolute or traversal input path',
        'Use package-relative input paths only',
        rootDocument
      )
    );
  }

  const inputs = [...text.matchAll(/\\(?:input|include)\{([^}]+)\}/g)].map((match) => match[1]);
  for (const input of inputs) {
    const target = extensions(input).some((candidate) => paths.includes(candidate));
    if (!target) {
      diagnostics.push(
        makeDiagnostic(
          'missing-included-file',
          'error',
          'latex',
          `${source.packagePath}/${rootDocument}`,
          `Included file ${input} is missing from the package`,
          'Add the included file or fix the input path',
          input
        )
      );
    }
  }

  const figureGroups = [...text.matchAll(/\\includegraphics[^\n]*/g)].map((match) => {
    const argument = match[0].match(/\{(.+)\}/)?.[1] ?? '';
    return figureCandidates(argument);
  });
  for (const group of figureGroups) {
    const target = group.some((figure) => extensions(figure).some((candidate) => paths.includes(candidate)));
    if (!target) {
      const figure = group[0] ?? 'unknown';
      diagnostics.push(
        makeDiagnostic(
          'missing-asset',
          'warning',
          'latex',
          `${source.packagePath}/${rootDocument}`,
          `Figure asset ${figure} is missing from the package`,
          'Add the figure asset or fix the includegraphics path',
          figure
        )
      );
    }
  }

  const availableBibliographies = bibliographyBases(paths);
  const bibliographies = [...text.matchAll(/\\(?:bibliography|addbibresource)\{([^}]+)\}/g)].flatMap((match) =>
    splitBibliographyNames(match[1]).map((name) => name.replace(/\.(?:bib|bbl)$/i, ''))
  );
  for (const bibliography of bibliographies) {
    if (!availableBibliographies.has(bibliography)) {
      diagnostics.push(
        makeDiagnostic(
          'missing-bibliography',
          'warning',
          'latex',
          `${source.packagePath}/${rootDocument}`,
          `Bibliography file ${bibliography}.bib is missing from the package`,
          'Add the bibliography file or fix the bibliography path',
          `${bibliography}.bib`
        )
      );
    }
  }

  const citationMatches = [
    ...text.matchAll(/\\(?:cite|citep|citet)(?:\[[^\]]*\])?\{([^}]+)\}/g)
  ];
  const citedKeys = citationMatches.flatMap((match) => match[1].split(',').map((key) => key.trim()).filter(Boolean));
  const bibliographyText = source.files
    .filter((file) => /\.(?:bib|bbl)$/i.test(file.path))
    .map((file) => new TextDecoder().decode(file.data))
    .join('\n');
  const definedKeys = [
    ...[...bibliographyText.matchAll(/@\w+\{([^,]+),/g)].map((match) => match[1].trim()),
    ...[...bibliographyText.matchAll(/\\bibitem(?:\[[^\]]*\])?\{([^}]+)\}/g)].map((match) => match[1].trim())
  ];

  for (const key of citedKeys) {
    if (!definedKeys.includes(key)) {
      diagnostics.push(
        makeDiagnostic(
          'unresolved-citation',
          'warning',
          'latex',
          `${source.packagePath}/${rootDocument}`,
          `Citation key ${key} has no matching bibliography entry`,
          'Add the bibliography entry or fix the citation key',
          key
        )
      );
    }
  }

  return { rootDocument, diagnostics };
}
