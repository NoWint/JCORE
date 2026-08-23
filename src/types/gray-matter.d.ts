declare module 'gray-matter' {
  interface GrayMatterResult<T = Record<string, unknown>> {
    data: T;
    content: string;
    excerpt?: string;
  }

  function matter<T = Record<string, unknown>>(input: string): GrayMatterResult<T>;

  export default matter;
}
