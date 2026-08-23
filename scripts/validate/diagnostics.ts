export type DiagnosticSeverity = 'error' | 'warning';

export interface Diagnostic {
  code: string;
  severity: DiagnosticSeverity;
  phase: string;
  sourcePath: string;
  node?: string;
  message: string;
  action: string;
}

export function makeDiagnostic(
  code: string,
  severity: DiagnosticSeverity,
  phase: string,
  sourcePath: string,
  message: string,
  action: string,
  node?: string
): Diagnostic {
  return {
    code,
    severity,
    phase,
    sourcePath,
    message,
    action,
    ...(node ? { node } : {})
  };
}

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const location = diagnostic.node ? `${diagnostic.sourcePath}#${diagnostic.node}` : diagnostic.sourcePath;
  return `${diagnostic.severity.toUpperCase()} ${diagnostic.code} [${diagnostic.phase}] ${location}: ${diagnostic.message} (${diagnostic.action})`;
}
